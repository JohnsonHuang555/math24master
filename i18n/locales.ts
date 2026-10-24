// 所有語系（翻譯檔、字型都以此為準）與目前對玩家開放的語系。
// 開放新語系時只需要把它加進 ENABLED_LOCALES；見 docs/adr/0008。
export const SUPPORTED_LOCALES = ['zh-TW', 'en', 'zh-CN'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE = 'zh-TW' satisfies Locale;

export const ENABLED_LOCALES = ['zh-TW'] as const satisfies readonly Locale[];

/** 語言切換器上顯示的名稱，一律用該語言自己的寫法 */
export const LOCALE_LABELS: Record<Locale, string> = {
  'zh-TW': '繁體中文',
  en: 'English',
  'zh-CN': '简体中文',
};

/** `<html lang>` 與 Open Graph 使用的語言代碼 */
export const HTML_LANG: Record<Locale, string> = {
  'zh-TW': 'zh-Hant-TW',
  en: 'en',
  'zh-CN': 'zh-Hans-CN',
};
