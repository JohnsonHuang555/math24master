// @vitest-environment node
import { type Server as HttpServer, createServer } from 'http';
import { AddressInfo } from 'net';
import { Server } from 'socket.io';
import { type Socket, io as connect } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ErrorCode } from '@/models/ErrorCode';
import { GameMode } from '@/models/GameMode';
import { GameStatus } from '@/models/GameStatus';
import { NumberCard } from '@/models/Player';
import { Room } from '@/models/Room';
import { SelectedCard } from '@/models/SelectedCard';
import { SocketEvent } from '@/models/SocketEvent';
import { Symbol } from '@/models/Symbol';
import { solve24Cards } from './buzzer-bot';
import * as game from './game';
import { attachGameServer } from './socket-server';

/**
 * 以真的 Socket.IO server 與多個互相獨立的 client 驗證多人模式。
 * 等待時間都縮短（開局倒數 0 秒、搶答倒數 0 秒等），讓測試跑得快
 */

let httpServer: HttpServer;
let io: Server;
let gameServer: ReturnType<typeof attachGameServer>;
let url: string;
const clients: Socket[] = [];

beforeEach(async () => {
  game.resetGameStateForTests();
  httpServer = createServer();
  io = new Server(httpServer);
  gameServer = attachGameServer(io, {
    startCountdownSeconds: 0,
    buzzerStartDelayMs: 10,
    buzzerCountdownSeconds: 0,
    buzzerNextRoundDelayMs: 1500,
    buzzerResumeDelayMs: 50,
    disconnectGraceIdleMs: 300,
    disconnectGracePlayingMs: 5000,
  });
  await new Promise<void>(resolve => httpServer.listen(0, resolve));
  url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;
});

afterEach(async () => {
  for (const c of clients.splice(0)) c.disconnect();
  gameServer.close();
  await new Promise<void>(resolve => io.close(() => resolve()));
});

type Player = {
  socket: Socket;
  id: string;
  token: string;
  /** 這位玩家最新收到的房間狀態 */
  room: () => Room | undefined;
  errors: string[];
};

async function newClient(): Promise<Socket> {
  const socket = connect(url, {
    transports: ['websocket'],
    forceNew: true,
    reconnectionDelay: 50,
    reconnectionDelayMax: 100,
  });
  clients.push(socket);
  await new Promise<void>(resolve => socket.once('connect', () => resolve()));
  return socket;
}

/** 等某個事件（可加條件）；逾時就失敗 */
function next<T = unknown>(
  socket: Socket,
  event: string,
  predicate: (payload: T) => boolean = () => true,
  timeout = 3000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`timeout waiting for ${event}`));
    }, timeout);
    const handler = (payload: T) => {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };
    socket.on(event, handler);
  });
}

/** 確認一段時間內沒有收到某事件 */
async function nothing(socket: Socket, event: string, ms = 300) {
  let received = false;
  const handler = () => (received = true);
  socket.on(event, handler);
  await new Promise(r => setTimeout(r, ms));
  socket.off(event, handler);
  return !received;
}

async function join(
  name: string,
  roomId: string,
  create?: Partial<{
    roomName: string;
    maxPlayers: number;
    gameType: 'classic' | 'buzzer';
    remainSeconds: number | null;
  }>,
): Promise<Player> {
  const socket = await newClient();
  let latest: Room | undefined;
  const errors: string[] = [];
  socket.on(SocketEvent.JoinRoomSuccess, (room: Room) => (latest = room));
  socket.on(
    SocketEvent.RoomUpdate,
    ({ room }: { room: Room }) => (latest = room),
  );
  socket.on(SocketEvent.PlayerReconnectSuccess, ({ room }: { room: Room }) => {
    latest = room;
  });
  socket.on(SocketEvent.ErrorMessage, (e: string) => errors.push(e));
  const idPromise = next<string>(socket, SocketEvent.GetPlayerId);
  const tokenPromise = next<string>(socket, SocketEvent.GetReconnectToken);
  socket.emit(SocketEvent.JoinRoom, {
    roomId,
    playerName: name,
    mode: GameMode.Multiple,
    maxPlayers: create?.maxPlayers ?? 2,
    roomName: create?.roomName,
    gameType: create?.gameType,
    remainSeconds: create?.remainSeconds,
  });
  const [id, token] = await Promise.all([idPromise, tokenPromise]);
  return { socket, id, token, room: () => latest, errors };
}

