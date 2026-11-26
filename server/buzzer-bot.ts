import { NumberCard } from '../models/Player';
import { DEFAULT_BUZZER_SETTINGS } from '../models/Room';
import { SelectedCard } from '../models/SelectedCard';
import { Symbol } from '../models/Symbol';
import { getCurrentRoom } from './game';

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
 * 電腦只負責「決定」：什麼時候搶、想多久、交什麼答案、答錯後要不要再試。
 * 搶答、作答倒數、交卷判定、鎖定與所有計時器都由 socket-server 用和真人相同的函式處理，
 * 所以電腦一樣受作答時限約束，計時器也跟著房間一起取消（換題、結束、刪房）。
 */
export type BuzzerBotHooks = {
  /** 用和真人相同的流程搶答；成功時回傳這次作答的編號（交卷時要帶上） */
  buzzIn: (roomId: string, botId: string) => { attempt: number } | null;
  /**
   * 交卷。編號不是目前這次作答（已超時、已換題、整局結束）就回 rejected，不會結算；
   * 同一題只會有一個有效作答者
   */
  submitAnswer: (
    roomId: string,
    botId: string,
    attempt: number,
    cards: SelectedCard[],
  ) => 'correct' | 'wrong' | 'rejected';
  /** 搶答與重試的等待：換題、結束、刪房時一起取消 */
  schedule: (roomId: string, ms: number, fn: () => void) => void;
  /** 搶到後的思考時間：作答結束（交卷、超時）、換題、結束、刪房時取消 */
  scheduleThink: (roomId: string, ms: number, fn: () => void) => void;
  /** 隨機數（測試可以固定） */
  random: () => number;
  /** 測試用：固定電腦的等待時間（毫秒）；正式環境不設，依難度隨機 */
  timing?: {
    attemptDelayMs?: number;
    thinkMs?: number;
    retryDelayMs?: number;
  };
};

type BotContext = {
  roomId: string;
  botId: string;
  difficulty: keyof typeof DIFFICULTY_CONFIG;
  solution: SolverResult;
  targetRound: number;
  hooks: BuzzerBotHooks;
};

/** 這一題還在進行、可以搶答（排程的動作執行時再確認一次，房間可能已經換題、結束或刪除） */
function _canStillBuzz(ctx: BotContext): boolean {
  const room = getCurrentRoom(ctx.roomId);
  const state = room?.buzzerState;
  if (!room || !state) return false;
  if (room.status !== 'playing' || room.isGameOver) return false;
  if (state.roundNumber !== ctx.targetRound || !state.roundOpen) return false;
  if (state.currentAnswerPlayerId !== null) return false;
  if (!room.players.some(p => p.id === ctx.botId)) return false;
  return !state.playerStates[ctx.botId]?.isLocked;
}

function _scheduleAttempt(ctx: BotContext, delay: number) {
  const { hooks } = ctx;
  const config = DIFFICULTY_CONFIG[ctx.difficulty];

  hooks.schedule(ctx.roomId, delay, () => {
    if (!_canStillBuzz(ctx)) return;
    const buzz = hooks.buzzIn(ctx.roomId, ctx.botId);
    if (!buzz) return;

    // 模擬「思考 + 輸入」時間後交卷；超過作答時限的話伺服器會先判定超時並取消這個計時
    const thinkTime = hooks.timing?.thinkMs ?? 1500 + hooks.random() * 2000;
    hooks.scheduleThink(ctx.roomId, thinkTime, () => {
      const room = getCurrentRoom(ctx.roomId);
      if (!room?.buzzerState) return;
      const answerCorrectly =
        ctx.solution !== null && hooks.random() < config.accuracy;
      const cards = answerCorrectly
        ? ctx.solution!.expr
        : _wrongAnswer(room.buzzerState.publicCards);

      const outcome = hooks.submitAnswer(
        ctx.roomId,
        ctx.botId,
        buzz.attempt,
        cards,
      );
      if (outcome !== 'wrong') return;

      // 答錯：要不要再試一次。被鎖定的話等解鎖（伺服器的鎖定計時）之後再等一下
      if (hooks.random() >= config.retryChance) return;
      const retryDelay =
        hooks.timing?.retryDelayMs ??
        config.retryMinDelay +
          hooks.random() * (config.retryMaxDelay - config.retryMinDelay);
      const after = getCurrentRoom(ctx.roomId);
      const lock = after?.buzzerState?.playerStates[ctx.botId];
      const settings =
        after?.settings.buzzerSettings ?? DEFAULT_BUZZER_SETTINGS;
      const lockWait = lock?.isLocked ? settings.lockSeconds * 1000 : 0;
      _scheduleAttempt(ctx, lockWait + retryDelay);
    });
  });
}

// ── 公開入口 ─────────────────────────────────────────────────────────────────

/**
 * 每題開放搶答後呼叫一次。
 * 找出所有 bot，依照難度決定是否及何時搶答。
 */
export function triggerBuzzerBot(roomId: string, hooks: BuzzerBotHooks) {
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
    if (solution === null || hooks.random() >= config.accuracy) continue;

    const delay =
      hooks.timing?.attemptDelayMs ??
      config.minDelay + hooks.random() * (config.maxDelay - config.minDelay);
    _scheduleAttempt(
      { roomId, botId: bot.id, difficulty, solution, targetRound, hooks },
      delay,
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
