import { Server } from 'socket.io';
import { NumberCard } from '../models/Player';
import { DEFAULT_BUZZER_SETTINGS } from '../models/Room';
import { SelectedCard } from '../models/SelectedCard';
import { Symbol } from '../models/Symbol';
import { applyBuzzerRoomUpdate, endBuzzerGame, getCurrentRoom } from './game';
import { processBuzzIn, processBuzzerAnswer, unlockPlayer } from './buzzer';
import { SocketEvent } from '../models/SocketEvent';

// ── 24 點 Solver ─────────────────────────────────────────────────────────────

type SolverResult = { expr: SelectedCard[] } | null;

const OPS: { symbol: Symbol; fn: (a: number, b: number) => number | null }[] = [
  { symbol: Symbol.Plus,   fn: (a, b) => a + b },
  { symbol: Symbol.Minus,  fn: (a, b) => a - b },
  { symbol: Symbol.Times,  fn: (a, b) => a * b },
  { symbol: Symbol.Divide, fn: (a, b) => (Math.abs(b) > 1e-8 ? a / b : null) },
];

function solve24Cards(cards: NumberCard[]): SolverResult {
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
  easy:   { minDelay: 4000, maxDelay: 8000, accuracy: 0.60, retryChance: 0.35, retryMinDelay: 3000, retryMaxDelay: 6000 },
  normal: { minDelay: 2000, maxDelay: 5000, accuracy: 0.85, retryChance: 0.65, retryMinDelay: 1500, retryMaxDelay: 4000 },
  hard:   { minDelay: 800,  maxDelay: 2000, accuracy: 0.98, retryChance: 0.92, retryMinDelay:  600, retryMaxDelay: 1800 },
} as const;

// ── 核心：排程一次搶答嘗試 ────────────────────────────────────────────────────

