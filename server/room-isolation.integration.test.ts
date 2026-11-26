// @vitest-environment node
import { type Server as HttpServer, createServer } from 'http';
import { AddressInfo } from 'net';
import { Server } from 'socket.io';
import { type Socket, io as connect } from 'socket.io-client';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GameMode } from '@/models/GameMode';
import { GameStatus } from '@/models/GameStatus';
import { NumberCard } from '@/models/Player';
import { RoomView } from '@/models/RoomView';
import { SocketEvent } from '@/models/SocketEvent';
import { Symbol } from '@/models/Symbol';
import * as game from './game';
import { attachGameServer } from './socket-server';

/**
 * 多人模式資料隔離：直接檢查每個客戶端實際收到的 Socket payload（socket.onAny 全部錄下），
 * 不看 UI。每位玩家都是獨立的 socket.io client。
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
    buzzerNextRoundDelayMs: 300,
    buzzerResumeDelayMs: 50,
    buzzerGameOverResetMs: 100,
    disconnectGraceIdleMs: 300,
    disconnectGracePlayingMs: 5000,
    // 電腦一定出手、一定答對：電腦的測試不會因為隨機不出手而等到回合超時
    botRandom: () => 0,
  });
  await new Promise<void>(resolve => httpServer.listen(0, resolve));
  url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;
});

afterEach(async () => {
  for (const c of clients.splice(0)) c.disconnect();
  gameServer.close();
  await new Promise<void>(resolve => io.close(() => resolve()));
});

// ── 錄下客戶端收到的所有事件 ──────────────────────────────────────────────────

type Received = { event: string; payload: unknown };

type Client = {
  socket: Socket;
  log: Received[];
  id: string;
  token: string;
};

async function newSocket(): Promise<{ socket: Socket; log: Received[] }> {
  const socket = connect(url, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
  });
  clients.push(socket);
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

async function waitFor(condition: () => boolean, timeout = 3000) {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) throw new Error('waitFor timeout');
    await new Promise(r => setTimeout(r, 10));
  }
}

const settle = (ms = 150) => new Promise(r => setTimeout(r, ms));

async function join(
  name: string,
  roomId: string,
  create: { roomName?: string; gameType?: 'classic' | 'buzzer' } = {},
): Promise<Client> {
  const { socket, log } = await newSocket();
  const idPromise = next<string>(socket, SocketEvent.GetPlayerId);
  const tokenPromise = next<string>(socket, SocketEvent.GetReconnectToken);
  socket.emit(SocketEvent.JoinRoom, {
    roomId,
    playerName: name,
    mode: GameMode.Multiple,
    maxPlayers: 2,
    roomName: create.roomName,
    gameType: create.gameType,
  });
  const [id, token] = await Promise.all([idPromise, tokenPromise]);
  return { socket, log, id, token };
}

async function twoPlayers(gameType: 'classic' | 'buzzer' = 'classic') {
  const host = await join('Host', 'room-1', { roomName: 'R', gameType });
  const guest = await join('Guest', 'room-1');
  await waitFor(() => game.getCurrentRoom('room-1')?.players.length === 2);
  return [host, guest] as const;
}

async function startGame(host: Client, guest: Client) {
  guest.socket.emit(SocketEvent.ReadyGame, { roomId: 'room-1' });
  await waitFor(
    () => !!game.getCurrentRoom('room-1')?.players.every(p => p.isReady),
  );
  host.socket.emit(SocketEvent.StartGame, { roomId: 'room-1' });
  await waitFor(
    () => game.getCurrentRoom('room-1')?.status === GameStatus.Playing,
  );
  await settle();
}

const serverRoom = () => game.getCurrentRoom('room-1')!;
const handIds = (playerId: string) =>
  serverRoom()
    .players.find(p => p.id === playerId)!
    .handCard.map(c => c.id);
const deckIds = () => serverRoom().deck.map(c => c.id);

// ── 檢查工具 ─────────────────────────────────────────────────────────────────

/** 帶房間資料的事件，以及從 payload 取出房間的方法 */
const ROOM_EVENTS: Record<string, (payload: unknown) => RoomView[]> = {
  [SocketEvent.RoomUpdate]: p => [(p as { room: RoomView }).room],
  [SocketEvent.JoinRoomSuccess]: p => [p as RoomView],
  [SocketEvent.PlayerReconnectSuccess]: p => [(p as { room: RoomView }).room],
};
/** 只有公開玩家資料或列表的事件 */
const LIST_EVENTS = new Set<string>([
  SocketEvent.GetRoomsResponse,
  SocketEvent.GameOver,
  SocketEvent.BuzzerGameOver,
]);
const seenEvents = new Set<string>();

