import { Toaster } from '@/components/ui/sonner';
import { Baloo_2, Noto_Sans_TC } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import SoundToggle from '@/components/sound-toggle';
import { SessionProvider } from '@/components/session-provider';
import { GoogleAnalytics } from '@/components/analytics';
import { PendingScoreSubmitter } from '@/components/pending-score-submitter';
import { cn } from '@/lib/utils';
import { AlertDialogStoreProvider } from '@/providers/alert-dialog-store-provider';
import './globals.css';

const fontNotoSans = Noto_Sans_TC({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans',
  preload: true,
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

export const metadata: Metadata = {
  metadataBase: new URL('https://math24master.com'),
  openGraph: {
    siteName: '24點大師',
    type: 'website',
    locale: 'zh',
  },
  twitter: {
    card: 'summary_large_image',
    title: '24點遊戲 - 免費線上益智數學遊戲 | 24點大師',
    description:
      '免費線上24點遊戲。用四張牌的加減乘除算出24，支援單人挑戰與多人即時對戰。考驗數學運算與邏輯思維的益智遊戲。',
    images: ['https://math24master.com/logo.webp'],
  },
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
    googleBot: 'index, follow',
  },
  applicationName: '24點大師',
  manifest: '/manifest.json',
  icons: {
    apple: '/icons/icon-192.png',
  },
  appleWebApp: {
    title: '24點大師',
    statusBarStyle: 'default',
    capable: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body
        className={cn(
          'relative h-dvh font-noto antialiased',
          fontNotoSans.variable,
          fontBaloo.variable,
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-[#f3faf8] [background-image:radial-gradient(42rem_42rem_at_115%_-12%,rgba(13,148,136,0.10),transparent_70%),radial-gradient(34rem_34rem_at_-12%_112%,rgba(245,158,11,0.08),transparent_70%)] dark:bg-zinc-950 dark:[background-image:radial-gradient(42rem_42rem_at_115%_-12%,rgba(45,212,191,0.07),transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-[url('/b2.webp')] bg-cover bg-center opacity-[0.18] dark:opacity-[0.07]"
        />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8612373668638236"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <GoogleAnalytics measurementId="G-HWFWE6ED59" />
        <SessionProvider>
          <AlertDialogStoreProvider>{children}</AlertDialogStoreProvider>
          <PendingScoreSubmitter />
        </SessionProvider>
        {/* <SoundToggle /> */}
        <Toaster />
      </body>
    </html>
  );
}