function _scheduleAttempt(
  roomId: string,
  botId: string,
  botName: string,
  difficulty: keyof typeof DIFFICULTY_CONFIG,
  solution: SolverResult,
  targetRound: number,
  delay: number,
  io: Server,
  onCorrectAnswer: (roomId: string) => void,
) {
  const config = DIFFICULTY_CONFIG[difficulty];

  setTimeout(() => {
    const room = getCurrentRoom(roomId);
    if (!room?.buzzerState) return;
    if (room.status !== 'playing') return;
    // 回合已換，停止
    if (room.buzzerState.roundNumber !== targetRound) return;
    // 已有人作答
    if (room.buzzerState.currentAnswerPlayerId !== null) return;
    // 仍被鎖定
    const ps = room.buzzerState.playerStates[botId];
    if (ps?.isLocked) return;

    const buzzResult = processBuzzIn(room, botId);
    if (!buzzResult.success) return;

    const afterBuzz = applyBuzzerRoomUpdate(buzzResult.room);
    if (!afterBuzz) return;

    const settings = afterBuzz.settings.buzzerSettings ?? DEFAULT_BUZZER_SETTINGS;

    io.to(roomId).emit(SocketEvent.BuzzerBuzzInSuccess, {
      playerId: botId,
      playerName: botName,
      answerSeconds: settings.answerSeconds,
    });
    io.to(roomId).emit(SocketEvent.BuzzerRoundTimerPaused, {
      elapsedSeconds: afterBuzz.buzzerState!.roundTimerElapsed,
    });

    // 模擬「思考 + 輸入」時間後提交
    const thinkTime = 1500 + Math.random() * 2000;
    setTimeout(() => {
      const roomNow = getCurrentRoom(roomId);
      if (!roomNow?.buzzerState) return;
      if (roomNow.buzzerState.currentAnswerPlayerId !== botId) return;
      if (roomNow.buzzerState.roundNumber !== targetRound) return;

      const answerCorrectly = solution !== null && Math.random() < config.accuracy;
      const cards = answerCorrectly
        ? solution!.expr
        : _wrongAnswer(roomNow.buzzerState.publicCards);

      const answerResult = processBuzzerAnswer(roomNow, botId, cards);
      const updated = applyBuzzerRoomUpdate(
        answerResult.success ? answerResult.room : (answerResult as any).room,
      );
      if (!updated) return;

      if (answerResult.success) {
        // ── 答對 ──────────────────────────────────────────────────────────────
        io.to(roomId).emit(SocketEvent.BuzzerAnswerResult, {
          isCorrect: true,
          playerId: botId,
          scoreDelta: answerResult.scoreDelta,
          newScore: updated.players.find(p => p.id === botId)?.score ?? 0,
          streak: answerResult.streak,
          streakBonus: answerResult.streakBonus,
        });
        io.to(roomId).emit(SocketEvent.RoomUpdate, { room: updated });

        if (answerResult.winner) {
          const ranked = [...updated.players].sort((a, b) => b.score - a.score);
          io.to(roomId).emit(SocketEvent.BuzzerGameOver, { winner: answerResult.winner, players: ranked });
          setTimeout(() => {
            const idleRoom = endBuzzerGame(roomId);
            if (idleRoom) io.to(roomId).emit(SocketEvent.RoomUpdate, { room: idleRoom });
          }, 3000);
          return;
        }

        // 答對但未勝利：通知 index.ts 換新題（清計時器 + 1.5s 後啟動新回合）
        onCorrectAnswer(roomId);

      } else {
        // ── 答錯 ──────────────────────────────────────────────────────────────
        const failResult = answerResult as any;
        io.to(roomId).emit(SocketEvent.BuzzerAnswerResult, {
          isCorrect: false,
          playerId: botId,
          scoreDelta: failResult.scoreDelta ?? 0,
          newScore: updated.players.find(p => p.id === botId)?.score ?? 0,
          streak: 0,
          streakBonus: 0,
        });
        io.to(roomId).emit(SocketEvent.RoomUpdate, { room: updated });

        const ps2 = updated.buzzerState?.playerStates[botId];

        // 恢復回合倒數顯示（client side）
        setTimeout(() => {
          if (settings.roundSeconds !== null) {
            io.to(roomId).emit(SocketEvent.BuzzerRoundTimerResumed, {
              remainingSeconds: settings.roundSeconds - (updated.buzzerState?.roundTimerElapsed ?? 0),
            });
          }
        }, 1500);

        if (ps2?.isLocked && ps2.lockUntil) {
          io.to(roomId).emit(SocketEvent.BuzzerPlayerLocked, {
            playerId: botId,
            lockSeconds: settings.lockSeconds,
            lockUntil: ps2.lockUntil,
          });

          // 解鎖後決定是否重試
          setTimeout(() => {
            const r = getCurrentRoom(roomId);
            if (!r) return;
            const unlockedRoom = unlockPlayer(r, botId);
            applyBuzzerRoomUpdate(unlockedRoom);
            io.to(roomId).emit(SocketEvent.BuzzerPlayerUnlocked, { playerId: botId });

            if (Math.random() < config.retryChance) {
              const retryDelay = config.retryMinDelay + Math.random() * (config.retryMaxDelay - config.retryMinDelay);
              _scheduleAttempt(roomId, botId, botName, difficulty, solution, targetRound, retryDelay, io, onCorrectAnswer);
            }
          }, settings.lockSeconds * 1000);

        } else {
          // 無鎖定：直接重試
          if (Math.random() < config.retryChance) {
            const retryDelay = config.retryMinDelay + Math.random() * (config.retryMaxDelay - config.retryMinDelay);
            _scheduleAttempt(roomId, botId, botName, difficulty, solution, targetRound, retryDelay, io, onCorrectAnswer);
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
 * onCorrectAnswer：bot 答對（未勝利）時呼叫，由 index.ts 負責換新題。
 */
export function triggerBuzzerBot(
  roomId: string,
  io: Server,
  onCorrectAnswer: (roomId: string) => void,
) {
  const room = getCurrentRoom(roomId);
  if (!room || !room.buzzerState) return;

  const bots = room.players.filter(p => p.isBot);
  if (bots.length === 0) return;

  const publicCards = room.buzzerState.publicCards;
  const solution = solve24Cards(publicCards);
  const targetRound = room.buzzerState.roundNumber;

  for (const bot of bots) {
    const difficulty = (bot.botDifficulty ?? 'normal') as keyof typeof DIFFICULTY_CONFIG;
    const config = DIFFICULTY_CONFIG[difficulty];

    // 決定這回合是否出手（easy bot 有 40% 機率直接放棄）
    if (solution === null || Math.random() >= config.accuracy) continue;

    const delay = config.minDelay + Math.random() * (config.maxDelay - config.minDelay);
    _scheduleAttempt(roomId, bot.id, bot.name, difficulty, solution, targetRound, delay, io, onCorrectAnswer);
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