afterAll(() => {
  // 每一種帶房間或玩家資料的事件都至少被檢查過一次
  for (const event of [...Object.keys(ROOM_EVENTS), ...LIST_EVENTS]) {
    expect(seenEvents, `沒有測到 ${event}`).toContain(event);
  }
});

const ROOM_KEYS = new Set([
  'roomId',
  'roomName',
  'hasPassword',
  'maxPlayers',
  'currentOrder',
  'deckCount',
  'players',
  'isGameOver',
  'status',
  'settings',
  'buzzerState',
  'isQuickMatch',
  'quickMatchPending',
  'playedCards',
  'matchId',
  'self',
]);
const PLAYER_KEYS = new Set([
  'id',
  'name',
  'score',
  'playerOrder',
  'isMaster',
  'isLastRoundPlayer',
  'isReady',
  'isBot',
  'botDifficulty',
  'isDisconnected',
  'handCardCount',
]);
const SELF_KEYS = new Set([
  'playerId',
  'handCard',
  'selectedCards',
  'roomPassword',
]);
const BUZZER_KEYS = new Set([
  'roundNumber',
  'publicCards',
  'roundTimerElapsed',
  'roundTimerPaused',
  'currentAnswerPlayerId',
  'answerStartAt',
  'noSolutionVotes',
  'playerStates',
  'roundOpen',
]);
const LOBBY_KEYS = new Set([
  'roomId',
  'roomName',
  'hasPassword',
  'maxPlayers',
  'playerCount',
  'status',
  'gameType',
]);

/** 不管出現在哪一層都不該送出的欄位名稱 */
const FORBIDDEN_KEYS = [
  'deck',
  'password',
  'reconnectToken',
  'pendingPlay',
  'disconnectedAt',
  'countdownTime',
  'handCard',
];

/** 找出 payload 裡所有被禁止的欄位路徑；self.handCard 是唯一允許的手牌位置 */
function forbiddenPaths(value: unknown, path = ''): string[] {
  if (!value || typeof value !== 'object') return [];
  const found: string[] = [];
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    const allowedHand = key === 'handCard' && path.endsWith('.self');
    if (FORBIDDEN_KEYS.includes(key) && !allowedHand) found.push(childPath);
    found.push(...forbiddenPaths(child, childPath));
  }
  return found;
}

function extraKeys(obj: object, allowed: Set<string>) {
  return Object.keys(obj).filter(k => !allowed.has(k));
}

/**
 * 這位玩家（viewerId；不在房內時傳 null）收到的所有事件：
 * 不含禁止欄位；房間資料只有 allowlist 欄位；私人資料只有自己的
 */
