import { MetadataRoute } from 'next';
import { DEFAULT_LOCALE, ENABLED_LOCALES } from '@/i18n/locales';
import { hreflangMap, localizedUrl } from '@/i18n/seo';
import { isTranslatedPath } from '@/i18n/translated-paths';

type SitemapEntry = MetadataRoute.Sitemap[number];

const PAGES: {
  path: string;
  changeFrequency: SitemapEntry['changeFrequency'];
  priority: number;
}[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/single-play', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/daily-challenge', changeFrequency: 'daily', priority: 0.85 },
  { path: '/multiple-play', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/guess-number', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/quick-math', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/leaderboard', changeFrequency: 'daily', priority: 0.7 },
];

/**
 * zh-TW 列出所有頁面；其他語系只列已翻譯完成的頁面，並標上 hreflang（見 docs/adr/0008）。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap(({ path, changeFrequency, priority }) => {
    if (!isTranslatedPath(path)) {
      return [
        { url: localizedUrl(DEFAULT_LOCALE, path), changeFrequency, priority },
      ];
    }
    const languages = hreflangMap(path);
    return ENABLED_LOCALES.map(locale => ({
      url: localizedUrl(locale, path),
      changeFrequency,
      priority,
      alternates: { languages },
    }));
  });
}
