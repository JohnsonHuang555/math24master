import type { Metadata } from 'next';
import { DEFAULT_LOCALE, ENABLED_LOCALES, type Locale } from './locales';
import { isTranslatedPath } from './translated-paths';

export const SITE_URL = 'https://math24master.com';

const SHARE_IMAGE = {
  url: `${SITE_URL}/logo.webp`,
  width: 1571,
  height: 412,
};

/** Open Graph 的 og:locale 格式（語言_地區） */
const OG_LOCALE: Record<Locale, string> = {
  'zh-TW': 'zh_TW',
  en: 'en_US',
  'zh-CN': 'zh_CN',
};

/** 某語系版本的完整網址；zh-TW 不加前綴（見 docs/adr/0008） */
export function localizedUrl(locale: Locale, path: string): string {
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  const suffix = path === '/' ? '' : path;
  return `${SITE_URL}${prefix}${suffix}` || SITE_URL;
}

/**
 * 頁面的 canonical 與 hreflang。
 * 已翻譯的頁面：每個語系的 canonical 指向自己，並互相標上 hreflang。
 * 還沒翻譯的頁面：非 zh-TW 版本內容仍是中文（proxy 會加 noindex），canonical 一律指向 zh-TW，不標 hreflang。
 */
export function pageAlternates(
  locale: Locale,
  path: string,
): NonNullable<Metadata['alternates']> {
  const canonical = canonicalUrl(locale, path);
  return isTranslatedPath(path)
    ? { canonical, languages: hreflangMap(path) }
    : { canonical };
}

function canonicalUrl(locale: Locale, path: string): string {
  return localizedUrl(isTranslatedPath(path) ? locale : DEFAULT_LOCALE, path);
}

/** 已翻譯頁面在各語系的網址，外加 x-default（指向 zh-TW） */
export function hreflangMap(path: string): Record<string, string> {
  return {
    ...Object.fromEntries(ENABLED_LOCALES.map(l => [l, localizedUrl(l, path)])),
    'x-default': localizedUrl(DEFAULT_LOCALE, path),
  };
}

/** 各頁共用的 metadata：title、description、canonical／hreflang 與社群分享卡片 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  siteName,
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  siteName: string;
}): Metadata {
  const alternates = pageAlternates(locale, path);
  // Next.js 的 metadata 是淺層合併，頁面的 openGraph／twitter 會整個蓋掉 layout 的，所以圖片要在這裡帶上
  const image = { ...SHARE_IMAGE, alt: siteName };
  return {
    title,
    description,
    alternates,
    openGraph: {
      type: 'website',
      title,
      description,
      url: canonicalUrl(locale, path),
      siteName,
      locale: OG_LOCALE[locale],
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image.url],
    },
  };
}

/** 麵包屑結構化資料（首頁 → 目前頁面） */
export function breadcrumbJsonLd({
  locale,
  path,
  homeName,
  pageName,
}: {
  locale: Locale;
  path: string;
  homeName: string;
  pageName: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: homeName,
        item: localizedUrl(locale, '/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: pageName,
        item: localizedUrl(locale, path),
      },
    ],
  };
}