function assertClean(log: Received[], viewerId: string | null) {
  for (const { event, payload } of log) {
    expect(forbiddenPaths(payload), `${event} 含禁止欄位`).toEqual([]);

    if (ROOM_EVENTS[event]) {
      seenEvents.add(event);
      for (const view of ROOM_EVENTS[event](payload)) {
        expect(extraKeys(view, ROOM_KEYS), `${event} 房間欄位`).toEqual([]);
        for (const p of view.players) {
          expect(extraKeys(p, PLAYER_KEYS), `${event} 玩家欄位`).toEqual([]);
        }
        if (view.buzzerState) {
          expect(extraKeys(view.buzzerState, BUZZER_KEYS)).toEqual([]);
        }
        if (view.self) {
          expect(extraKeys(view.self, SELF_KEYS)).toEqual([]);
          expect(view.self.playerId, `${event} 的私人資料不是本人的`).toBe(
            viewerId,
          );
        } else {
          expect(view.self).toBeNull();
        }
      }
    }
    if (LIST_EVENTS.has(event)) {
      seenEvents.add(event);
      if (event === SocketEvent.GetRoomsResponse) {
        for (const room of payload as object[]) {
          expect(extraKeys(room, LOBBY_KEYS)).toEqual([]);
        }
      } else {
        const { players } = payload as { players: object[] };
        for (const p of players) {
          expect(extraKeys(p, PLAYER_KEYS)).toEqual([]);
        }
      }
    }
  }
}

/** 這些卡牌 id 不能出現在 log 的任何地方 */
function assertNoCards(log: Received[], ids: string[], label: string) {
  const json = JSON.stringify(log);
  const leaked = ids.filter(id => json.includes(id));
  expect(leaked, label).toEqual([]);
}

const roomViews = (log: Received[]) =>
  log.flatMap(({ event, payload }) =>
    ROOM_EVENTS[event] ? ROOM_EVENTS[event](payload) : [],
  );
const lastView = (log: Received[]) => roomViews(log).at(-1)!;

// ── 傳統對戰 ─────────────────────────────────────────────────────────────────

describe('傳統對戰：手牌與牌庫隔離', () => {
  it('開局後 A 收不到 B 的手牌、B 收不到 A 的手牌，誰都收不到牌庫，只拿得到自己的手牌', async () => {
    const [host, guest] = await twoPlayers();
    await startGame(host, guest);

    const hostHand = handIds(host.id);
    const guestHand = handIds(guest.id);
    const deck = deckIds();
    expect(hostHand.length).toBeGreaterThan(0);
    expect(deck.length).toBeGreaterThan(0);

    assertNoCards(host.log, guestHand, 'A 收到 B 的手牌');
    assertNoCards(guest.log, hostHand, 'B 收到 A 的手牌');
    assertNoCards([...host.log, ...guest.log], deck, '牌庫外洩');
    assertClean(host.log, host.id);
    assertClean(guest.log, guest.id);

    // 自己的手牌拿得到，別人只有張數
    const view = lastView(guest.log);
    expect(view.self!.handCard.map(c => c.id).sort()).toEqual(
      [...guestHand].sort(),
    );
    expect(view.players.find(p => p.id === host.id)!.handCardCount).toBe(
      hostHand.length,
    );
    expect(view.deckCount).toBe(deck.length);
  });

  it('組算式、出牌、計分、換回合、抽牌的過程中資料仍然隔離；組算式只有自己看得到', async () => {
    const [host, guest] = await twoPlayers();
    await startGame(host, guest);
    const room = serverRoom();
    const currentId = room.players.find(
      p => p.playerOrder === room.currentOrder,
    )!.id;
    const [current, other] =
      currentId === host.id ? [host, guest] : [guest, host];

    // 目前玩家的手牌換成 6 6 6 6，方便組出 24
    const sixes: NumberCard[] = [0, 1, 2, 3].map(i => ({
      id: `six-${i}`,
      value: 6,
    }));
    serverRoom().players.find(p => p.id === current.id)!.handCard = sixes;
    sixes.forEach((card, i) => {
      if (i > 0)
        current.socket.emit(SocketEvent.SelectCard, {
          roomId: 'room-1',
          symbol: Symbol.Plus,
        });
      current.socket.emit(SocketEvent.SelectCard, {
        roomId: 'room-1',
        number: { id: card.id },
      });
    });
    await waitFor(() => serverRoom().selectedCards.length === 7);
    await settle();

    // 還在組算式：對手收不到任何一張，出牌者自己的 self.selectedCards 有完整算式
    assertNoCards(
      other.log,
      sixes.map(c => c.id),
      '對手看到正在組的算式',
    );
    expect(lastView(current.log).self!.selectedCards).toHaveLength(7);
    expect(lastView(other.log).self!.selectedCards).toEqual([]);
    expect(lastView(other.log).playedCards).toEqual([]);

    // 出牌：伺服器判定正確後，這一手公開給大家看計分
    const played = next<{ room: RoomView }>(
      other.socket,
      SocketEvent.RoomUpdate,
      p => p.room.playedCards.length > 0,
    );
    current.socket.emit(SocketEvent.PlayCard, { roomId: 'room-1' });
    expect((await played).room.playedCards).toHaveLength(7);

    // 入帳、換人
    const orderBefore = serverRoom().currentOrder;
    current.socket.emit(SocketEvent.UpdateScore, { roomId: 'room-1' });
    await waitFor(() => serverRoom().currentOrder !== orderBefore);
    await settle();
    // 換對手抽牌結束回合
    const orderAfterScore = serverRoom().currentOrder;
    other.socket.emit(SocketEvent.DrawCard, { roomId: 'room-1' });
    await waitFor(() => serverRoom().currentOrder !== orderAfterScore);
    await settle();

    // 整個過程：沒有禁止欄位、沒收到對方目前的手牌、沒收到剩下的牌庫
    assertClean(host.log, host.id);
    assertClean(guest.log, guest.id);
    assertNoCards(host.log, handIds(guest.id), 'A 收到 B 的手牌');
    assertNoCards(guest.log, handIds(host.id), 'B 收到 A 的手牌');
    assertNoCards([...host.log, ...guest.log], deckIds(), '牌庫外洩');
    // 補牌後自己的手牌正確
    expect(
      lastView(current.log)
        .self!.handCard.map(c => c.id)
        .sort(),
    ).toEqual(handIds(current.id).sort());
  });

  it('遊戲結束（GameOver）的排名只有公開資料', async () => {
    const [host, guest] = await twoPlayers();
    await startGame(host, guest);
    const room = serverRoom();
    const current = room.players.find(
      p => p.playerOrder === room.currentOrder,
    )!;
    current.isLastRoundPlayer = true;
    const sender = current.id === host.id ? host : guest;
    const over = next(host.socket, SocketEvent.GameOver);
    sender.socket.emit(SocketEvent.DrawCard, { roomId: 'room-1' });
    await over;
    await settle();
    assertClean(host.log, host.id);
    assertClean(guest.log, guest.id);
    assertNoCards(host.log, handIds(guest.id), 'GameOver 帶出對手手牌');
    assertNoCards(guest.log, handIds(host.id), 'GameOver 帶出對手手牌');
  });
});

