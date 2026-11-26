// @vitest-environment node
import { type Server as HttpServer, createServer } from 'http';
import { AddressInfo } from 'net';
import { Server } from 'socket.io';
import { type Socket, io as connect } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ErrorCode } from '@/models/ErrorCode';
import { GameMode } from '@/models/GameMode';
import { GameStatus } from '@/models/GameStatus';
import { DEFAULT_BUZZER_SETTINGS, QUICK_MATCH } from '@/models/Room';
import { BuzzerGameOverPayload, RoomView } from '@/models/RoomView';
import { SelectedCard } from '@/models/SelectedCard';
import { SocketEvent } from '@/models/SocketEvent';
import { solve24Cards } from './buzzer-bot';
import * as game from './game';
import { attachGameServer } from './socket-server';

/**
 * 快速配對、取消、再玩一場、斷線的完整流程。每位玩家都是獨立的 socket.io client，
 * 等待時間縮短：配對等 1 秒、等待中斷線寬限 300ms、遊戲中 5 秒、結算後 300ms 重設
 */

let httpServer: HttpServer;
let io: Server;
let gameServer: ReturnType<typeof attachGameServer>;
let url: string;
const sockets: Socket[] = [];

const WAIT_SECONDS = 1;

beforeEach(async () => {
  game.resetGameStateForTests();
  httpServer = createServer();
  io = new Server(httpServer);
  gameServer = attachGameServer(io, {
    startCountdownSeconds: 0,
    buzzerStartDelayMs: 10,
    buzzerCountdownSeconds: 0,
    buzzerNextRoundDelayMs: 200,
    buzzerTimeoutNextRoundDelayMs: 200,
    buzzerResumeDelayMs: 50,
    buzzerGameOverResetMs: 300,
    disconnectGraceIdleMs: 300,
    disconnectGracePlayingMs: 5000,
    quickMatchWaitSeconds: WAIT_SECONDS,
  });
  await new Promise<void>(resolve => httpServer.listen(0, resolve));
  url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;
});

/** 換一組計時設定重開伺服器（個別測試需要不同的等待時間） */
async function restartServer(
  overrides: Parameters<typeof attachGameServer>[1],
) {
  gameServer.close();
  await new Promise<void>(resolve => io.close(() => resolve()));
  game.resetGameStateForTests();
  httpServer = createServer();
  io = new Server(httpServer);
  gameServer = attachGameServer(io, {
    startCountdownSeconds: 0,
    buzzerStartDelayMs: 10,
    buzzerCountdownSeconds: 0,
    buzzerResumeDelayMs: 50,
    quickMatchWaitSeconds: WAIT_SECONDS,
    ...overrides,
  });
  await new Promise<void>(resolve => httpServer.listen(0, resolve));
  url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;
}

afterEach(async () => {
  for (const s of sockets.splice(0)) s.disconnect();
  gameServer.close();
  await new Promise<void>(resolve => io.close(() => resolve()));
});

// ── 工具 ─────────────────────────────────────────────────────────────────────

type Received = { event: string; payload: unknown };
type Client = {
  socket: Socket;
  log: Received[];
  id: string;
  token: string;
  /** 這位玩家最新收到的房間 */
  room: () => RoomView | undefined;
};

async function newSocket() {
  const socket = connect(url, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
  });
  sockets.push(socket);
  const log: Received[] = [];
  socket.onAny((event: string, payload: unknown) =>
    log.push({ event, payload }),
  );
  await new Promise<void>(resolve => socket.once('connect', () => resolve()));
  return { socket, log };
}

