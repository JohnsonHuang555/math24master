import type { LeaderboardMode } from '@/lib/leaderboard';

export type Mode = LeaderboardMode;

export const COLLECTION: Record<Mode, string> = {
  challenge: 'leaderboard_challenge',
  classic: 'leaderboard_classic',
  quickmath: 'leaderboard_quickmath',
  // 進階模式獨立 collection，理由見 docs/adr/0003-advanced-mode-separate-leaderboard-collection.md
  quickmath_advanced: 'leaderboard_quickmath_advanced',
  match: 'leaderboard_matching',
};

export const ORDER_FIELD: Record<Mode, string> = {
  challenge: 'stage',
  classic: 'score',
  quickmath: 'seconds',
  quickmath_advanced: 'seconds',
  match: 'score',
};

export const ORDER_DIR: Record<Mode, FirebaseFirestore.OrderByDirection> = {
  challenge: 'desc',
  classic: 'desc',
  quickmath: 'asc',
  quickmath_advanced: 'asc',
  match: 'desc',
};

// 分數為 0 視同沒有實質成績，排行榜顯示時濾掉（資料庫仍正常寫入）
// quickmath / quickmath_advanced 是完成時間制，沒有「0 分」的概念，不列入
export const ZERO_FILTER_FIELD: Partial<Record<Mode, string>> = {
  classic: 'score',
  challenge: 'totalScore',
  match: 'score',
};

export const GUEST_ID_RE =
  /^guest_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isValidMode(mode: string | null | undefined): mode is Mode {
  return !!mode && Object.prototype.hasOwnProperty.call(COLLECTION, mode);
}

export function hasZeroScore(mode: Mode, data: Record<string, unknown>) {
  const zeroField = ZERO_FILTER_FIELD[mode];
  return !!zeroField && Number(data[zeroField] ?? 0) === 0;
}