describe('密碼與 reconnectToken', () => {
  it('房間密碼只有房主在自己的私人資料拿得到；其他玩家與大廳只看到「有密碼」', async () => {
    const [host, guest] = await twoPlayers();
    const secret = 'pw-secret-1234';
    host.socket.emit(SocketEvent.EditRoomName, {
      roomId: 'room-1',
      roomName: 'Locked',
      password: secret,
    });
    await waitFor(() => serverRoom().password === secret);
    await settle();

    const lobby = await newSocket();
    const list = next(lobby.socket, SocketEvent.GetRoomsResponse);
    lobby.socket.emit(SocketEvent.SearchRooms);
    await list;

    expect(JSON.stringify(guest.log)).not.toContain(secret);
    expect(JSON.stringify(lobby.log)).not.toContain(secret);
    expect(lastView(guest.log).hasPassword).toBe(true);
    expect(lastView(guest.log).self!.roomPassword).toBeUndefined();
    expect(lastView(host.log).self!.roomPassword).toBe(secret);
    // 房主收到密碼的地方只有 self.roomPassword
    for (const view of roomViews(host.log)) {
      const { self, ...publicPart } = view;
      expect(JSON.stringify(publicPart)).not.toContain(secret);
      void self;
    }
    assertClean(guest.log, guest.id);
    assertClean(host.log, host.id);
    assertClean(lobby.log, null);
  });

  it('reconnectToken 只送給本人，而且只出現在 GetReconnectToken', async () => {
    const [host, guest] = await twoPlayers();
    await startGame(host, guest);
    const lobby = await newSocket();
    const list = next(lobby.socket, SocketEvent.GetRoomsResponse);
    lobby.socket.emit(SocketEvent.SearchRooms);
    await list;

    expect(JSON.stringify(guest.log)).not.toContain(host.token);
    expect(JSON.stringify(host.log)).not.toContain(guest.token);
    expect(JSON.stringify(lobby.log)).not.toContain(host.token);
    expect(JSON.stringify(lobby.log)).not.toContain(guest.token);
    for (const c of [host, guest]) {
      const carriers = c.log.filter(r =>
        JSON.stringify(r.payload ?? null).includes(c.token),
      );
      expect(carriers.map(r => r.event)).toEqual([
        SocketEvent.GetReconnectToken,
      ]);
    }
  });
});

