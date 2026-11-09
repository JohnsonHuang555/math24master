import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { DEFAULT_LOCALE, type Locale } from './locales';
import { routing } from './routing';
import { breadcrumbJsonLd, pageMetadata } from './seo';

/** 有獨立 metadata 文案的子頁（messages 的 Metadata.<key>） */
type PageKey =
  | 'singlePlay'
  | 'multiplePlay'
  | 'dailyChallenge'
  | 'quickMath'
  | 'guessNumber'
  | 'leaderboard';

type LocaleParams = { params: Promise<{ locale: string }> };

export async function resolveLocale(
  params: LocaleParams['params'],
): Promise<Locale> {
  const { locale } = await params;
  return hasLocale(routing.locales, locale) ? locale : DEFAULT_LOCALE;
}

/** 產生子頁 layout 的 generateMetadata，title／description 依語系取 messages */
export function createPageMetadata(page: PageKey, path: string) {
  return async function generateMetadata({
    params,
  }: LocaleParams): Promise<Metadata> {
    const locale = await resolveLocale(params);
    const t = await getTranslations({ locale, namespace: 'Metadata' });
    return pageMetadata({
      locale,
      path,
      title: t(`${page}.title`),
      description: t(`${page}.description`),
      siteName: t('siteName'),
    });
  };
}

/** 子頁的麵包屑結構化資料（首頁 → 目前頁面） */
export async function PageBreadcrumb({
  locale,
  page,
  path,
}: {
  locale: Locale;
  page: PageKey;
  path: string;
}) {
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  const jsonLd = breadcrumbJsonLd({
    locale,
    path,
    homeName: t('breadcrumbHome'),
    pageName: t(`${page}.name`),
  });
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
