import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './locales';

/**
 * 已經翻譯完成的頁面（不含語系前綴）。其餘頁面在 zh-TW 以外的語系仍顯示中文，
 * proxy 會加上 X-Robots-Tag: noindex，避免搜尋引擎收錄半中半英的頁面（見 docs/adr/0008）。
 * 每翻完一個模式就把它的路徑加進來。
 */
const TRANSLATED_PATHS = ['/', '/leaderboard'];

/** 網址路徑在搜尋引擎眼中是否還沒翻譯完（只針對非預設語系的網址） */
export function isUntranslatedPage(pathname: string): boolean {
  const [, first, ...rest] = pathname.split('/');
  const locale = SUPPORTED_LOCALES.find(l => l === first);
  if (!locale || locale === DEFAULT_LOCALE) return false;

  const path = `/${rest.join('/')}`.replace(/\/$/, '') || '/';
  return !TRANSLATED_PATHS.includes(path);
}
