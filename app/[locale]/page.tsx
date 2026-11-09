import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Homepage from '@/components/homepage';
import MainLayout from '@/components/layouts/main-layout';
import { HTML_LANG } from '@/i18n/locales';
import { resolveLocale } from '@/i18n/page-metadata';
import { localizedUrl, pageMetadata } from '@/i18n/seo';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return pageMetadata({
    locale,
    path: '/',
    title: t('home.title'),
    description: t('home.description'),
    siteName: t('siteName'),
  });
}

export default async function Home({ params }: PageProps<'/[locale]'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  const jsonLdVideoGame = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: t('siteName'),
    alternateName: ['24點大師', 'Math24 Master', '24點', '24 Game'],
    description: t('home.gameDescription'),
    url: localizedUrl(locale, '/'),
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web Browser',
    inLanguage: HTML_LANG[locale],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  const faq = (['what', 'rules', 'how'] as const).map(key => ({
    '@type': 'Question',
    name: t(`home.faq.${key}Question`),
    acceptedAnswer: {
      '@type': 'Answer',
      text: t(`home.faq.${key}Answer`),
    },
  }));
  const jsonLdFaq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdVideoGame) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />
      <MainLayout>
        <Homepage />
      </MainLayout>
    </>
  );
}
