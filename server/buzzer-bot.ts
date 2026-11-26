import { Server } from 'socket.io';
import { NumberCard } from '../models/Player';
import { DEFAULT_BUZZER_SETTINGS, Room } from '../models/Room';
import { SelectedCard } from '../models/SelectedCard';
import { SocketEvent } from '../models/SocketEvent';
import { Symbol } from '../models/Symbol';
import { processBuzzIn, processBuzzerAnswer, unlockPlayer } from './buzzer';
import { applyBuzzerRoomUpdate, getCurrentRoom } from './game';
import { emitRoomUpdate } from './room-emitter';

// ── 24 點 Solver ─────────────────────────────────────────────────────────────

type SolverResult = { expr: SelectedCard[] } | null;

const OPS: { symbol: Symbol; fn: (a: number, b: number) => number | null }[] = [
  { symbol: Symbol.Plus, fn: (a, b) => a + b },
  { symbol: Symbol.Minus, fn: (a, b) => a - b },
  { symbol: Symbol.Times, fn: (a, b) => a * b },
  { symbol: Symbol.Divide, fn: (a, b) => (Math.abs(b) > 1e-8 ? a / b : null) },
];

/** 找出一組公共牌的 24 點解法（電腦玩家與測試共用） */
export function solve24Cards(cards: NumberCard[]): SolverResult {
  const n = cards.length;
  if (n === 1) {
    return Math.abs(cards[0].value - 24) < 1e-6
      ? { expr: [{ number: cards[0] }] }
      : null;
  }

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const remaining = cards.filter((_, k) => k !== i && k !== j);
      const a = cards[i];
      const b = cards[j];
      for (const op of OPS) {
        const c = op.fn(a.value, b.value);
        if (c === null) continue;
        const merged: NumberCard = { id: `${a.id}_${b.id}`, value: c };
        const subResult = solve24Cards([...remaining, merged]);
        if (!subResult) continue;

        const needBracket = remaining.length > 0;
        const exprPart: SelectedCard[] = needBracket
          ? [
              { symbol: Symbol.LeftBracket },
              { number: a },
              { symbol: op.symbol },
              { number: b },
              { symbol: Symbol.RightBracket },
            ]
          : [{ number: a }, { symbol: op.symbol }, { number: b }];

        const fullExpr = subResult.expr.flatMap(sc => {
          if (sc.number?.id === merged.id) return exprPart;
          return [sc];
        });

        return { expr: fullExpr };
      }
    }
  }
  return null;
}

// ── Bot 難度設定 ──────────────────────────────────────────────────────────────
//
// minDelay/maxDelay  : 回合開始後首次搶答的延遲（ms）
// accuracy           : 搶答意願 & 答對機率
// retryChance        : 答錯解鎖後重試的機率（每次獨立）
// retryMinDelay      : 解鎖後等多久再次搶答（ms）
// retryMaxDelay

const DIFFICULTY_CONFIG = {
  easy: {
    minDelay: 4000,
    maxDelay: 8000,
    accuracy: 0.6,
    retryChance: 0.35,
    retryMinDelay: 3000,
    retryMaxDelay: 6000,
  },
  normal: {
    minDelay: 2000,
    maxDelay: 5000,
    accuracy: 0.85,
    retryChance: 0.65,
    retryMinDelay: 1500,
    retryMaxDelay: 4000,
  },
  hard: {
    minDelay: 800,
    maxDelay: 2000,
    accuracy: 0.98,
    retryChance: 0.92,
    retryMinDelay: 600,
    retryMaxDelay: 1800,
  },
} as const;

// ── 核心：排程一次搶答嘗試 ────────────────────────────────────────────────────

/**
 * 電腦的動作交給 socket-server 用和真人相同的流程處理，計時器只有一份：
 * 搶到時暫停回合計時、答錯後恢復、答對換題、獲勝時清掉所有計時器並排程重設
 */
export type BuzzerBotHooks = {
  onBuzzIn: (roomId: string) => void;
  onWrongAnswer: (roomId: string) => void;
  onCorrectAnswer: (roomId: string) => void;
  onWin: (
    roomId: string,
    room: Room,
    winner: { id: string; name: string; score: number },
  ) => void;
};