/** 房主開房、客人加入並準備；回傳兩位玩家 */
async function twoPlayers(
  settings: Parameters<typeof join>[2] = {},
): Promise<[Player, Player]> {
  const host = await join('Host', 'room-1', { roomName: 'R', ...settings });
  const guest = await join('Guest', 'room-1');
  await waitFor(() => host.room()?.players.length === 2);
  return [host, guest];
}

async function waitFor(condition: () => boolean, timeout = 3000) {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) throw new Error('waitFor timeout');
    await new Promise(r => setTimeout(r, 10));
  }
}

async function startClassic(
  host: Player,
  guest: Player,
): Promise<{ current: Player; other: Player }> {
  guest.socket.emit(SocketEvent.ReadyGame, { roomId: 'room-1' });
  await waitFor(() => !!host.room()?.players.every(p => p.isReady));
  host.socket.emit(SocketEvent.StartGame, { roomId: 'room-1' });
  await waitFor(() => host.room()?.status === GameStatus.Playing);
  await waitFor(() => guest.room()?.status === GameStatus.Playing);
  const room = host.room()!;
  const currentId = room.players.find(
    p => p.playerOrder === room.currentOrder,
  )!.id;
  return currentId === host.id
    ? { current: host, other: guest }
    : { current: guest, other: host };
}

/** 測試用：把目前玩家的手牌設成 6 6 6 6（6+6+6+6=24，+ 三次得 3 分） */
function giveSixes(playerId: string): NumberCard[] {
  const room = game.getCurrentRoom('room-1')!;
  const hand = [0, 1, 2, 3].map(i => ({ id: `six${i}`, value: 6 }));
  room.players.find(p => p.id === playerId)!.handCard = hand;
  return hand;
}

function enterSixes(player: Player, hand: NumberCard[]) {
  hand.forEach((card, i) => {
    if (i > 0)
      player.socket.emit(SocketEvent.SelectCard, {
        roomId: 'room-1',
        symbol: Symbol.Plus,
      });
    player.socket.emit(SocketEvent.SelectCard, {
      roomId: 'room-1',
      number: card,
    });
  });
}

const serverScore = (playerId: string) =>
  game.getCurrentRoom('room-1')!.players.find(p => p.id === playerId)!.score;

describe('房主權限（兩個獨立 client）', () => {
  it('非房主送出房主功能全部被拒絕，房間不變', async () => {
    const [host, guest] = await twoPlayers({ maxPlayers: 3 });
    const outsider = await newClient();

    const attempts: [string, object][] = [
      [SocketEvent.EditRoomName, { roomName: 'hacked', password: 'x' }],
      [SocketEvent.EditRoomSettings, { maxPlayers: 4, remainSeconds: 5 }],
      [SocketEvent.RemovePlayer, { playerId: host.id }],
      [SocketEvent.AddBotToRoom, { difficulty: 'hard' }],
      [SocketEvent.StartGame, {}],
    ];
    for (const [event, payload] of attempts) {
      const error = next<string>(guest.socket, SocketEvent.ErrorMessage);
      guest.socket.emit(event, { roomId: 'room-1', ...payload });
      expect(await error).toBe(ErrorCode.NotRoomMaster);
      // 不在房間的人也一樣
      const outsiderError = next<string>(outsider, SocketEvent.ErrorMessage);
      outsider.emit(event, { roomId: 'room-1', ...payload });
      expect(await outsiderError).toBe(ErrorCode.PlayerNotFound);
    }

    const room = game.getCurrentRoom('room-1')!;
    expect(room).toMatchObject({
      roomName: 'R',
      maxPlayers: 3,
      status: GameStatus.Idle,
    });
    expect(room.players.map(p => p.id)).toEqual([host.id, guest.id]);
    expect(room.settings.remainSeconds).toBe(60);
  });

  it('房主踢人：被踢的人收到通知、之後收不到房間廣播、token 也不能用', async () => {
    const [host, guest] = await twoPlayers({ maxPlayers: 3 });
    const removed = next<string>(
      guest.socket,
      SocketEvent.RemovePlayerResponse,
    );
    host.socket.emit(SocketEvent.RemovePlayer, {
      roomId: 'room-1',
      playerId: guest.id,
    });
    expect(await removed).toBe(guest.id);
    await waitFor(() => host.room()?.players.length === 1);

    host.socket.emit(SocketEvent.EditRoomName, {
      roomId: 'room-1',
      roomName: 'after kick',
      password: '',
    });
    expect(await nothing(guest.socket, SocketEvent.RoomUpdate)).toBe(true);

    const failed = next(guest.socket, SocketEvent.PlayerReconnectFailed);
    guest.socket.emit(SocketEvent.PlayerReconnect, {
      reconnectToken: guest.token,
    });
    await failed;
  });

  it('空白暱稱不能建立或加入房間', async () => {
    const socket = await newClient();
    const error = next<string>(socket, SocketEvent.ErrorMessage);
    socket.emit(SocketEvent.JoinRoom, {
      roomId: 'room-blank',
      playerName: '   ',
      mode: GameMode.Multiple,
      maxPlayers: 2,
    });
    expect(await error).toBe(ErrorCode.PlayerNameRequired);
    expect(await nothing(socket, SocketEvent.JoinRoomSuccess)).toBe(true);
  });

  it('房間列表與房間廣播都不含其他玩家的 reconnectToken', async () => {
    const [host, guest] = await twoPlayers();
    const viewer = await newClient();
    const rooms = next<Room[]>(viewer, SocketEvent.GetRoomsResponse);
    viewer.emit(SocketEvent.SearchRooms);
    const listJson = JSON.stringify(await rooms);
    const roomJson = JSON.stringify(host.room());
    for (const token of [host.token, guest.token]) {
      expect(listJson).not.toContain(token);
      expect(roomJson).not.toContain(token);
    }
  });
});

