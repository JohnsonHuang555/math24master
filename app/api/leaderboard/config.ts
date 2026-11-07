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
