import type messages from '@/messages/zh-TW.json';
import type { routing } from './routing';

// 讓 useTranslations / getTranslations 的 key 與 useLocale 的回傳值有型別檢查
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
