import { getTaipeiDateString } from '@/lib/date';

// 牌桌模式測試期：這天（台灣時間）會清空牌桌排行榜。過了這天提示自動隱藏
export const TABLETOP_LEADERBOARD_RESET_DATE = '2026-11-07';

/** 重置日之前回傳測試版提示文字，當天與之後回傳 null；today 為台灣時區的 YYYY-MM-DD */
export function tabletopBetaNotice(
  today: string = getTaipeiDateString(),
): string | null {
  if (today >= TABLETOP_LEADERBOARD_RESET_DATE) return null;
  const displayDate = TABLETOP_LEADERBOARD_RESET_DATE.replaceAll('-', '/');
  return `測試版：排行榜將於 ${displayDate} 重置`;
}