function _scheduleAttempt(
  roomId: string,
  botId: string,
  botName: string,
  difficulty: keyof typeof DIFFICULTY_CONFIG,
  solution: SolverResult,
  targetRound: number,
  delay: number,
  io: Server,
  hooks: BuzzerBotHooks,
) {
  const config = DIFFICULTY_CONFIG[difficulty];

  setTimeout(() => {
    const room = getCurrentRoom(roomId);
    if (!room?.buzzerState) return;
    if (room.status !== 'playing') return;
    // 回合已換，停止
    if (room.buzzerState.roundNumber !== targetRound) return;
    // 已有人作答，或這一題已經關閉（有人答對、投票通過、超時）
    if (room.buzzerState.currentAnswerPlayerId !== null) return;
    if (!room.buzzerState.roundOpen) return;
    // 仍被鎖定
    const ps = room.buzzerState.playerStates[botId];
    if (ps?.isLocked) return;

    const buzzResult = processBuzzIn(room, botId);
    if (!buzzResult.success) return;

    const afterBuzz = applyBuzzerRoomUpdate(buzzResult.room);
    if (!afterBuzz) return;

    const settings =
      afterBuzz.settings.buzzerSettings ?? DEFAULT_BUZZER_SETTINGS;

    io.to(roomId).emit(SocketEvent.BuzzerBuzzInSuccess, {
      playerId: botId,
      playerName: botName,
      answerSeconds: settings.answerSeconds,
    });
    // 伺服器的回合計時要真的暫停（原本只通知前端，計時其實還在跑）
    hooks.onBuzzIn(roomId);

    // 模擬「思考 + 輸入」時間後提交
    const thinkTime = 1500 + Math.random() * 2000;
    setTimeout(() => {
      const roomNow = getCurrentRoom(roomId);
      if (!roomNow?.buzzerState) return;
      if (roomNow.buzzerState.currentAnswerPlayerId !== botId) return;
      if (roomNow.buzzerState.roundNumber !== targetRound) return;

      const answerCorrectly =
        solution !== null && Math.random() < config.accuracy;
      const cards = answerCorrectly
        ? solution!.expr
        : _wrongAnswer(roomNow.buzzerState.publicCards);

      const answerResult = processBuzzerAnswer(roomNow, botId, cards);
      if (answerResult.kind === 'rejected') return;
      const updated = applyBuzzerRoomUpdate(answerResult.room);
      if (!updated) return;

      if (answerResult.kind === 'correct') {
        // ── 答對 ──────────────────────────────────────────────────────────────
        io.to(roomId).emit(SocketEvent.BuzzerAnswerResult, {
          isCorrect: true,
          playerId: botId,
          scoreDelta: answerResult.scoreDelta,
          newScore: updated.players.find(p => p.id === botId)?.score ?? 0,
          streak: answerResult.streak,
          streakBonus: answerResult.streakBonus,
        });
        emitRoomUpdate(io, updated);

        if (answerResult.winner) {
          // 和真人獲勝同一個流程：清掉回合、作答、鎖定等計時器再排程重設
          hooks.onWin(roomId, updated, answerResult.winner);
          return;
        }

        // 答對但未勝利：由 socket-server 換新題（清計時器後啟動新回合）
        hooks.onCorrectAnswer(roomId);
      } else {
        // ── 答錯 ──────────────────────────────────────────────────────────────
        io.to(roomId).emit(SocketEvent.BuzzerAnswerResult, {
          isCorrect: false,
          playerId: botId,
          scoreDelta: answerResult.scoreDelta,
          newScore: updated.players.find(p => p.id === botId)?.score ?? 0,
          streak: 0,
          streakBonus: 0,
        });
        emitRoomUpdate(io, updated);

        const ps2 = updated.buzzerState?.playerStates[botId];

        // 恢復回合計時（伺服器計時與前端顯示一起）
        hooks.onWrongAnswer(roomId);

        if (ps2?.isLocked && ps2.lockUntil) {
          io.to(roomId).emit(SocketEvent.BuzzerPlayerLocked, {
            playerId: botId,
            lockSeconds: settings.lockSeconds,
            lockUntil: ps2.lockUntil,
          });

          // 解鎖後決定是否重試
          setTimeout(() => {
            const r = getCurrentRoom(roomId);
            if (!r || r.status !== 'playing') return;
            const unlockedRoom = unlockPlayer(r, botId);
            applyBuzzerRoomUpdate(unlockedRoom);
            io.to(roomId).emit(SocketEvent.BuzzerPlayerUnlocked, {
              playerId: botId,
            });

            if (Math.random() < config.retryChance) {
              const retryDelay =
                config.retryMinDelay +
                Math.random() * (config.retryMaxDelay - config.retryMinDelay);
              _scheduleAttempt(
                roomId,
                botId,
                botName,
                difficulty,
                solution,
                targetRound,
                retryDelay,
                io,
                hooks,
              );
            }
          }, settings.lockSeconds * 1000);
        } else {
          // 無鎖定：直接重試
          if (Math.random() < config.retryChance) {
            const retryDelay =
              config.retryMinDelay +
              Math.random() * (config.retryMaxDelay - config.retryMinDelay);
            _scheduleAttempt(
              roomId,
              botId,
              botName,
              difficulty,
              solution,
              targetRound,
              retryDelay,
              io,
              hooks,
            );
          }
        }
      }
    }, thinkTime);
  }, delay);
}

// ── 公開入口 ─────────────────────────────────────────────────────────────────

/**
 * 每回合開始後呼叫一次。
 * 找出所有 bot，依照難度決定是否及何時搶答。
 * hooks：電腦搶到、答錯、答對、獲勝時交給 socket-server 處理（見 BuzzerBotHooks）。
 */
export function triggerBuzzerBot(
  roomId: string,
  io: Server,
  hooks: BuzzerBotHooks,
) {
  const room = getCurrentRoom(roomId);
  if (!room || !room.buzzerState) return;

  const bots = room.players.filter(p => p.isBot);
  if (bots.length === 0) return;

  const publicCards = room.buzzerState.publicCards;
  const solution = solve24Cards(publicCards);
  const targetRound = room.buzzerState.roundNumber;

  for (const bot of bots) {
    const difficulty = (bot.botDifficulty ??
      'normal') as keyof typeof DIFFICULTY_CONFIG;
    const config = DIFFICULTY_CONFIG[difficulty];

    // 決定這回合是否出手（easy bot 有 40% 機率直接放棄）
    if (solution === null || Math.random() >= config.accuracy) continue;

    const delay =
      config.minDelay + Math.random() * (config.maxDelay - config.minDelay);
    _scheduleAttempt(
      roomId,
      bot.id,
      bot.name,
      difficulty,
      solution,
      targetRound,
      delay,
      io,
      hooks,
    );
  }
}

// ── 輔助 ──────────────────────────────────────────────────────────────────────

function _wrongAnswer(publicCards: NumberCard[]): SelectedCard[] {
  const [a, b, c, d] = publicCards;
  return [
    { number: a },
    { symbol: Symbol.Plus },
    { number: b },
    { symbol: Symbol.Plus },
    { number: c },
    { symbol: Symbol.Plus },
    { number: d },
  ];
}