function next<T = unknown>(
  socket: Socket,
  event: string,
  predicate: (payload: T) => boolean = () => true,
  timeout = 4000,
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

async function waitFor(condition: () => boolean, timeout = 4000) {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) throw new Error('waitFor timeout');
    await new Promise(r => setTimeout(r, 10));
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** 從 log 取出最新的房間 */
function latestRoom(log: Received[]): RoomView | undefined {
  for (let i = log.length - 1; i >= 0; i--) {
    const { event, payload } = log[i];
    if (event === SocketEvent.JoinRoomSuccess) return payload as RoomView;
    if (
      event === SocketEvent.RoomUpdate ||
      event === SocketEvent.PlayerReconnectSuccess
    )
      return (payload as { room: RoomView }).room;
  }
}

function toClient(
  socket: Socket,
  log: Received[],
  id: string,
  token: string,
): Client {
  return { socket, log, id, token, room: () => latestRoom(log) };
}

/** 按「快速開始」，等到被分到房間 */
async function quick(name: string, existing?: Client): Promise<Client> {
  const { socket, log } = existing ?? (await newSocket());
  const idPromise = next<string>(socket, SocketEvent.GetPlayerId);
  const tokenPromise = next<string>(socket, SocketEvent.GetReconnectToken);
  const joined = next<RoomView>(
    socket,
    SocketEvent.JoinRoomSuccess,
    room => !!room.self,
  );
  socket.emit(SocketEvent.QuickMatch, { playerName: name });
  const [id, token] = await Promise.all([idPromise, tokenPromise, joined]);
  return toClient(socket, log, id, token);
}

/** 已經在配對房裡再按一次快速開始：伺服器沿用同一間房，只回 JoinRoomSuccess */
async function quickAgain(c: Client): Promise<string> {
  const joined = next<RoomView>(
    c.socket,
    SocketEvent.JoinRoomSuccess,
    room => !!room.self,
  );
  c.socket.emit(SocketEvent.QuickMatch, { playerName: 'Again' });
  return (await joined).roomId;
}

/** 開私人搶答房 */
async function privateRoom() {
  const join = async (name: string, create: boolean) => {
    const { socket, log } = await newSocket();
    const idPromise = next<string>(socket, SocketEvent.GetPlayerId);
    const tokenPromise = next<string>(socket, SocketEvent.GetReconnectToken);
    socket.emit(SocketEvent.JoinRoom, {
      roomId: 'private-1',
      playerName: name,
      mode: GameMode.Multiple,
      maxPlayers: 2,
      ...(create ? { roomName: 'Private', gameType: 'buzzer' } : {}),
    });
    const [id, token] = await Promise.all([idPromise, tokenPromise]);
    return toClient(socket, log, id, token);
  };
  const host = await join('Host', true);
  const guest = await join('Guest', false);
  await waitFor(() => serverRoom('private-1')?.players.length === 2);
  return { host, guest };
}

const serverRoom = (roomId: string) => game.getCurrentRoom(roomId);
const roomOf = (c: Client) => game.getCurrentRoomId(c.id);
const humans = (room: { players: { isBot?: boolean }[] }) =>
  room.players.filter(p => !p.isBot).length;
const bots = (room: { players: { isBot?: boolean }[] }) =>
  room.players.filter(p => p.isBot).length;

/** 讓這位玩家答對一題並直接贏下這一局 */
async function winGame(winner: Client, roomId: string) {
  await waitFor(() => !!serverRoom(roomId)?.buzzerState?.roundOpen);
  const room = serverRoom(roomId)!;
  const settings = room.settings.buzzerSettings ?? DEFAULT_BUZZER_SETTINGS;
  room.players.find(p => p.id === winner.id)!.score = settings.winScore - 1;
  const solution = solve24Cards(room.buzzerState!.publicCards)!
    .expr as SelectedCard[];
  const buzz = next<{ playerId: string }>(
    winner.socket,
    SocketEvent.BuzzerBuzzInSuccess,
  );
  winner.socket.emit(SocketEvent.BuzzerBuzzIn, { roomId });
  expect((await buzz).playerId).toBe(winner.id);
  const over = next<BuzzerGameOverPayload>(
    winner.socket,
    SocketEvent.BuzzerGameOver,
  );
  winner.socket.emit(SocketEvent.BuzzerSubmitAnswer, {
    roomId,
    selectedCards: solution,
  });
  return over;
}

/** 收到的所有 payload 都不含內部欄位；手牌只會在 self 裡 */
function assertIsolated(log: Received[]) {
  const forbidden = ['deck', 'password', 'reconnectToken', 'pendingPlay'];
  const walk = (value: unknown, path: string): string[] => {
    if (!value || typeof value !== 'object') return [];
    return Object.entries(value).flatMap(([k, v]) => [
      ...(forbidden.includes(k) || (k === 'handCard' && !path.endsWith('.self'))
        ? [`${path}.${k}`]
        : []),
      ...walk(v, `${path}.${k}`),
    ]);
  };
  const leaks = log.flatMap(r =>
    r.event === SocketEvent.GetReconnectToken ? [] : walk(r.payload, r.event),
  );
  expect(leaks).toEqual([]);
}

const countdowns = (log: Received[]) =>
  log
    .filter(r => r.event === SocketEvent.QuickMatchCountdown)
    .map(r => (r.payload as { secondsLeft: number }).secondsLeft);

// ── 快速配對 ─────────────────────────────────────────────────────────────────

describe('快速配對', () => {
  it('只有一位真人：等待時間到由電腦補位開局，配對期間看得到倒數與真人數', async () => {
    const a = await quick('Alice');
    const roomId = roomOf(a)!;
    expect(a.room()!.quickMatchPending).toBe(true);
    expect(humans(a.room()!)).toBe(1);
    // 一進房就拿到剩餘秒數
    expect(countdowns(a.log)[0]).toBe(WAIT_SECONDS);

    await waitFor(() => serverRoom(roomId)?.status === GameStatus.Playing);
    const room = serverRoom(roomId)!;
    expect(humans(room)).toBe(1);
    expect(bots(room)).toBe(QUICK_MATCH.fillTo - 1);
    expect(room.quickMatchPending).toBe(false);
    await waitFor(() => a.room()?.status === GameStatus.Playing);
    expect(bots(a.room()!)).toBe(QUICK_MATCH.fillTo - 1);
    expect(gameServer.activeTimers(roomId)).not.toContain('quickMatch');
    assertIsolated(a.log);
  });

  it('兩位真人在倒數結束前配到同一間，兩邊看到一致的真人與電腦數', async () => {
    const a = await quick('Alice');
    const b = await quick('Bob');
    const roomId = roomOf(a)!;
    expect(roomOf(b)).toBe(roomId);
    // 後加入的人也立即拿到剩餘秒數
    expect(countdowns(b.log).length).toBeGreaterThan(0);

    await waitFor(
      () =>
        a.room()?.status === GameStatus.Playing &&
        b.room()?.status === GameStatus.Playing,
    );
    for (const c of [a, b]) {
      expect(humans(c.room()!)).toBe(2);
      expect(bots(c.room()!)).toBe(QUICK_MATCH.fillTo - 2);
    }
    assertIsolated(a.log);
    assertIsolated(b.log);
  });

  it('倒數最後一秒加入的真人也算進這一局', async () => {
    // 這個測試用 2 秒的等待時間，等倒數剩 1 秒才加入
    await restartServer({ quickMatchWaitSeconds: 2 });

    const a = await quick('Alice');
    const roomId = roomOf(a)!;
    await next(
      a.socket,
      SocketEvent.QuickMatchCountdown,
      (p: { secondsLeft: number }) => p.secondsLeft === 1,
    );
    const b = await quick('Bob');
    expect(roomOf(b)).toBe(roomId);
    await waitFor(() => serverRoom(roomId)?.status === GameStatus.Playing);
    expect(humans(serverRoom(roomId)!)).toBe(2);
  });

  it('兩位真人同時按「不等了」：只開局一次、只補位一次', async () => {
    const a = await quick('Alice');
    const b = await quick('Bob');
    const roomId = roomOf(a)!;
    a.socket.emit(SocketEvent.QuickMatchStartNow, { roomId });
    b.socket.emit(SocketEvent.QuickMatchStartNow, { roomId });
    await waitFor(() => serverRoom(roomId)?.status === GameStatus.Playing);
    await sleep(300);
    const room = serverRoom(roomId)!;
    expect(room.players).toHaveLength(QUICK_MATCH.fillTo);
    expect(room.buzzerState?.roundNumber).toBe(1);
    const roundStarts = a.log.filter(
      r => r.event === SocketEvent.BuzzerRoundStart,
    );
    expect(roundStarts).toHaveLength(1);
  });

  it('同時多人快速開始：沒有任何房間超過人數上限，滿房立即開局', async () => {
    const clients = await Promise.all(
      Array.from({ length: QUICK_MATCH.maxPlayers + 1 }, (_, i) =>
        quick(`P${i}`),
      ),
    );
    const roomIds = new Set(clients.map(roomOf));
    expect(roomIds.size).toBe(2);
    for (const roomId of roomIds) {
      const room = serverRoom(roomId!)!;
      expect(room.players.length).toBeLessThanOrEqual(QUICK_MATCH.maxPlayers);
    }
    const full = [...roomIds].find(
      id => humans(serverRoom(id!)!) === QUICK_MATCH.maxPlayers,
    )!;
    await waitFor(() => serverRoom(full)?.status === GameStatus.Playing);
  });

  it('配對結束後，新的快速開始與邀請連結都不會插進這一局', async () => {
    const a = await quick('Alice');
    const roomId = roomOf(a)!;
    a.socket.emit(SocketEvent.QuickMatchStartNow, { roomId });
    await waitFor(() => serverRoom(roomId)?.status === GameStatus.Playing);

    const c = await quick('Carol');
    expect(roomOf(c)).not.toBe(roomId);

    const { socket } = await newSocket();
    const error = next<string>(socket, SocketEvent.ErrorMessage);
    socket.emit(SocketEvent.JoinRoom, {
      roomId,
      playerName: 'Dave',
      mode: GameMode.Multiple,
    });
    expect(await error).toBeTruthy();
    expect(humans(serverRoom(roomId)!)).toBe(1);
  });

  it('連點兩次快速開始：仍在同一間配對房，不會重複加入', async () => {
    const a = await quick('Alice');
    const roomId = roomOf(a)!;
    expect(await quickAgain(a)).toBe(roomId);
    expect(serverRoom(roomId)!.players).toHaveLength(1);
    // 名字也沒有被第二次送的值改掉
    expect(serverRoom(roomId)!.players[0].name).toBe('Alice');
  });

  it('快速開始的暱稱是空白：回傳錯誤（大廳的按鈕才能恢復）', async () => {
    const { socket } = await newSocket();
    const error = next<string>(socket, SocketEvent.ErrorMessage);
    socket.emit(SocketEvent.QuickMatch, { playerName: '  ' });
    expect(await error).toBe(ErrorCode.PlayerNameRequired);
  });
});

describe('取消配對', () => {
  it('只有自己時取消：房間與計時器都清掉，之後收不到這間房的倒數', async () => {
    const a = await quick('Alice');
    const roomId = roomOf(a)!;
    a.socket.emit(SocketEvent.LeaveRoom, { roomId });
    await waitFor(() => !serverRoom(roomId));
    expect(gameServer.activeTimers(roomId)).toEqual([]);
    const before = a.log.length;
    await sleep(WAIT_SECONDS * 1000 + 300);
    expect(a.log.slice(before).map(r => r.event)).toEqual([]);
    // 可以馬上再按一次快速開始
    const again = await quick('Alice', a);
    expect(roomOf(again)).not.toBe(roomId);
  });

  it('兩人配對中一人取消：另一人不受影響，接手房主後照常開局', async () => {
    const a = await quick('Alice');
    const b = await quick('Bob');
    const roomId = roomOf(a)!;
    a.socket.emit(SocketEvent.LeaveRoom, { roomId });
    await waitFor(() => serverRoom(roomId)?.players.length === 1);
    expect(serverRoom(roomId)!.players[0]).toMatchObject({
      id: b.id,
      isMaster: true,
    });
    expect(b.log.map(r => r.event)).not.toContain(SocketEvent.GameAborted);
    await waitFor(() => serverRoom(roomId)?.status === GameStatus.Playing);
    expect(humans(serverRoom(roomId)!)).toBe(1);
  });
});

describe('配對中斷線與重新整理', () => {
  it('配對中重新整理：用 token 回到同一間配對房，立即拿到剩餘秒數，之後照常開局', async () => {
    const a = await quick('Alice');
    const roomId = roomOf(a)!;
    a.socket.io.engine.close();
    await waitFor(() => !!serverRoom(roomId)?.players[0].isDisconnected);

    const fresh = await newSocket();
    const success = next<{ room: RoomView; playerId: string }>(
      fresh.socket,
      SocketEvent.PlayerReconnectSuccess,
    );
    const countdown = next(fresh.socket, SocketEvent.QuickMatchCountdown);
    fresh.socket.emit(SocketEvent.PlayerReconnect, { reconnectToken: a.token });
    const { room, playerId } = await success;
    expect(playerId).toBe(a.id);
    expect(room.quickMatchPending).toBe(true);
    await countdown;
    await waitFor(() => serverRoom(roomId)?.status === GameStatus.Playing);
  });

  it('唯一的真人關掉分頁：時間到不會讓電腦對著空房開局，寬限期到就連房間一起清掉', async () => {
    const a = await quick('Alice');
    const roomId = roomOf(a)!;
    a.socket.io.engine.close();
    await sleep(WAIT_SECONDS * 1000 + 100);
    // 停在配對中等他回來（或寬限期到）
    expect(serverRoom(roomId)?.status ?? GameStatus.Idle).toBe(GameStatus.Idle);
    await waitFor(() => !serverRoom(roomId), 3000);
    expect(gameServer.activeTimers(roomId)).toEqual([]);
  });

  it('時間到時唯一的真人斷線、寬限期內回來：立即開局', async () => {
    await restartServer({ disconnectGraceIdleMs: 3000 });

    const a = await quick('Alice');
    const roomId = roomOf(a)!;
    a.socket.io.engine.close();
    await sleep(WAIT_SECONDS * 1000 + 200);
    expect(serverRoom(roomId)!.status).toBe(GameStatus.Idle);

    const fresh = await newSocket();
    fresh.socket.emit(SocketEvent.PlayerReconnect, { reconnectToken: a.token });
    await waitFor(() => serverRoom(roomId)?.status === GameStatus.Playing);
  });

  it('房主配對期間斷線：另一位真人時間到照常開局，房間不會卡住', async () => {
    const a = await quick('Alice');
    const b = await quick('Bob');
    const roomId = roomOf(a)!;
    a.socket.io.engine.close();
    await waitFor(
      () =>
        !!serverRoom(roomId)?.players.find(p => p.id === a.id)?.isDisconnected,
    );
    await waitFor(() => b.room()?.status === GameStatus.Playing);
    expect(b.log.map(r => r.event)).not.toContain(SocketEvent.GameAborted);
  });
});

// ── 再玩一場 ─────────────────────────────────────────────────────────────────

describe('再玩一場', () => {
  it('快速配對：結束後再玩一場會進到全新的配對房，舊房連同計時器清掉，舊局的事件不會再送來', async () => {
    const a = await quick('Alice');
    const oldRoomId = roomOf(a)!;
    a.socket.emit(SocketEvent.QuickMatchStartNow, { roomId: oldRoomId });
    const over = await winGame(a, oldRoomId);
    expect(over.roomId).toBe(oldRoomId);
    expect(over.winner.id).toBe(a.id);

    // 結算顯示中（舊房還沒重設）就按再玩一場；連點兩次
    const rematch = await quick('Alice', a);
    const newRoomId = roomOf(rematch)!;
    expect(await quickAgain(a)).toBe(newRoomId);
    expect(newRoomId).not.toBe(oldRoomId);

    // 舊房只剩電腦 → 刪除，計時器（含結算後的重設）都清掉
    expect(serverRoom(oldRoomId)).toBeUndefined();
    expect(gameServer.activeTimers(oldRoomId)).toEqual([]);

    // 新房是乾淨的：配對中、只有自己、分數 0、沒有搶答狀態
    const fresh = serverRoom(newRoomId)!;
    expect(fresh.quickMatchPending).toBe(true);
    expect(fresh.players.map(p => [p.id, p.score])).toEqual([[a.id, 0]]);
    expect(fresh.buzzerState).toBeUndefined();

    // 舊房的重設時間過了也不會收到舊房的任何資料
    const before = a.log.length;
    await sleep(500);
    const late = a.log.slice(before).filter(r => {
      const p = r.payload as { roomId?: string; room?: RoomView } | null;
      return p?.roomId === oldRoomId || p?.room?.roomId === oldRoomId;
    });
    expect(late).toEqual([]);
    assertIsolated(a.log);
  });

  it('連續兩場：第二場重新從第 1 題、0 分開始，正常結束', async () => {
    const a = await quick('Alice');
    const first = roomOf(a)!;
    a.socket.emit(SocketEvent.QuickMatchStartNow, { roomId: first });
    await winGame(a, first);

    await quick('Alice', a);
    const second = roomOf(a)!;
    a.socket.emit(SocketEvent.QuickMatchStartNow, { roomId: second });
    await waitFor(() => serverRoom(second)?.status === GameStatus.Playing);
    await waitFor(() => !!serverRoom(second)?.buzzerState?.roundOpen);
    const room = serverRoom(second)!;
    expect(room.buzzerState!.roundNumber).toBe(1);
    expect(room.players.every(p => p.score === 0)).toBe(true);

    const over = await winGame(a, second);
    expect(over.roomId).toBe(second);
    expect(over.players.find(p => p.id === a.id)!.score).toBeGreaterThan(0);
  });

  it('私人房間：結算後回到等待中、分數歸零；準備可以重送；房主再開局是新的一局', async () => {
    const { host, guest } = await privateRoom();
    guest.socket.emit(SocketEvent.ReadyGame, { roomId: 'private-1' });
    await waitFor(
      () => !!serverRoom('private-1')?.players.every(p => p.isReady),
    );
    host.socket.emit(SocketEvent.StartGame, { roomId: 'private-1' });
    await winGame(host, 'private-1');

    // 結算後重設：等待中、分數歸零、真人要重新準備
    await waitFor(() => serverRoom('private-1')?.status === GameStatus.Idle);
    const reset = serverRoom('private-1')!;
    expect(reset.players.every(p => p.score === 0)).toBe(true);
    expect(reset.buzzerState).toBeUndefined();
    expect(reset.players.find(p => p.id === guest.id)!.isReady).toBe(false);

    // 再玩一場：前端帶 ready: true，連點兩次結果相同
    guest.socket.emit(SocketEvent.ReadyGame, {
      roomId: 'private-1',
      ready: true,
    });
    guest.socket.emit(SocketEvent.ReadyGame, {
      roomId: 'private-1',
      ready: true,
    });
    await sleep(150);
    expect(
      serverRoom('private-1')!.players.find(p => p.id === guest.id)!.isReady,
    ).toBe(true);

    const beforeStart = guest.log.length;
    host.socket.emit(SocketEvent.StartGame, { roomId: 'private-1' });
    await waitFor(() => !!serverRoom('private-1')?.buzzerState?.roundOpen);
    expect(serverRoom('private-1')!.buzzerState!.roundNumber).toBe(1);
    // 新局開始後不會再收到上一局的結算
    expect(guest.log.slice(beforeStart).map(r => r.event)).not.toContain(
      SocketEvent.BuzzerGameOver,
    );
    assertIsolated(host.log);
    assertIsolated(guest.log);
  });

  it('勝負剛確定（結算顯示中）有人離開：不會對其他人送出遊戲中斷', async () => {
    const { host, guest } = await privateRoom();
    guest.socket.emit(SocketEvent.ReadyGame, { roomId: 'private-1' });
    await waitFor(
      () => !!serverRoom('private-1')?.players.every(p => p.isReady),
    );
    host.socket.emit(SocketEvent.StartGame, { roomId: 'private-1' });
    await winGame(guest, 'private-1');

    // 房主在結算顯示中離開：客人接手房主，不是「遊戲中斷」
    host.socket.emit(SocketEvent.LeaveRoom, { roomId: 'private-1' });
    await waitFor(() => serverRoom('private-1')?.players.length === 1);
    await sleep(400);
    expect(guest.log.map(r => r.event)).not.toContain(SocketEvent.GameAborted);
    const room = serverRoom('private-1')!;
    expect(room.players[0]).toMatchObject({ id: guest.id, isMaster: true });
    expect(room.status).toBe(GameStatus.Idle);
    expect(gameServer.activeTimers('private-1')).toEqual([]);
  });
});

// ── 斷線 ─────────────────────────────────────────────────────────────────────

describe('斷線與離開', () => {
  it('勝負剛確定時斷線：回到等待中後改用等待中的寬限期，很快就讓出位置', async () => {
    const { host, guest } = await privateRoom();
    guest.socket.emit(SocketEvent.ReadyGame, { roomId: 'private-1' });
    await waitFor(
      () => !!serverRoom('private-1')?.players.every(p => p.isReady),
    );
    host.socket.emit(SocketEvent.StartGame, { roomId: 'private-1' });
    await winGame(guest, 'private-1');
    guest.socket.io.engine.close();
    await waitFor(() => gameServer.graceTimers().includes(guest.id));

    // 遊戲中的寬限期是 5 秒；結算重設（300ms）後改成等待中的 300ms
    await waitFor(() => serverRoom('private-1')?.players.length === 1, 2000);
    expect(serverRoom('private-1')!.players[0].id).toBe(host.id);
    expect(gameServer.graceTimers()).toEqual([]);
  });

  it('寬限期內回來保留位置；超過寬限期才回來，token 已經失效', async () => {
    const { host, guest } = await privateRoom();
    guest.socket.io.engine.close();
    await waitFor(
      () =>
        !!serverRoom('private-1')?.players.find(p => p.id === guest.id)
          ?.isDisconnected,
    );
    // 超過等待中的寬限期（300ms）
    await waitFor(() => serverRoom('private-1')?.players.length === 1);
    const late = await newSocket();
    const failed = next(late.socket, SocketEvent.PlayerReconnectFailed);
    late.socket.emit(SocketEvent.PlayerReconnect, {
      reconnectToken: guest.token,
    });
    await failed;
    expect(serverRoom('private-1')!.players.map(p => p.id)).toEqual([host.id]);
  });

  it('斷線重連不影響其他玩家：對方不會收到離開或中斷，分數與題目不變', async () => {
    const a = await quick('Alice');
    const b = await quick('Bob');
    const roomId = roomOf(a)!;
    a.socket.emit(SocketEvent.QuickMatchStartNow, { roomId });
    await waitFor(() => !!serverRoom(roomId)?.buzzerState?.roundOpen);
    const roundBefore = serverRoom(roomId)!.buzzerState!.roundNumber;
    const before = b.log.length;

    a.socket.io.engine.close();
    await waitFor(
      () =>
        !!serverRoom(roomId)?.players.find(p => p.id === a.id)?.isDisconnected,
    );
    const fresh = await newSocket();
    const success = next(fresh.socket, SocketEvent.PlayerReconnectSuccess);
    fresh.socket.emit(SocketEvent.PlayerReconnect, { reconnectToken: a.token });
    await success;

    const events = b.log.slice(before).map(r => r.event);
    expect(events).not.toContain(SocketEvent.GameAborted);
    expect(events).not.toContain(SocketEvent.PlayerLeaveRoom);
    expect(serverRoom(roomId)!.buzzerState!.roundNumber).toBe(roundBefore);
    expect(serverRoom(roomId)!.players.map(p => p.score)).toEqual(
      serverRoom(roomId)!.players.map(() => 0),
    );
    assertIsolated(fresh.log);
  });

  it('電腦搶到作答權時最後一位真人離開：房間刪除、計時器清空，不會再有任何事件', async () => {
    const a = await quick('Alice');
    const roomId = roomOf(a)!;
    a.socket.emit(SocketEvent.QuickMatchStartNow, { roomId });
    const botIds = () =>
      serverRoom(roomId)
        ?.players.filter(p => p.isBot)
        .map(p => p.id) ?? [];
    await next<{ playerId: string }>(
      a.socket,
      SocketEvent.BuzzerBuzzInSuccess,
      p => botIds().includes(p.playerId),
      12000,
    );
    a.socket.emit(SocketEvent.LeaveRoom, { roomId });
    await waitFor(() => !serverRoom(roomId));
    expect(gameServer.activeTimers(roomId)).toEqual([]);
    const before = a.log.length;
    // 電腦的思考時間最長 3.5 秒
    await sleep(4000);
    expect(a.log.slice(before)).toEqual([]);
  }, 20000);

  it('搶到作答權後斷線：作答時間到照常扣分並恢復這一題，房間不會卡住', async () => {
    // 寬限期比作答時間長：斷線的人還在房裡，由作答計時處理
    await restartServer({ disconnectGracePlayingMs: 60_000 });
    const { host, guest } = await privateRoom();
    guest.socket.emit(SocketEvent.ReadyGame, { roomId: 'private-1' });
    await waitFor(
      () => !!serverRoom('private-1')?.players.every(p => p.isReady),
    );
    host.socket.emit(SocketEvent.StartGame, { roomId: 'private-1' });
    await waitFor(() => !!serverRoom('private-1')?.buzzerState?.roundOpen);
    const buzz = next(host.socket, SocketEvent.BuzzerBuzzInSuccess);
    guest.socket.emit(SocketEvent.BuzzerBuzzIn, { roomId: 'private-1' });
    await buzz;
    guest.socket.io.engine.close();

    const answerSeconds =
      serverRoom('private-1')!.settings.buzzerSettings?.answerSeconds ??
      DEFAULT_BUZZER_SETTINGS.answerSeconds;
    const result = next<{ playerId: string; isCorrect: boolean }>(
      host.socket,
      SocketEvent.BuzzerAnswerResult,
      p => p.playerId === guest.id,
      (answerSeconds + 3) * 1000,
    );
    expect((await result).isCorrect).toBe(false);
    await waitFor(
      () =>
        serverRoom('private-1')?.buzzerState?.currentAnswerPlayerId === null,
    );
    // 這一題恢復搶答：房主可以再搶
    await sleep(200);
    const again = next(host.socket, SocketEvent.BuzzerBuzzInSuccess);
    host.socket.emit(SocketEvent.BuzzerBuzzIn, { roomId: 'private-1' });
    await again;
  }, 60_000);

  it('搶到作答權後斷線且寬限期先到：作答權收回，遊戲繼續，沒有殘留的作答計時', async () => {
    const { host, guest } = await privateRoom();
    // 加一位電腦：客人被移出後房裡還有兩人，遊戲繼續
    host.socket.emit(SocketEvent.EditRoomSettings, {
      roomId: 'private-1',
      maxPlayers: 3,
    });
    await waitFor(() => serverRoom('private-1')?.maxPlayers === 3);
    host.socket.emit(SocketEvent.AddBotToRoom, {
      roomId: 'private-1',
      difficulty: 'easy',
    });
    await waitFor(() => serverRoom('private-1')?.players.length === 3);
    guest.socket.emit(SocketEvent.ReadyGame, { roomId: 'private-1' });
    await waitFor(
      () => !!serverRoom('private-1')?.players.every(p => p.isReady),
    );
    host.socket.emit(SocketEvent.StartGame, { roomId: 'private-1' });
    await waitFor(() => !!serverRoom('private-1')?.buzzerState?.roundOpen);
    const buzz = next(host.socket, SocketEvent.BuzzerBuzzInSuccess);
    guest.socket.emit(SocketEvent.BuzzerBuzzIn, { roomId: 'private-1' });
    await buzz;
    guest.socket.io.engine.close();

    // 遊戲中的寬限期 5 秒到 → 移出房間、收回作答權
    await waitFor(() => serverRoom('private-1')?.players.length === 2, 8000);
    const room = serverRoom('private-1')!;
    expect(room.status).toBe(GameStatus.Playing);
    expect(room.buzzerState!.currentAnswerPlayerId).toBeNull();
    expect(gameServer.activeTimers('private-1')).not.toContain('buzzerAnswer');
    expect(host.log.map(r => r.event)).not.toContain(SocketEvent.GameAborted);
  }, 15000);
});

// ── 場次 id（分析去重用） ────────────────────────────────────────────────────

describe('場次 id（matchId）', () => {
  it('開局時產生；同房每個人一樣、重連沿用、結算事件帶同一個；下一局換新', async () => {
    const { host, guest } = await privateRoom();
    expect(host.room()?.matchId).toBeUndefined();
    guest.socket.emit(SocketEvent.ReadyGame, { roomId: 'private-1' });
    await waitFor(
      () => !!serverRoom('private-1')?.players.every(p => p.isReady),
    );
    host.socket.emit(SocketEvent.StartGame, { roomId: 'private-1' });
    await waitFor(
      () =>
        host.room()?.status === GameStatus.Playing &&
        guest.room()?.status === GameStatus.Playing,
    );
    const first = host.room()!.matchId!;
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(guest.room()!.matchId).toBe(first);

    // 重新整理（新的 socket）：同一局、同一個 id
    guest.socket.io.engine.close();
    await waitFor(
      () =>
        !!serverRoom('private-1')?.players.find(p => p.id === guest.id)
          ?.isDisconnected,
    );
    const fresh = await newSocket();
    const success = next<{ room: RoomView }>(
      fresh.socket,
      SocketEvent.PlayerReconnectSuccess,
    );
    fresh.socket.emit(SocketEvent.PlayerReconnect, {
      reconnectToken: guest.token,
    });
    expect((await success).room.matchId).toBe(first);

    const over = await winGame(host, 'private-1');
    expect(over.matchId).toBe(first);

    // 私人房間再一局：新的 id
    await waitFor(() => serverRoom('private-1')?.status === GameStatus.Idle);
    fresh.socket.emit(SocketEvent.ReadyGame, {
      roomId: 'private-1',
      ready: true,
    });
    await waitFor(
      () => !!serverRoom('private-1')?.players.every(p => p.isReady),
    );
    host.socket.emit(SocketEvent.StartGame, { roomId: 'private-1' });
    await waitFor(() => host.room()?.status === GameStatus.Playing);
    const second = host.room()!.matchId!;
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
  });

  it('快速配對再戰的下一局是另一個 id；不同房間的 id 不會相同', async () => {
    const a = await quick('Alice');
    const first = roomOf(a)!;
    a.socket.emit(SocketEvent.QuickMatchStartNow, { roomId: first });
    await waitFor(() => !!a.room()?.matchId);
    const firstMatch = a.room()!.matchId!;
    const b = await quick('Bob');
    b.socket.emit(SocketEvent.QuickMatchStartNow, { roomId: roomOf(b)! });
    await waitFor(() => !!b.room()?.matchId);
    expect(b.room()!.matchId).not.toBe(firstMatch);

    await winGame(a, first);
    await quick('Alice', a);
    const second = roomOf(a)!;
    a.socket.emit(SocketEvent.QuickMatchStartNow, { roomId: second });
    await waitFor(() => a.room()?.roomId === second && !!a.room()?.matchId);
    expect(a.room()!.matchId).not.toBe(firstMatch);
  });
});

describe('再戰流程的回歸', () => {
  it('連續完成三場：每一場都從第 1 題、0 分開始，舊房都清掉', async () => {
    const a = await quick('Alice');
    const rooms: string[] = [];
    for (let i = 0; i < 3; i++) {
      if (i > 0) await quick('Alice', a);
      const roomId = roomOf(a)!;
      rooms.push(roomId);
      a.socket.emit(SocketEvent.QuickMatchStartNow, { roomId });
      await waitFor(() => !!serverRoom(roomId)?.buzzerState?.roundOpen);
      const room = serverRoom(roomId)!;
      expect(room.buzzerState!.roundNumber).toBe(1);
      expect(room.players.every(p => p.score === 0)).toBe(true);
      const over = await winGame(a, roomId);
      expect(over.roomId).toBe(roomId);
    }
    expect(new Set(rooms).size).toBe(3);
    // 前兩間在按再玩一場時已清掉；最後一間結算後離開也清掉
    expect(serverRoom(rooms[0])).toBeUndefined();
    expect(serverRoom(rooms[1])).toBeUndefined();
    a.socket.emit(SocketEvent.LeaveRoom, { roomId: rooms[2] });
    await waitFor(() => !serverRoom(rooms[2]));
    for (const roomId of rooms) {
      expect(gameServer.activeTimers(roomId)).toEqual([]);
    }
  }, 30000);

  it('再戰配對中重新整理：用新房間的 token 回到新的配對房，舊房不受影響也不會回去', async () => {
    const a = await quick('Alice');
    const first = roomOf(a)!;
    a.socket.emit(SocketEvent.QuickMatchStartNow, { roomId: first });
    await winGame(a, first);
    const rematch = await quick('Alice', a);
    const second = roomOf(rematch)!;
    expect(second).not.toBe(first);

    a.socket.io.engine.close();
    await waitFor(
      () =>
        !!serverRoom(second)?.players.find(p => p.id === a.id)?.isDisconnected,
    );
    const fresh = await newSocket();
    const success = next<{ room: RoomView }>(
      fresh.socket,
      SocketEvent.PlayerReconnectSuccess,
    );
    fresh.socket.emit(SocketEvent.PlayerReconnect, {
      reconnectToken: rematch.token,
    });
    const { room } = await success;
    expect(room.roomId).toBe(second);
    expect(room.quickMatchPending).toBe(true);
    expect(serverRoom(first)).toBeUndefined();
    await waitFor(() => serverRoom(second)?.status === GameStatus.Playing);
  });
});
