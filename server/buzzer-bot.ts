import { Server } from 'socket.io';
import { NumberCard } from '../models/Player';
import { DEFAULT_BUZZER_SETTINGS, Room } from '../models/Room';
import { SelectedCard } from '../models/SelectedCard';
import { Symbol } from '../models/Symbol';
import { applyBuzzerRoomUpdate, getCurrentRoom } from './game';
import { processBuzzIn, processBuzzerAnswer } from './buzzer';
import { SocketEvent } from '../models/SocketEvent';

// ── 24 點 Solver ─────────────────────────────────────────────────────────────

type SolverResult = { expr: SelectedCard[] } | null;

const OPS: { symbol: Symbol; fn: (a: number, b: number) => number | null }[] = [
  { symbol: Symbol.Plus,   fn: (a, b) => a + b },
  { symbol: Symbol.Minus,  fn: (a, b) => a - b },
  { symbol: Symbol.Times,  fn: (a, b) => a * b },
  { symbol: Symbol.Divide, fn: (a, b) => (Math.abs(b) > 1e-8 ? a / b : null) },
];

/** 窮舉 2 張牌 + 運算子，回傳算式（SelectedCard[]）或 null */
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
        // 建立虛擬合併牌繼續搜尋
        const merged: NumberCard = { id: `${a.id}_${b.id}`, value: c };
        const subResult = solve24Cards([...remaining, merged]);
        if (!subResult) continue;

        // 將 merged 替換回 (a op b) 或 (a op b) 需括號
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

const DIFFICULTY_CONFIG = {
  easy:   { minDelay: 4000, maxDelay: 8000, accuracy: 0.60 },
  normal: { minDelay: 2000, maxDelay: 5000, accuracy: 0.85 },
  hard:   { minDelay: 800,  maxDelay: 2000, accuracy: 0.98 },
} as const;

// ── 公開入口 ─────────────────────────────────────────────────────────────────

/**
 * 每回合開始後呼叫一次。
 * 找出所有 bot，依照難度決定是否及何時搶答。
 */
export function triggerBuzzerBot(roomId: string, io: Server) {
  const room = getCurrentRoom(roomId);
  if (!room || !room.buzzerState) return;

  const bots = room.players.filter(p => p.isBot);
  if (bots.length === 0) return;

  const publicCards = room.buzzerState.publicCards;
  const solution = solve24Cards(publicCards);

  for (const bot of bots) {
    const difficulty = (bot.botDifficulty ?? 'normal') as keyof typeof DIFFICULTY_CONFIG;
    const config = DIFFICULTY_CONFIG[difficulty];

    // 確認是否搶答（hard bot 幾乎都搶，easy bot 有可能放棄）
    const willBuzz = solution !== null && Math.random() < config.accuracy;
    if (!willBuzz) continue;

    const delay = config.minDelay + Math.random() * (config.maxDelay - config.minDelay);

    setTimeout(() => {
      const currentRoom = getCurrentRoom(roomId);
      if (!currentRoom?.buzzerState) return;
      // 若已有人在作答，bot 跳過
      if (currentRoom.buzzerState.currentAnswerPlayerId !== null) return;
      // 若 bot 被鎖定，跳過
      const ps = currentRoom.buzzerState.playerStates[bot.id];
      if (ps?.isLocked) return;

      const buzzResult = processBuzzIn(currentRoom, bot.id);
      if (!buzzResult.success) return;

      const afterBuzz = applyBuzzerRoomUpdate(buzzResult.room);
      if (!afterBuzz) return;

      const settings = afterBuzz.settings.buzzerSettings ?? DEFAULT_BUZZER_SETTINGS;

      io.to(roomId).emit(SocketEvent.BuzzerBuzzInSuccess, {
        playerId: bot.id,
        playerName: bot.name,
        answerSeconds: settings.answerSeconds,
      });
      io.to(roomId).emit(SocketEvent.BuzzerRoundTimerPaused, {
        elapsedSeconds: afterBuzz.buzzerState!.roundTimerElapsed,
      });

      // 模擬「思考 + 輸入」時間後提交答案
      const thinkTime = 1500 + Math.random() * 2000;
      setTimeout(() => {
        const roomBeforeAnswer = getCurrentRoom(roomId);
        if (!roomBeforeAnswer?.buzzerState) return;
        if (roomBeforeAnswer.buzzerState.currentAnswerPlayerId !== bot.id) return;

        // 決定是否答對（easy bot 有機率答錯）
        const answerCorrectly = solution && Math.random() < config.accuracy;
        const cards = answerCorrectly ? solution!.expr : _wrongAnswer(roomBeforeAnswer.buzzerState.publicCards);

        const answerResult = processBuzzerAnswer(roomBeforeAnswer, bot.id, cards);
        const updated = applyBuzzerRoomUpdate(
          answerResult.success ? answerResult.room : (answerResult as any).room,
        );
        if (!updated) return;

        if (answerResult.success) {
          io.to(roomId).emit(SocketEvent.BuzzerAnswerResult, {
            isCorrect: true,
            playerId: bot.id,
            scoreDelta: answerResult.scoreDelta,
            newScore: updated.players.find(p => p.id === bot.id)?.score ?? 0,
            streak: answerResult.streak,
            streakBonus: answerResult.streakBonus,
          });

          if (answerResult.winner) {
            const ranked = [...updated.players].sort((a, b) => b.score - a.score);
            io.to(roomId).emit(SocketEvent.BuzzerGameOver, { winner: answerResult.winner, players: ranked });
            return;
          }

          setTimeout(() => {
            if (settings.roundSeconds !== null) {
              // 恢復回合計時（由 index.ts 的 _resumeBuzzerRoundTimer 管理，這裡只通知）
              io.to(roomId).emit(SocketEvent.BuzzerRoundTimerResumed, {
                remainingSeconds: settings.roundSeconds - (updated.buzzerState?.roundTimerElapsed ?? 0),
              });
            }
          }, 1500);

        } else {
          const failResult = answerResult as any;
          io.to(roomId).emit(SocketEvent.BuzzerAnswerResult, {
            isCorrect: false,
            playerId: bot.id,
            scoreDelta: failResult.scoreDelta ?? 0,
            newScore: updated.players.find(p => p.id === bot.id)?.score ?? 0,
            streak: 0,
            streakBonus: 0,
          });

          const ps2 = updated.buzzerState?.playerStates[bot.id];
          if (ps2?.isLocked && ps2.lockUntil) {
            io.to(roomId).emit(SocketEvent.BuzzerPlayerLocked, {
              playerId: bot.id,
              lockSeconds: settings.lockSeconds,
              lockUntil: ps2.lockUntil,
            });
            setTimeout(() => {
              const r = getCurrentRoom(roomId);
              if (r) {
                const { unlockPlayer } = require('./buzzer');
                const unlockedRoom = unlockPlayer(r, bot.id);
                applyBuzzerRoomUpdate(unlockedRoom);
                io.to(roomId).emit(SocketEvent.BuzzerPlayerUnlocked, { playerId: bot.id });
              }
            }, settings.lockSeconds * 1000);
          }

          setTimeout(() => {
            if (settings.roundSeconds !== null) {
              io.to(roomId).emit(SocketEvent.BuzzerRoundTimerResumed, {
                remainingSeconds: settings.roundSeconds - (updated.buzzerState?.roundTimerElapsed ?? 0),
              });
            }
          }, 1500);
        }
      }, thinkTime);
    }, delay);
  }
}

/** 產生一組一定答錯的算式（直接把第一個數字提交，答案不是 24） */
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
