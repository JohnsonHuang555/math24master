import type { LeaderboardMode } from '@/lib/leaderboard';

export type Mode = LeaderboardMode;

export const COLLECTION: Record<Mode, string> = {
  challenge: 'leaderboard_challenge',
  classic: 'leaderboard_classic',
  quickmath: 'leaderboard_quickmath',
  // 進階模式獨立 collection，理由見 docs/adr/0003-advanced-mode-separate-leaderboard-collection.md
  quickmath_advanced: 'leaderboard_quickmath_advanced',
  match: 'leaderboard_matching',
  // 牌桌模式只剩一種難度，沿用原本困難的 collection（見 docs/adr/0010）
  tabletop_hard: 'leaderboard_tabletop_hard',
};

export const ORDER_FIELD: Record<Mode, string> = {
  challenge: 'stage',
  classic: 'score',
  quickmath: 'seconds',
  quickmath_advanced: 'seconds',
  match: 'score',
  tabletop_hard: 'score',
};

export const ORDER_DIR: Record<Mode, FirebaseFirestore.OrderByDirection> = {
  challenge: 'desc',
  classic: 'desc',
  quickmath: 'asc',
  quickmath_advanced: 'asc',
  match: 'desc',
  tabletop_hard: 'desc',
};

// 分數為 0 視同沒有實質成績，排行榜顯示時濾掉（資料庫仍正常寫入）
// quickmath / quickmath_advanced 是完成時間制，沒有「0 分」的概念，不列入
export const ZERO_FILTER_FIELD: Partial<Record<Mode, string>> = {
  classic: 'score',
  challenge: 'totalScore',
  match: 'score',
  tabletop_hard: 'score',
};

// 以單一 score 欄位比高低（越高越好）的模式，以及各自的單局理論上限（擋掉明顯造假的成績）
export const SCORE_MAX: Partial<Record<Mode, number>> = {
  // 牌庫 24 張 / 每手 4 張 = 6 手，每手最高 11 分（見 lib/classic-single-play-engine.ts 的 updateScore）
  classic: 66,
  // 16 張拆成 4 組各 4 張，每組理論最高 10 分（連三個除號：3+3+3+1）
  match: 40,
  // 回合得分只算桌面總分超過本局最高紀錄的部分，所以整局得分 ≤ 桌面最高總分 + 保底。
  // 106 張牌最多約 21 組 × 每組 30 分 ≈ 640，加上保底（最多 86 張 × 1）與出完加分 10，約 736
  // （見 docs/adr/0010-tabletop-score-table-gain.md）
  tabletop_hard: 750,
};

export function isScoreMode(mode: Mode): boolean {
  return SCORE_MAX[mode] !== undefined;
}

export const GUEST_ID_RE =
  /^guest_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isValidMode(mode: string | null | undefined): mode is Mode {
  return !!mode && Object.prototype.hasOwnProperty.call(COLLECTION, mode);
}

export function hasZeroScore(mode: Mode, data: Record<string, unknown>) {
  const zeroField = ZERO_FILTER_FIELD[mode];
  return !!zeroField && Number(data[zeroField] ?? 0) === 0;
}

function isQuickMathMode(mode: Mode): boolean {
  return mode === 'quickmath' || mode === 'quickmath_advanced';
}

/**
 * 時間合理性檢查（見 docs/adr/0011）。門檻刻意放寬，只擋物理上不可能的成績，
 * 不要誤擋手速很快的真人玩家：
 * - 經典：每拿下一手至少要幾秒（組算式 + 計分動畫約 1.5 秒），一手最多 11 分
 * - 挑戰：每過一關至少要幾秒；隨時可以提前結算，所以第 1 關不限時間
 * - 消消樂、牌桌：有得分就至少要玩幾秒
 * - 快答：回報的完成時間不能比 server 看到的實際經過時間還長（容許少量時鐘誤差）
 */
export const MIN_SECONDS = {
  classicPerHand: 3,
  classicPointsPerHand: 11,
  challengePerStage: 1.5,
  match: 8,
  tabletop: 10,
  quickMathClockTolerance: 3,
} as const;

export type ResultCheck =
  | { ok: true; payload: Record<string, number> }
  | { ok: false; reason: 'invalid_score' | 'too_fast' };

/** 檢查一局的成績：數值範圍，以及開局到結束的實際經過時間是否合理 */
export function checkResult(
  mode: Mode,
  payload: Record<string, unknown>,
  elapsedSeconds: number,
): ResultCheck {
  const invalid = { ok: false, reason: 'invalid_score' } as const;
  const tooFast = { ok: false, reason: 'too_fast' } as const;

  if (mode === 'challenge') {
    if (typeof payload.stage !== 'number') return invalid;
    const stage = payload.stage;
    const totalScore = Number(payload.totalScore ?? 0);
    if (!Number.isInteger(stage) || stage < 1 || stage > 500) return invalid;
    if (!Number.isFinite(totalScore) || totalScore < 0) return invalid;
    if (elapsedSeconds < (stage - 1) * MIN_SECONDS.challengePerStage) {
      return tooFast;
    }
    return { ok: true, payload: { stage, totalScore } };
  }

  if (isQuickMathMode(mode)) {
    const seconds = payload.seconds;
    if (
      typeof seconds !== 'number' ||
      !Number.isFinite(seconds) ||
      seconds < 10 ||
      seconds > 300
    ) {
      return invalid;
    }
    if (seconds > elapsedSeconds + MIN_SECONDS.quickMathClockTolerance) {
      return tooFast;
    }
    return { ok: true, payload: { seconds: Math.round(seconds * 10) / 10 } };
  }

  // 以單一 score 比高低的模式（經典、消消樂、牌桌）
  const score = payload.score;
  const max = SCORE_MAX[mode];
  if (max === undefined) return invalid;
  // 各模式的分數都是整數
  if (typeof score !== 'number' || !Number.isInteger(score)) return invalid;
  if (score < 0 || score > max) return invalid;
  if (score > 0) {
    const minSeconds =
      mode === 'classic'
        ? Math.ceil(score / MIN_SECONDS.classicPointsPerHand) *
          MIN_SECONDS.classicPerHand
        : mode === 'match'
          ? MIN_SECONDS.match
          : MIN_SECONDS.tabletop;
    if (elapsedSeconds < minSeconds) return tooFast;
  }
  return { ok: true, payload: { score } };
}
