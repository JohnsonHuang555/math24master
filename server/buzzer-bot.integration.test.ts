// @vitest-environment node
import { type Server as HttpServer, createServer } from 'http';
import { AddressInfo } from 'net';
import { Server } from 'socket.io';
import { type Socket, io as connect } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';
import { GameMode } from '@/models/GameMode';
import { GameStatus } from '@/models/GameStatus';
import { DEFAULT_BUZZER_SETTINGS } from '@/models/Room';
import { SelectedCard } from '@/models/SelectedCard';
import { SocketEvent } from '@/models/SocketEvent';
import { solve24Cards } from './buzzer-bot';
import * as game from './game';
import { GameServerOptions, attachGameServer } from './socket-server';

/**
 * 電腦玩家受伺服器作答時限約束：電腦和真人走同一個搶答、作答倒數與交卷流程，
 * 所有電腦計時器都跟著房間一起取消。電腦的隨機數與等待時間用選項固定，結果是確定的。
 */

let httpServer: HttpServer;
let io: Server;
let gameServer: ReturnType<typeof attachGameServer>;
let url: string;
const sockets: Socket[] = [];

/** 電腦依序取用的隨機數；用完之後一律是 0（會出手、會答對、會重試） */
let randomQueue: number[] = [];

async function start(overrides: Partial<GameServerOptions> = {}) {
  game.resetGameStateForTests();
  randomQueue = [];
  httpServer = createServer();
  io = new Server(httpServer);
  gameServer = attachGameServer(io, {
    startCountdownSeconds: 0,
    buzzerStartDelayMs: 10,
    buzzerCountdownSeconds: 0,
    buzzerNextRoundDelayMs: 200,
    buzzerResumeDelayMs: 50,
    buzzerGameOverResetMs: 300,
    disconnectGraceIdleMs: 300,
    disconnectGracePlayingMs: 5000,
    botRandom: () => (randomQueue.length ? randomQueue.shift()! : 0),
    botTiming: { attemptDelayMs: 50, thinkMs: 100, retryDelayMs: 100 },
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

type Received = { event: string; payload: unknown };

function next<T = unknown>(
  socket: Socket,
  event: string,
  predicate: (payload: T) => boolean = () => true,
  timeout = 5000,
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

async function waitFor(condition: () => boolean, timeout = 5000) {
  const startedAt = Date.now();
  while (!condition()) {
    if (Date.now() - startedAt > timeout) throw new Error('waitFor timeout');
    await new Promise(r => setTimeout(r, 10));
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const ROOM = 'bot-room';
const room = () => game.getCurrentRoom(ROOM);

type AnswerResult = {
  playerId: string;
  isCorrect: boolean;
  scoreDelta: number;
};

/**
 * 房主一人加上電腦開一局搶答（房主不出手，只觀察）。
 * beforeStart 可以在開局前調整房間設定
 */
async function hostWithBots(
  bots: number,
  beforeStart?: () => void,
): Promise<{ socket: Socket; log: Received[]; id: string; botIds: string[] }> {
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
  const idPromise = next<string>(socket, SocketEvent.GetPlayerId);
  socket.emit(SocketEvent.JoinRoom, {
    roomId: ROOM,
    playerName: 'Host',
    mode: GameMode.Multiple,
    maxPlayers: 4,
    roomName: 'Bots',
    gameType: 'buzzer',
  });
  const id = await idPromise;
  for (let i = 0; i < bots; i++) {
    socket.emit(SocketEvent.AddBotToRoom, { roomId: ROOM, difficulty: 'hard' });
  }
  await waitFor(() => room()?.players.length === bots + 1);
  beforeStart?.();
  socket.emit(SocketEvent.StartGame, { roomId: ROOM });
  await waitFor(() => room()?.status === GameStatus.Playing);
  const botIds = room()!
    .players.filter(p => p.isBot)
    .map(p => p.id);
  return { socket, log, id, botIds };
}

/** 這一局的作答秒數改成 seconds（不改共用的預設物件） */
function setAnswerSeconds(seconds: number) {
  const r = room()!;
  r.settings = {
    ...r.settings,
    buzzerSettings: {
      ...(r.settings.buzzerSettings ?? DEFAULT_BUZZER_SETTINGS),
      answerSeconds: seconds as 10,
    },
  };
}

const eventsOf = (log: Received[], event: string) =>
  log.filter(r => r.event === event).map(r => r.payload);

describe('電腦受伺服器作答時限約束', () => {
  it('電腦在時限內答對：照常得分換題，作答倒數與思考計時都取消', async () => {
    await start();
    const host = await hostWithBots(1);
    const [bot] = host.botIds;
    const result = await next<AnswerResult>(
      host.socket,
      SocketEvent.BuzzerAnswerResult,
      p => p.playerId === bot,
    );
    expect(result.isCorrect).toBe(true);
    expect(room()!.players.find(p => p.id === bot)!.score).toBeGreaterThan(0);
    const timers = gameServer.activeTimers(ROOM);
    expect(timers).not.toContain('buzzerAnswer');
    expect(timers).not.toContain('botThink');
    // 電腦搶到時，伺服器一樣啟動了作答倒數（前端拿到相同的作答秒數）
    const buzz = eventsOf(host.log, SocketEvent.BuzzerBuzzInSuccess)[0] as {
      playerId: string;
      answerSeconds: number;
    };
    expect(buzz).toMatchObject({
      playerId: bot,
      answerSeconds: DEFAULT_BUZZER_SETTINGS.answerSeconds,
    });
  });

  it('作答時限比電腦的思考時間短：伺服器先判定超時扣分，電腦之後不能再交卷或得分', async () => {
    // 電腦想 2.5 秒，作答時限只有 1 秒
    await start({ botTiming: { attemptDelayMs: 50, thinkMs: 2500 } });
    const host = await hostWithBots(1, () => setAnswerSeconds(1));
    const [bot] = host.botIds;
    const buzzed = Date.now();
    await next(
      host.socket,
      SocketEvent.BuzzerBuzzInSuccess,
      (p: { playerId: string }) => p.playerId === bot,
    );
    // 作答倒數由伺服器啟動
    expect(gameServer.activeTimers(ROOM)).toContain('buzzerAnswer');

    const timeout = await next<AnswerResult>(
      host.socket,
      SocketEvent.BuzzerAnswerResult,
      p => p.playerId === bot,
    );
    const elapsed = Date.now() - buzzed;
    expect(timeout.isCorrect).toBe(false);
    expect(timeout.scoreDelta).toBe(-DEFAULT_BUZZER_SETTINGS.penaltyPoints);
    expect(elapsed).toBeLessThan(2000);
    // 思考計時已經取消
    expect(gameServer.activeTimers(ROOM)).not.toContain('botThink');

    // 等過原本的思考時間：電腦沒有再交卷，分數只有超時的扣分
    await sleep(2000);
    const botResults = (
      eventsOf(host.log, SocketEvent.BuzzerAnswerResult) as AnswerResult[]
    ).filter(p => p.playerId === bot);
    expect(botResults).toHaveLength(1);
    const score = room()!.players.find(p => p.id === bot)!.score;
    expect(score).toBe(-DEFAULT_BUZZER_SETTINGS.penaltyPoints);
  });

  it('電腦超時後：作答權收回、回合計時恢復，真人可以搶答', async () => {
    await start({ botTiming: { attemptDelayMs: 50, thinkMs: 5000 } });
    const host = await hostWithBots(1, () => setAnswerSeconds(1));
    const [bot] = host.botIds;
    await next<AnswerResult>(
      host.socket,
      SocketEvent.BuzzerAnswerResult,
      p => p.playerId === bot,
    );
    await next(host.socket, SocketEvent.BuzzerRoundTimerResumed);
    const state = room()!.buzzerState!;
    expect(state.currentAnswerPlayerId).toBeNull();
    expect(state.roundTimerPaused).toBe(false);
    expect(state.roundOpen).toBe(true);
    expect(gameServer.activeTimers(ROOM)).toContain('buzzerRound');

    const buzz = next<{ playerId: string }>(
      host.socket,
      SocketEvent.BuzzerBuzzInSuccess,
    );
    host.socket.emit(SocketEvent.BuzzerBuzzIn, { roomId: ROOM });
    expect((await buzz).playerId).toBe(host.id);
  });

  it('電腦思考中真人斷線：電腦照常交卷，房間不會卡住', async () => {
    await start({ botTiming: { attemptDelayMs: 50, thinkMs: 500 } });
    const host = await hostWithBots(1);
    const [bot] = host.botIds;
    await waitFor(() => room()?.buzzerState?.currentAnswerPlayerId === bot);
    host.socket.io.engine.close();
    await waitFor(
      () => !!room()?.players.find(p => p.id === host.id)?.isDisconnected,
    );
    // 電腦答對、換下一題
    await waitFor(() => (room()?.buzzerState?.roundNumber ?? 0) >= 2, 3000);
    expect(room()!.players.find(p => p.id === bot)!.score).toBeGreaterThan(0);
  });

  it('電腦思考中房間被刪除（最後一位真人離開）：計時器全部取消，不會再有動作', async () => {
    await start({ botTiming: { attemptDelayMs: 50, thinkMs: 500 } });
    const host = await hostWithBots(2);
    await waitFor(() => !!room()?.buzzerState?.currentAnswerPlayerId);
    expect(gameServer.activeTimers(ROOM)).toContain('botThink');
    host.socket.emit(SocketEvent.LeaveRoom, { roomId: ROOM });
    await waitFor(() => !room());
    expect(gameServer.activeTimers(ROOM)).toEqual([]);
    const before = host.log.length;
    await sleep(800);
    expect(host.log.slice(before)).toEqual([]);
    expect(room()).toBeUndefined();
  });

  it('電腦思考中整局已經結束：思考計時到了也不會交卷或得分', async () => {
    await start({ botTiming: { attemptDelayMs: 50, thinkMs: 500 } });
    const host = await hostWithBots(1);
    const [bot] = host.botIds;
    await waitFor(() => room()?.buzzerState?.currentAnswerPlayerId === bot);
    // 模擬這時已經分出勝負（例如另一個流程結束了整局）
    room()!.isGameOver = true;
    const before = host.log.length;
    await sleep(800);
    const results = host.log
      .slice(before)
      .filter(r => r.event === SocketEvent.BuzzerAnswerResult);
    expect(results).toEqual([]);
    expect(room()!.players.find(p => p.id === bot)!.score).toBe(0);
  });

  it('上一題排好的電腦搶答，不會在下一題生效', async () => {
    // 電腦 300ms 後才搶；真人一開放就答對，100ms 後換下一題
    await start({
      buzzerNextRoundDelayMs: 100,
      botTiming: { attemptDelayMs: 300, thinkMs: 100 },
    });
    const host = await hostWithBots(1);
    await waitFor(() => !!room()?.buzzerState?.roundOpen);
    const solution = solve24Cards(room()!.buzzerState!.publicCards)!
      .expr as SelectedCard[];
    // 第 2 題電腦不出手（隨機數 ≥ 準確率）：之後出現的電腦搶答只可能來自第 1 題的舊排程
    randomQueue = [0.999];
    const buzz = next<{ playerId: string }>(
      host.socket,
      SocketEvent.BuzzerBuzzInSuccess,
    );
    host.socket.emit(SocketEvent.BuzzerBuzzIn, { roomId: ROOM });
    expect((await buzz).playerId).toBe(host.id);
    host.socket.emit(SocketEvent.BuzzerSubmitAnswer, {
      roomId: ROOM,
      selectedCards: solution,
    });
    await waitFor(() => room()?.buzzerState?.roundNumber === 2);
    await waitFor(() => !!room()?.buzzerState?.roundOpen);
    const before = host.log.length;
    await sleep(600);
    const botBuzzes = host.log
      .slice(before)
      .filter(r => r.event === SocketEvent.BuzzerBuzzInSuccess);
    expect(botBuzzes).toEqual([]);
    expect(room()!.buzzerState!.currentAnswerPlayerId).toBeNull();
  });

  it('多位電腦同時搶答：只有一位拿到作答權，這一題只結算一次', async () => {
    await start({ botTiming: { attemptDelayMs: 50, thinkMs: 300 } });
    const host = await hostWithBots(3);
    const result = await next<AnswerResult>(
      host.socket,
      SocketEvent.BuzzerAnswerResult,
    );
    // 第 1 題期間的搶答成功與結算都只有一次
    await sleep(100);
    const buzzes = eventsOf(host.log, SocketEvent.BuzzerBuzzInSuccess) as {
      playerId: string;
    }[];
    const results = eventsOf(
      host.log,
      SocketEvent.BuzzerAnswerResult,
    ) as AnswerResult[];
    expect(buzzes).toHaveLength(1);
    expect(results).toHaveLength(1);
    expect(buzzes[0].playerId).toBe(result.playerId);
    expect(host.botIds).toContain(result.playerId);
    const scored = room()!.players.filter(p => p.score !== 0);
    expect(scored.map(p => p.id)).toEqual([result.playerId]);
  });

  it('電腦獲勝：結算一次，回合、作答、電腦計時器全部清掉，重設後沒有任何殘留', async () => {
    await start();
    const host = await hostWithBots(2);
    const winScore = DEFAULT_BUZZER_SETTINGS.winScore;
    for (const p of room()!.players) if (p.isBot) p.score = winScore - 1;
    const over = await next<{ winner: { id: string }; roomId: string }>(
      host.socket,
      SocketEvent.BuzzerGameOver,
    );
    expect(host.botIds).toContain(over.winner.id);
    // 結算後只剩「回到等待中」的排程
    expect(gameServer.activeTimers(ROOM)).toEqual(['buzzerSchedule']);
    await waitFor(() => room()?.status === GameStatus.Idle);
    expect(gameServer.activeTimers(ROOM)).toEqual([]);
    await sleep(300);
    expect(eventsOf(host.log, SocketEvent.BuzzerGameOver)).toHaveLength(1);
    expect(room()!.players.every(p => p.score === 0)).toBe(true);
  });
});
