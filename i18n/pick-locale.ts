import { DEFAULT_LOCALE, type Locale } from './locales';

/**
 * 依 `Accept-Language` 決定第一次造訪的玩家該看哪個語系。
 *
 * - 沒有標頭（如搜尋引擎爬蟲）→ 預設語系
 * - 依權重由高到低，取第一個支援的語言：
 *   繁體（zh-TW、zh-HK、zh-MO、zh-Hant、單獨的 zh）→ zh-TW；
 *   簡體（zh-CN、zh-SG、zh-Hans）→ zh-CN；en-* → en
 * - 一個支援的語言都沒有 → en
 *
 * 結果不在 `enabled` 裡時退回預設語系。
 */
export function pickLocale(
  acceptLanguage: string | null | undefined,
  enabled: readonly Locale[],
): Locale {
  if (!acceptLanguage?.trim()) return DEFAULT_LOCALE;

  const tags = parseAcceptLanguage(acceptLanguage);
  const picked = tags.map(toSupportedLocale).find(l => l !== null) ?? 'en';

  return enabled.includes(picked) ? picked : DEFAULT_LOCALE;
}

function parseAcceptLanguage(header: string): string[] {
  return header
    .split(',')
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.map(p => p.trim()).find(p => p.startsWith('q='));
      const weight = q ? Number(q.slice(2)) : 1;
      return {
        tag: tag.trim().toLowerCase(),
        weight: Number.isNaN(weight) ? 0 : weight,
        index,
      };
    })
    .filter(({ tag, weight }) => tag && tag !== '*' && weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index)
    .map(({ tag }) => tag);
}

function toSupportedLocale(tag: string): Locale | null {
  const [language, ...subtags] = tag.split('-');

  if (language === 'en') return 'en';
  if (language !== 'zh') return null;

  if (subtags.includes('hans')) return 'zh-CN';
  if (subtags.includes('hant')) return 'zh-TW';
  if (subtags.includes('cn') || subtags.includes('sg')) return 'zh-CN';
  return 'zh-TW';
}
