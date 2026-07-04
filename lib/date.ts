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
