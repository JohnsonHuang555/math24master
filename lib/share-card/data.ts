import type { AnalyticsGameMode } from '@/lib/analytics';
import type { RoundResult } from '@/models/Player';

/** 圖卡頁尾顯示的網址（只顯示網域，不帶追蹤參數） */
export const SHARE_SITE = 'math24master.com';

/** 從顯示用算式（例如「4×6×(5÷5)」）依序取出用到的牌 */
export function cardsInFormula(formula: string): number[] {
  return (formula.match(/\d+/g) ?? []).map(Number);
}

/** 經典模式本局最高分的一手；同分取較早的一手，沒有出牌紀錄時回傳 undefined */
export function bestHandOf(
  rounds: Pick<RoundResult, 'playerFormula' | 'playerScore'>[],
): { cards: number[]; formula: string; score: number } | undefined {
  let best: (typeof rounds)[number] | undefined;
  for (const round of rounds) {
    if (!best || round.playerScore > best.playerScore) best = round;
  }
  if (!best) return undefined;
  return {
    cards: cardsInFormula(best.playerFormula),
    formula: best.playerFormula,
    score: best.playerScore,
  };
}

/**
 * 分享連結：帶 utm 參數，GA4 會自動把點進來的工作階段歸到「分享圖卡」來源，
 * 不需要另外的事件或資料庫
 */
export function shareLinkFor(
  origin: string,
  pathname: string,
  mode: AnalyticsGameMode,
): string {
  const url = new URL(pathname, origin);
  url.searchParams.set('utm_source', 'share');
  url.searchParams.set('utm_medium', 'result_card');
  url.searchParams.set('utm_campaign', mode);
  return url.toString();
}

/** 圖卡上的日期，依語系格式化（zh-TW：2026/11/19；en：11/19/2026） */
export function formatCardDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * 「個人最高 {score} 分」這類句子拆成數字前後兩段，讓數字可以換字型繪製。
 * 用一個不會出現在文案裡的佔位字元帶入，再切開
 */
export function splitAroundValue(
  format: (placeholder: string) => string,
): [string, string] {
  const marker = '\u0000';
  const [before = '', after = ''] = format(marker).split(marker);
  return [before, after];
}

/**
 * 分享文字加上網址：網址放在最後一行。
 * 文案最後一行若只是裸網域（例如每日挑戰的「math24master.com」），換成帶 utm 的完整網址，避免重複
 */
export function composeShareText(text: string, url: string): string {
  if (!url) return text;
  const lines = text.split('\n');
  if (lines[lines.length - 1]?.trim() === SHARE_SITE) lines.pop();
  return [...lines, url].join('\n');
}

/** 每局結算的唯一 id，用來區分「同一局重開預覽」與「另一局剛好同分」 */
export function createResultId(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function')
    return cryptoApi.randomUUID();
  // 非安全來源（例如區網 http）沒有 randomUUID
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