describe('重連、離房與分頁取代', () => {
  it('重新整理（新的 socket）後拿回自己的手牌，仍收不到對手的', async () => {
    const [host, guest] = await twoPlayers();
    await startGame(host, guest);
    guest.socket.io.engine.close();
    await waitFor(
      () => !!serverRoom().players.find(p => p.id === guest.id)?.isDisconnected,
    );

    const fresh = await newSocket();
    const success = next<{ room: RoomView; playerId: string }>(
      fresh.socket,
      SocketEvent.PlayerReconnectSuccess,
    );
    fresh.socket.emit(SocketEvent.PlayerReconnect, {
      reconnectToken: guest.token,
    });
    const { room, playerId } = await success;
    expect(playerId).toBe(guest.id);
    expect(room.self!.handCard.map(c => c.id).sort()).toEqual(
      handIds(guest.id).sort(),
    );
    await settle();
    assertClean(fresh.log, guest.id);
    assertNoCards(fresh.log, handIds(host.id), '重連後收到對手手牌');
    assertNoCards(fresh.log, deckIds(), '重連後收到牌庫');
  });

  it('離開房間後要不到原房間的資料：舊 token 失效、BuzzerSync 沒有回應、也收不到後續廣播', async () => {
    const [host, guest] = await twoPlayers('buzzer');
    guest.socket.emit(SocketEvent.LeaveRoom, { roomId: 'room-1' });
    await waitFor(() => serverRoom().players.length === 1);
    const before = guest.log.length;

    const failed = next(guest.socket, SocketEvent.PlayerReconnectFailed);
    guest.socket.emit(SocketEvent.PlayerReconnect, {
      reconnectToken: guest.token,
    });
    await failed;
    guest.socket.emit(SocketEvent.BuzzerSync, { roomId: 'room-1' });
    host.socket.emit(SocketEvent.EditRoomName, {
      roomId: 'room-1',
      roomName: 'After leave',
    });
    await waitFor(() => serverRoom().roomName === 'After leave');
    await settle();

    const after = guest.log.slice(before).map(r => r.event);
    expect(after).toEqual([SocketEvent.PlayerReconnectFailed]);
  });

  it('雙分頁 SessionReplaced 之後，舊分頁再也收不到房間或私人資料', async () => {
    const [host, guest] = await twoPlayers();
    await startGame(host, guest);
    const tab2 = await newSocket();
    const replaced = next(guest.socket, SocketEvent.SessionReplaced);
    const success = next(tab2.socket, SocketEvent.PlayerReconnectSuccess);
    tab2.socket.emit(SocketEvent.PlayerReconnect, {
      reconnectToken: guest.token,
    });
    await Promise.all([replaced, success]);
    const before = guest.log.length;

    // 房內繼續有動作，舊分頁也主動要資料
    guest.socket.emit(SocketEvent.BuzzerSync, { roomId: 'room-1' });
    const room = serverRoom();
    const currentId = room.players.find(
      p => p.playerOrder === room.currentOrder,
    )!.id;
    const actor = currentId === host.id ? host.socket : tab2.socket;
    const orderBefore = room.currentOrder;
    actor.emit(SocketEvent.DrawCard, { roomId: 'room-1' });
    await waitFor(() => serverRoom().currentOrder !== orderBefore);
    await settle();

    const afterEvents = guest.log.slice(before).map(r => r.event);
    for (const event of [...Object.keys(ROOM_EVENTS), ...LIST_EVENTS]) {
      expect(afterEvents).not.toContain(event);
    }
    assertNoCards(
      guest.log.slice(before),
      handIds(guest.id),
      '舊分頁收到新的手牌',
    );
    assertClean(tab2.log, guest.id);
  });
});

