import { getTaipeiDateString } from '@/lib/date';

// 牌桌模式測試期：這天（台灣時間）會清空牌桌排行榜。過了這天提示自動隱藏
export const TABLETOP_LEADERBOARD_RESET_DATE = '2026-11-07';

/** 重置日之前回傳 true，當天與之後回傳 false；today 為台灣時區的 YYYY-MM-DD */
export function isTabletopBeta(today: string = getTaipeiDateString()): boolean {
  return today < TABLETOP_LEADERBOARD_RESET_DATE;
}
