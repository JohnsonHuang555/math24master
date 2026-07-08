/**
 * 每日挑戰的「一天」以台灣時區（Asia/Taipei, UTC+8）為界，
 * client 與 server（API route）共用，確保全球玩家同日拿到相同題目、
 * 排行榜在同一時間點重置。
 */
const TAIPEI_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Taipei',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** 回傳台灣時區的 YYYY-MM-DD；offsetDays 可取前後幾天（如 -1 為昨天） */
export function getTaipeiDateString(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return TAIPEI_FORMATTER.format(d);
}

const DATE_STRING_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 每日排行榜可查詢範圍：今天 ~ 前 6 天（含） */
export function isValidDailyLeaderboardDate(date: string): boolean {
  if (!DATE_STRING_RE.test(date)) return false;
  return date >= getTaipeiDateString(-6) && date <= getTaipeiDateString(0);
}

/** 每日排行榜日期選單的顯示文字：今天 / 昨天 / MM/DD */
export function getTaipeiDayLabel(offsetDays: number): string {
  if (offsetDays === 0) return '今天';
  if (offsetDays === -1) return '昨天';
  const [, month, day] = getTaipeiDateString(offsetDays).split('-');
  return `${Number(month)}/${Number(day)}`;
}