describe('傳統對戰：牌面操作與計分', () => {
  it('非當前玩家不能操作牌面', async () => {
    const [host, guest] = await twoPlayers();
    const { current, other } = await startClassic(host, guest);
    const hand = giveSixes(current.id);
    const otherHand = game
      .getCurrentRoom('room-1')!
      .players.find(p => p.id === other.id)!.handCard;
    const orderBefore = game.getCurrentRoom('room-1')!.currentOrder;

    other.socket.emit(SocketEvent.SelectCard, {
      roomId: 'room-1',
      number: otherHand[0],
    });
    other.socket.emit(SocketEvent.SelectCard, {
      roomId: 'room-1',
      number: hand[0],
    });
    for (const event of [
      SocketEvent.PlayCard,
      SocketEvent.UpdateScore,
      SocketEvent.DrawCard,
      SocketEvent.SkipHand,
      SocketEvent.ReselectCard,
      SocketEvent.BackCard,
    ]) {
      other.socket.emit(event, { roomId: 'room-1' });
    }
    expect(await nothing(current.socket, SocketEvent.RoomUpdate)).toBe(true);
    const room = game.getCurrentRoom('room-1')!;
    expect(room.selectedCards).toEqual([]);
    expect(room.currentOrder).toBe(orderBefore);
    expect(serverScore(other.id)).toBe(0);
  });

  it('只有正確作答才能得分；偽造數字牌被拒絕', async () => {
    const [host, guest] = await twoPlayers();
    const { current } = await startClassic(host, guest);
    const hand = giveSixes(current.id);

    // 沒有出牌直接要分數：沒有任何效果
    current.socket.emit(SocketEvent.UpdateScore, { roomId: 'room-1' });
    // 偽造不在手牌裡的 24
    const forged = next<string>(current.socket, SocketEvent.ErrorMessage);
    current.socket.emit(SocketEvent.SelectCard, {
      roomId: 'room-1',
      number: { id: 'forged', value: 24 },
    });
    expect(await forged).toBe(ErrorCode.CardNotInHand);

    // 6 + 6 + 6 - 6 = 12：答錯
    hand.forEach((card, i) => {
      if (i > 0)
        current.socket.emit(SocketEvent.SelectCard, {
          roomId: 'room-1',
          symbol: i === 3 ? Symbol.Minus : Symbol.Plus,
        });
      current.socket.emit(SocketEvent.SelectCard, {
        roomId: 'room-1',
        number: card,
      });
    });
    const wrong = next<{ extra?: { data: boolean } }>(
      current.socket,
      SocketEvent.RoomUpdate,
      p => p.extra !== undefined,
    );
    current.socket.emit(SocketEvent.PlayCard, { roomId: 'room-1' });
    expect((await wrong).extra?.data).toBe(false);
    current.socket.emit(SocketEvent.UpdateScore, { roomId: 'room-1' });
    await new Promise(r => setTimeout(r, 150));
    expect(serverScore(current.id)).toBe(0);

    // 重選後 6 + 6 + 6 + 6 = 24：答對才得分
    current.socket.emit(SocketEvent.ReselectCard, { roomId: 'room-1' });
    enterSixes(current, hand);
    const right = next<{ extra?: { data: boolean } }>(
      current.socket,
      SocketEvent.RoomUpdate,
      p => p.extra?.data === true,
    );
    current.socket.emit(SocketEvent.PlayCard, { roomId: 'room-1' });
    await right;
    const scored = next(
      current.socket,
      SocketEvent.RoomUpdate,
      (p: { extra?: { event: string } }) =>
        p.extra?.event === SocketEvent.UpdateScore,
    );
    current.socket.emit(SocketEvent.UpdateScore, { roomId: 'room-1' });
    await scored;
    expect(serverScore(current.id)).toBe(3);
  });

  it('重複送出事件不會重複計分', async () => {
    const [host, guest] = await twoPlayers();
    const { current, other } = await startClassic(host, guest);
    const hand = giveSixes(current.id);
    enterSixes(current, hand);
    current.socket.emit(SocketEvent.PlayCard, { roomId: 'room-1' });
    current.socket.emit(SocketEvent.PlayCard, { roomId: 'room-1' });
    for (let i = 0; i < 5; i++) {
      current.socket.emit(SocketEvent.UpdateScore, { roomId: 'room-1' });
    }
    // 另一位玩家趁機也送 UpdateScore
    other.socket.emit(SocketEvent.UpdateScore, { roomId: 'room-1' });
    await waitFor(
      () =>
        game.getCurrentRoom('room-1')!.currentOrder !== undefined &&
        game.getCurrentRoom('room-1')!.players.find(p => p.id === other.id)!
          .playerOrder === game.getCurrentRoom('room-1')!.currentOrder,
    );
    await new Promise(r => setTimeout(r, 200));
    expect(serverScore(current.id)).toBe(3);
    expect(serverScore(other.id)).toBe(0);
  });
});