// ── 搶答 ─────────────────────────────────────────────────────────────────────

describe('搶答模式', () => {
  it('公共題目牌同步給每個人，牌庫與私人資料仍然隔離；結束的排名只有公開資料', async () => {
    const [host, guest] = await twoPlayers('buzzer');
    const rounds = [host, guest].map(c =>
      next<{ publicCards: NumberCard[]; roundNumber: number }>(
        c.socket,
        SocketEvent.BuzzerRoundStart,
      ),
    );
    await startGame(host, guest);
    const [a, b] = await Promise.all(rounds);
    expect(a.publicCards).toHaveLength(4);
    expect(a.publicCards).toEqual(b.publicCards);
    expect(a.publicCards).toEqual(serverRoom().buzzerState!.publicCards);
    await waitFor(() => !!serverRoom().buzzerState?.roundOpen);
    // 重新整理後補送的題目也一樣
    const synced = next<{ publicCards: NumberCard[] }>(
      guest.socket,
      SocketEvent.BuzzerRoundStart,
    );
    guest.socket.emit(SocketEvent.BuzzerSync, { roomId: 'room-1' });
    expect((await synced).publicCards).toEqual(a.publicCards);

    // 直接把分數設到快贏，答對一題就結束，檢查 BuzzerGameOver
    const winScore = serverRoom().settings.buzzerSettings!.winScore;
    serverRoom().players.find(p => p.id === host.id)!.score = winScore - 1;
    const { solve24Cards } = await import('./buzzer-bot');
    const solution = solve24Cards(a.publicCards)!.expr;
    const buzz = next(host.socket, SocketEvent.BuzzerBuzzInSuccess);
    host.socket.emit(SocketEvent.BuzzerBuzzIn, { roomId: 'room-1' });
    await buzz;
    const over = next(guest.socket, SocketEvent.BuzzerGameOver);
    host.socket.emit(SocketEvent.BuzzerSubmitAnswer, {
      roomId: 'room-1',
      selectedCards: solution,
    });
    await over;
    await settle(300);

    assertClean(host.log, host.id);
    assertClean(guest.log, guest.id);
    assertNoCards([...host.log, ...guest.log], deckIds(), '牌庫外洩');
  });

  it('電腦玩家照常搶答作答，客戶端只看到電腦的公開狀態', async () => {
    const host = await join('Host', 'room-1', {
      roomName: 'Bot room',
      gameType: 'buzzer',
    });
    host.socket.emit(SocketEvent.AddBotToRoom, {
      roomId: 'room-1',
      difficulty: 'hard',
    });
    await waitFor(() => serverRoom().players.length === 2);
    const bot = serverRoom().players.find(p => p.isBot)!;

    const botAnswered = next<{ playerId: string }>(
      host.socket,
      SocketEvent.BuzzerAnswerResult,
      p => p.playerId === bot.id,
      15000,
    );
    host.socket.emit(SocketEvent.StartGame, { roomId: 'room-1' });
    await botAnswered;
    await settle();

    assertClean(host.log, host.id);
    const botView = lastView(host.log).players.find(p => p.id === bot.id)!;
    expect(botView).toMatchObject({ isBot: true, botDifficulty: 'hard' });
    expect(Object.keys(botView).every(k => PLAYER_KEYS.has(k))).toBe(true);
    assertNoCards(host.log, deckIds(), '牌庫外洩');
  }, 20000);
});
