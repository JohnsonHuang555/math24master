import { defineRouting } from 'next-intl/routing';
import { DEFAULT_LOCALE, ENABLED_LOCALES } from './locales';

export const routing = defineRouting({
  locales: ENABLED_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  // zh-TW 維持原網址，其他語系加前綴（/en、/zh-CN）
  localePrefix: 'as-needed',
  // 只有玩家看的語系和自動偵測結果不同（手動切換過）才會寫入；保留一年
  localeCookie: { name: 'NEXT_LOCALE', maxAge: 60 * 60 * 24 * 365 },
});