describe('斷線、重連與離開', () => {
  it('網路中斷後可以用 token 恢復遊戲，玩家 id 不變、仍可繼續操作', async () => {
    const [host, guest] = await twoPlayers();
    const { current } = await startClassic(host, guest);
    const hand = giveSixes(current.id);
    const watcher = current === host ? guest : host;

    // 模擬網路中斷：底層連線關閉，socket.io-client 會自動重連（新的 socket.id）
    const markedDisconnected = waitFor(
      () =>
        !!watcher.room()?.players.find(p => p.id === current.id)
          ?.isDisconnected,
    );
    const reconnected = new Promise<void>(resolve =>
      current.socket.io.once('reconnect', () => resolve()),
    );
    current.socket.io.engine.close();
    await markedDisconnected;
    await reconnected;

    const success = next<{ room: Room; playerId: string }>(
      current.socket,
      SocketEvent.PlayerReconnectSuccess,
    );
    current.socket.emit(SocketEvent.PlayerReconnect, {
      reconnectToken: current.token,
    });
    const { playerId, room } = await success;
    expect(playerId).toBe(current.id);
    expect(room.players.find(p => p.id === current.id)?.isDisconnected).toBe(
      false,
    );

    // 重連後仍是同一位玩家：可以出牌得分
    enterSixes(current, hand);
    current.socket.emit(SocketEvent.PlayCard, { roomId: 'room-1' });
    await waitFor(() => !!game.getCurrentRoom('room-1')!.pendingPlay);
    current.socket.emit(SocketEvent.UpdateScore, { roomId: 'room-1' });
    await waitFor(() => serverScore(current.id) === 3);
  });

  it('回合超時即使目前玩家斷線，伺服器仍會推進到下一位', async () => {
    const [host, guest] = await twoPlayers({ remainSeconds: 1 });
    const { current, other } = await startClassic(host, guest);
    const orderBefore = game.getCurrentRoom('room-1')!.currentOrder;

    // 目前玩家斷線且不回來
    current.socket.io.reconnection(false);
    current.socket.io.engine.close();

    const advanced = next<{ room: Room }>(
      other.socket,
      SocketEvent.RoomUpdate,
      p => p.room.currentOrder !== orderBefore,
      4000,
    );
    const { room } = await advanced;
    expect(room.players.find(p => p.id === other.id)!.playerOrder).toBe(
      room.currentOrder,
    );
    // 斷線的人被替抽一張
    expect(room.players.find(p => p.id === current.id)!.handCard).toHaveLength(
      5,
    );
  });

  it('答對後斷線沒送 UpdateScore：時間到伺服器入帳換人，分數只算一次', async () => {
    const [host, guest] = await twoPlayers({ remainSeconds: 1 });
    const { current, other } = await startClassic(host, guest);
    const hand = giveSixes(current.id);
    enterSixes(current, hand);
    current.socket.emit(SocketEvent.PlayCard, { roomId: 'room-1' });
    await waitFor(() => !!game.getCurrentRoom('room-1')!.pendingPlay);
    current.socket.io.reconnection(false);
    current.socket.io.engine.close();

    await next(
      other.socket,
      SocketEvent.RoomUpdate,
      (p: { extra?: { event: string } }) =>
        p.extra?.event === SocketEvent.UpdateScore,
      4000,
    );
    expect(serverScore(current.id)).toBe(3);
  });

  it('主動離開（LeaveRoom）與 socket.disconnect() 都立即移除，不留幽靈玩家', async () => {
    const [host, guest] = await twoPlayers({ maxPlayers: 3 });
    const third = await join('Third', 'room-1');
    await waitFor(() => host.room()?.players.length === 3);

    guest.socket.emit(SocketEvent.LeaveRoom);
    await waitFor(() => host.room()?.players.length === 2);
    third.socket.disconnect();
    await waitFor(() => host.room()?.players.length === 1);
    expect(game.getCurrentRoom('room-1')!.players.map(p => p.id)).toEqual([
      host.id,
    ]);

    // 離開的人 token 失效
    const other = await newClient();
    const failed = next(other, SocketEvent.PlayerReconnectFailed);
    other.emit(SocketEvent.PlayerReconnect, { reconnectToken: guest.token });
    await failed;
  });

  it('等待中斷線且沒回來：寬限期到就移除；最後一位真人離開房間就刪除', async () => {
    const [host, guest] = await twoPlayers();
    guest.socket.io.reconnection(false);
    guest.socket.io.engine.close();
    await waitFor(
      () => !!host.room()?.players.find(p => p.id === guest.id)?.isDisconnected,
    );
    await waitFor(() => host.room()?.players.length === 1, 2000);

    host.socket.emit(SocketEvent.LeaveRoom);
    await waitFor(() => !game.getCurrentRoom('room-1'));
  });

  it('房主離開：由下一位真人接手房主', async () => {
    const [host, guest] = await twoPlayers();
    host.socket.emit(SocketEvent.LeaveRoom);
    await waitFor(
      () =>
        guest.room()?.players.length === 1 &&
        !!guest.room()?.players[0].isMaster,
    );
    // 新房主可以改設定
    guest.socket.emit(SocketEvent.EditRoomName, {
      roomId: 'room-1',
      roomName: 'mine',
      password: '',
    });
    await waitFor(() => guest.room()?.roomName === 'mine');
  });
});

