import {
  Baloo_2,
  Figtree,
  Noto_Sans,
  Noto_Sans_SC,
  Noto_Sans_TC,
} from 'next/font/google';
import { notFound } from 'next/navigation';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AchievementToaster } from '@/components/achievement-toaster';
import { GoogleAnalytics } from '@/components/analytics';
import { GuestKeyRegistrar } from '@/components/guest-key-registrar';
import { PendingScoreSubmitter } from '@/components/pending-score-submitter';
import { SessionProvider } from '@/components/session-provider';
import { Toaster } from '@/components/ui/sonner';
import { HTML_LANG } from '@/i18n/locales';
import { resolveLocale } from '@/i18n/page-metadata';
import { routing } from '@/i18n/routing';
import { SITE_URL } from '@/i18n/seo';
import { cn } from '@/lib/utils';
import { AlertDialogStoreProvider } from '@/providers/alert-dialog-store-provider';
import '../globals.css';

// 內文字型依語系切換，三者共用 --font-noto-sans：簡中字形與繁中不同，英文不需要載入 CJK 字型
const fontNotoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans',
  preload: true,
});

const fontNotoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans',
  preload: false,
});

const fontNotoSans = Noto_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans',
  preload: false,
});

const BODY_FONT = {
  'zh-TW': fontNotoSansTC,
  en: fontNotoSans,
  'zh-CN': fontNotoSansSC,
};

// 介面文字的拉丁字元與數字；CJK 落到上面依語系載入的 Noto Sans
const fontFigtree = Figtree({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-figtree',
  weight: ['400', '500', '600', '700', '800'],
});

// 展示字體：圓潤厚實，用於數字牌與大標題（拉丁字元／數字），中文自動 fallback 到 Noto Sans TC
const fontBaloo = Baloo_2({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-baloo',
  weight: ['500', '600', '700', '800'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0d9488',
};

// 各頁的 title、description、canonical 與分享卡片由頁面自己的 generateMetadata 提供（見 i18n/seo.ts）
export async function generateMetadata({
  params,
}: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  const siteName = t('siteName');
  return {
    ...baseMetadata,
    applicationName: siteName,
    appleWebApp: { ...baseMetadata.appleWebApp, title: siteName },
  };
}

const baseMetadata = {
  metadataBase: new URL(SITE_URL),
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
    googleBot: 'index, follow',
  },
  manifest: '/manifest.json',
  icons: {
    apple: '/icons/icon-192.png',
  },
  appleWebApp: {
    statusBarStyle: 'default',
    capable: true,
  },
} satisfies Metadata;

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={HTML_LANG[locale]}>
      <body
        className={cn(
          'relative h-dvh font-noto antialiased',
          BODY_FONT[locale].variable,
          fontFigtree.variable,
          fontBaloo.variable,
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-[#f3faf8] bg-[radial-gradient(42rem_42rem_at_115%_-12%,rgba(13,148,136,0.10),transparent_70%),radial-gradient(34rem_34rem_at_-12%_112%,rgba(245,158,11,0.08),transparent_70%)] dark:bg-zinc-950 dark:bg-[radial-gradient(42rem_42rem_at_115%_-12%,rgba(45,212,191,0.07),transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-[url('/b2.webp')] bg-cover bg-center opacity-[0.18] dark:opacity-[0.07]"
        />
        <GoogleAnalytics measurementId="G-HWFWE6ED59" />
        <NextIntlClientProvider>
          <SessionProvider>
            <AlertDialogStoreProvider>{children}</AlertDialogStoreProvider>
            <PendingScoreSubmitter />
            <GuestKeyRegistrar />
          </SessionProvider>
          <AchievementToaster />
        </NextIntlClientProvider>
        {/* <SoundToggle /> */}
        <Toaster />
      </body>
    </html>
  );
}