describe('搶答模式', () => {
  async function startBuzzer() {
    const [a, b] = await twoPlayers({ gameType: 'buzzer' });
    b.socket.emit(SocketEvent.ReadyGame, { roomId: 'room-1' });
    await waitFor(() => !!a.room()?.players.every(p => p.isReady));
    const opened = Promise.all([
      next(a.socket, SocketEvent.BuzzerOpen),
      next(b.socket, SocketEvent.BuzzerOpen),
    ]);
    const roundStart = next<{ publicCards: NumberCard[] }>(
      a.socket,
      SocketEvent.BuzzerRoundStart,
    );
    a.socket.emit(SocketEvent.StartGame, { roomId: 'room-1' });
    const { publicCards } = await roundStart;
    await opened;
    return { a, b, publicCards };
  }

  it('同時搶答、同時送答案：只有一位得分一次，伺服器不會崩潰', async () => {
    const { a, b, publicCards } = await startBuzzer();
    const solution = solve24Cards(publicCards)!.expr as SelectedCard[];

    const successes: string[] = [];
    const failures: string[] = [];
    for (const p of [a, b]) {
      p.socket.on(SocketEvent.BuzzerBuzzInSuccess, ({ playerId }) =>
        successes.push(playerId),
      );
      p.socket.on(SocketEvent.BuzzerBuzzInFailed, ({ reason }) =>
        failures.push(reason),
      );
    }
    a.socket.emit(SocketEvent.BuzzerBuzzIn, { roomId: 'room-1' });
    b.socket.emit(SocketEvent.BuzzerBuzzIn, { roomId: 'room-1' });
    await waitFor(() => successes.length >= 2 && failures.length >= 1);
    await new Promise(r => setTimeout(r, 100));
    // 兩個 client 都收到同一位搶到的廣播，另一位收到失敗
    expect(new Set(successes).size).toBe(1);
    expect(failures).toEqual(['already_answering']);

    const winnerId = successes[0];
    const winner = winnerId === a.id ? a : b;
    const loser = winner === a ? b : a;

    const results: { isCorrect: boolean; playerId: string }[] = [];
    a.socket.on(SocketEvent.BuzzerAnswerResult, r => results.push(r));
    const loserError = next<string>(loser.socket, SocketEvent.ErrorMessage);

    // 作答者連送三次、另一位也送答案
    for (let i = 0; i < 3; i++) {
      winner.socket.emit(SocketEvent.BuzzerSubmitAnswer, {
        roomId: 'room-1',
        selectedCards: solution,
      });
    }
    loser.socket.emit(SocketEvent.BuzzerSubmitAnswer, {
      roomId: 'room-1',
      selectedCards: solution,
    });
    expect(await loserError).toBe(ErrorCode.NotAnsweringPlayer);
    await new Promise(r => setTimeout(r, 200));

    expect(results).toEqual([
      expect.objectContaining({ isCorrect: true, playerId: winnerId }),
    ]);
    const scores = game.getCurrentRoom('room-1')!.players;
    expect(scores.find(p => p.id === loser.id)!.score).toBe(0);
    const winnerScore = scores.find(p => p.id === winnerId)!.score;
    expect(winnerScore).toBeGreaterThan(0);

    // 這一題已經有人答對：換題前不能再搶
    const blocked = next<{ reason: string }>(
      loser.socket,
      SocketEvent.BuzzerBuzzInFailed,
    );
    loser.socket.emit(SocketEvent.BuzzerBuzzIn, { roomId: 'room-1' });
    expect((await blocked).reason).toBe('not_open');

    // 伺服器仍正常運作：下一題照常開始
    await next(a.socket, SocketEvent.BuzzerRoundStart, () => true, 4000);
  });

  it('前端填的牌值不被採用：用公共牌 id 偽造 24+0+0+0 會被判錯扣分', async () => {
    const { a, b, publicCards } = await startBuzzer();
    // 讓 6-6-6-6 這種題目必定 ≠ 24：把公共牌換成 6 6 6 6
    const room = game.getCurrentRoom('room-1')!;
    room.buzzerState!.publicCards = publicCards.map(c => ({ ...c, value: 6 }));

    const success = next<{ playerId: string }>(
      a.socket,
      SocketEvent.BuzzerBuzzInSuccess,
    );
    a.socket.emit(SocketEvent.BuzzerBuzzIn, { roomId: 'room-1' });
    await success;
    const result = next<{ isCorrect: boolean }>(
      b.socket,
      SocketEvent.BuzzerAnswerResult,
    );
    a.socket.emit(SocketEvent.BuzzerSubmitAnswer, {
      roomId: 'room-1',
      selectedCards: publicCards.flatMap((c, i) => [
        ...(i > 0 ? [{ symbol: Symbol.Minus }] : []),
        { number: { id: c.id, value: i === 0 ? 24 : 0 } },
      ]),
    });
    expect((await result).isCorrect).toBe(false);
    expect(serverScore(a.id)).toBeLessThanOrEqual(0);
  });

  it('作答中斷線重連後仍是同一位玩家，可以繼續搶答', async () => {
    const { a, b } = await startBuzzer();
    const reconnected = new Promise<void>(resolve =>
      a.socket.io.once('reconnect', () => resolve()),
    );
    a.socket.io.engine.close();
    await reconnected;
    const success = next<{ playerId: string }>(
      a.socket,
      SocketEvent.PlayerReconnectSuccess,
    );
    a.socket.emit(SocketEvent.PlayerReconnect, { reconnectToken: a.token });
    expect((await success).playerId).toBe(a.id);

    const buzz = next<{ playerId: string }>(
      b.socket,
      SocketEvent.BuzzerBuzzInSuccess,
    );
    a.socket.emit(SocketEvent.BuzzerBuzzIn, { roomId: 'room-1' });
    expect((await buzz).playerId).toBe(a.id);
  });

  it('重新整理（全新的 socket）後會補送目前這一題：牌面、開放搶答、作答中玩家', async () => {
    const { a, b, publicCards } = await startBuzzer();
    // b 先搶答，a 接著重新整理
    const buzz = next(a.socket, SocketEvent.BuzzerBuzzInSuccess);
    b.socket.emit(SocketEvent.BuzzerBuzzIn, { roomId: 'room-1' });
    await buzz;
    // 重新整理時瀏覽器直接關掉連線（伺服器看到 transport close，不是主動離開）
    a.socket.io.reconnection(false);
    a.socket.io.engine.close();

    const fresh = await newClient();
    const roundStart = next<{ publicCards: NumberCard[]; roundNumber: number }>(
      fresh,
      SocketEvent.BuzzerRoundStart,
    );
    const opened = next(fresh, SocketEvent.BuzzerOpen);
    const answering = next<{ playerId: string; answerSeconds: number }>(
      fresh,
      SocketEvent.BuzzerBuzzInSuccess,
    );
    const success = next<{ playerId: string }>(
      fresh,
      SocketEvent.PlayerReconnectSuccess,
    );
    fresh.emit(SocketEvent.PlayerReconnect, { reconnectToken: a.token });
    expect((await success).playerId).toBe(a.id);
    // 搶答畫面掛上後才要狀態；非房內的 socket 要不到
    const outsider = await newClient();
    outsider.emit(SocketEvent.BuzzerSync, { roomId: 'room-1' });
    expect(await nothing(outsider, SocketEvent.BuzzerRoundStart)).toBe(true);
    fresh.emit(SocketEvent.BuzzerSync, { roomId: 'room-1' });
    const round = await roundStart;
    expect(round.roundNumber).toBe(1);
    expect(round.publicCards.map(c => c.id)).toEqual(
      publicCards.map(c => c.id),
    );
    await opened;
    const current = await answering;
    expect(current.playerId).toBe(b.id);
    expect(current.answerSeconds).toBeGreaterThan(0);
  });
});

describe('玩家身分映射（socket 與玩家的綁定）', () => {
  it('已代表一位玩家的 socket 不能用別人的 token 直接切換成另一位玩家', async () => {
    const [host, guest] = await twoPlayers();
    const other = await join('Other', 'room-2', { roomName: 'R2' });

    const failed = next<{ error: string }>(
      host.socket,
      SocketEvent.PlayerReconnectFailed,
    );
    host.socket.emit(SocketEvent.PlayerReconnect, {
      reconnectToken: other.token,
    });
    expect((await failed).error).toBe(ErrorCode.PlayerAlreadyBound);

    // 兩邊都維持原狀：host 仍在 room-1 而且有連線，other 仍由自己的 socket 代表
    const room1 = game.getCurrentRoom('room-1')!;
    expect(room1.players.map(p => p.id).sort()).toEqual(
      [host.id, guest.id].sort(),
    );
    expect(
      room1.players.find(p => p.id === host.id)?.isDisconnected,
    ).toBeFalsy();
    expect(game.getCurrentRoom('room-2')!.players.map(p => p.id)).toEqual([
      other.id,
    ]);
    // host 收不到 room-2 的廣播；other 的 socket 仍代表 other
    const leakedToHost = nothing(host.socket, SocketEvent.GetMessage);
    const toOther = next(other.socket, SocketEvent.GetMessage);
    other.socket.emit(SocketEvent.SendMessage, {
      roomId: 'room-2',
      message: 'hi',
    });
    await toOther;
    expect(await leakedToHost).toBe(true);
    // host 的 socket 仍是 host：可以照常離開，room-1 只剩 guest
    host.socket.emit(SocketEvent.LeaveRoom);
    await waitFor(() => game.getCurrentRoom('room-1')?.players.length === 1);
    expect(game.getCurrentRoom('room-1')!.players[0].id).toBe(guest.id);
    expect(game.getCurrentRoom('room-2')!.players.length).toBe(1);
  });

  it('同一位玩家從新的 socket 重連：沿用玩家 id，舊 socket 不再收到房間廣播', async () => {
    const [host, guest] = await twoPlayers();
    const fresh = await newClient();
    const success = next<{ playerId: string }>(
      fresh,
      SocketEvent.PlayerReconnectSuccess,
    );
    fresh.emit(SocketEvent.PlayerReconnect, { reconnectToken: guest.token });
    expect((await success).playerId).toBe(guest.id);

    const toFresh = next(fresh, SocketEvent.RoomUpdate);
    const leakedToOld = nothing(guest.socket, SocketEvent.RoomUpdate);
    host.socket.emit(SocketEvent.EditRoomName, {
      roomId: 'room-1',
      roomName: 'Renamed',
    });
    await toFresh;
    expect(await leakedToOld).toBe(true);
    expect(game.getCurrentRoom('room-1')!.players).toHaveLength(2);
  });

  it('兩個分頁用同一個 token：後來的分頁接手，舊分頁收到通知且不能再代表玩家', async () => {
    const [host, guest] = await twoPlayers();
    const replaced = next(guest.socket, SocketEvent.SessionReplaced);
    const tab2 = await newClient();
    const success = next<{ playerId: string }>(
      tab2,
      SocketEvent.PlayerReconnectSuccess,
    );
    tab2.emit(SocketEvent.PlayerReconnect, { reconnectToken: guest.token });
    expect((await success).playerId).toBe(guest.id);
    await replaced;

    // 舊分頁送出的操作都不算數：不能取消準備、也不能把玩家拉出房間
    const readyBefore = game
      .getCurrentRoom('room-1')!
      .players.find(p => p.id === guest.id)!.isReady;
    guest.socket.emit(SocketEvent.ReadyGame, { roomId: 'room-1' });
    guest.socket.emit(SocketEvent.LeaveRoom);
    await new Promise(r => setTimeout(r, 200));
    const room = game.getCurrentRoom('room-1')!;
    expect(room.players.map(p => p.id).sort()).toEqual(
      [host.id, guest.id].sort(),
    );
    expect(room.players.find(p => p.id === guest.id)!.isReady).toBe(
      readyBefore,
    );

    // 第三個分頁再拿同一個 token：仍是同一位玩家，房間不會多出人
    const tab3 = await newClient();
    const again = next<{ playerId: string }>(
      tab3,
      SocketEvent.PlayerReconnectSuccess,
    );
    tab3.emit(SocketEvent.PlayerReconnect, { reconnectToken: guest.token });
    expect((await again).playerId).toBe(guest.id);
    expect(game.getCurrentRoom('room-1')!.players).toHaveLength(2);
  });

  it('舊 socket 斷線（網路中斷或主動斷線）不會移除已在新 socket 恢復的玩家', async () => {
    const [host, guest] = await twoPlayers();
    const tab2 = await newClient();
    const success = next(tab2, SocketEvent.PlayerReconnectSuccess);
    tab2.emit(SocketEvent.PlayerReconnect, { reconnectToken: guest.token });
    await success;

    // 舊 socket 先網路中斷，再由另一個舊 socket 主動斷線
    guest.socket.io.reconnection(false);
    guest.socket.io.engine.close();
    const tab3Old = await newClient();
    tab3Old.disconnect();
    // 等超過等待中的寬限期（300ms）
    await new Promise(r => setTimeout(r, 500));

    const room = game.getCurrentRoom('room-1')!;
    expect(room.players.map(p => p.id).sort()).toEqual(
      [host.id, guest.id].sort(),
    );
    expect(
      room.players.find(p => p.id === guest.id)!.isDisconnected,
    ).toBeFalsy();

    // 新 socket 仍能代表玩家
    const guestNow = () =>
      game.getCurrentRoom('room-1')!.players.find(p => p.id === guest.id)!;
    const before = guestNow().isReady;
    const ready = waitFor(() => guestNow().isReady !== before);
    tab2.emit(SocketEvent.ReadyGame, { roomId: 'room-1' });
    await ready;
  });

  it('舊 socket 在新 socket 接手後才主動斷線，也不會讓玩家離開', async () => {
    const [host, guest] = await twoPlayers();
    const tab2 = await newClient();
    const success = next(tab2, SocketEvent.PlayerReconnectSuccess);
    tab2.emit(SocketEvent.PlayerReconnect, { reconnectToken: guest.token });
    await success;
    guest.socket.disconnect();
    await new Promise(r => setTimeout(r, 500));
    expect(
      game
        .getCurrentRoom('room-1')!
        .players.map(p => p.id)
        .sort(),
    ).toEqual([host.id, guest.id].sort());
  });

  it('延後送出的 LeaveRoom 帶的是舊房間：已經在新房間的玩家不會被拉出來', async () => {
    const host = await join('Host', 'room-1', { roomName: 'R1' });
    const guest = await join('Guest', 'room-1');
    // guest 換到 room-2（加入時伺服器會先讓他離開 room-1）
    const joined = next(guest.socket, SocketEvent.JoinRoomSuccess);
    guest.socket.emit(SocketEvent.JoinRoom, {
      roomId: 'room-2',
      playerName: 'Guest',
      mode: GameMode.Multiple,
      maxPlayers: 2,
      roomName: 'R2',
    });
    await joined;
    guest.socket.emit(SocketEvent.LeaveRoom, { roomId: 'room-1' });
    await new Promise(r => setTimeout(r, 200));
    expect(game.getCurrentRoom('room-2')!.players.map(p => p.id)).toEqual([
      guest.id,
    ]);
    expect(game.getCurrentRoom('room-1')!.players.map(p => p.id)).toEqual([
      host.id,
    ]);
    // 帶目前的房間：照常離開
    guest.socket.emit(SocketEvent.LeaveRoom, { roomId: 'room-2' });
    await waitFor(() => !game.getCurrentRoom('room-2'));
  });
});
