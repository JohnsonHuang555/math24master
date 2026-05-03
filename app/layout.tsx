import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Noto_Sans_TC } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import SoundToggle from '@/components/sound-toggle';
import { SessionProvider } from '@/components/session-provider';
import { GoogleAnalytics } from '@/components/analytics';
import { cn } from '@/lib/utils';
import { AlertDialogStoreProvider } from '@/providers/alert-dialog-store-provider';
import './globals.css';

const fontNotoSans = Noto_Sans_TC({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans',
  preload: true,
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
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
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7786092773254630"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
      </head>
      <body
        className={cn(
          'relative h-dvh font-noto antialiased',
          fontNotoSans.variable,
        )}
      >
        <div
          className="m:bg-center absolute h-full w-full bg-cover opacity-30 max-md:bg-right"
          style={{
            backgroundImage: `url(/b2.webp)`,
            zIndex: '-999',
          }}
        />
        <GoogleAnalytics measurementId="G-HWFWE6ED59" />
        <SessionProvider>
          <AlertDialogStoreProvider>{children}</AlertDialogStoreProvider>
        </SessionProvider>
        <SoundToggle />
        <ToastContainer
          position="top-right"
          autoClose={4000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </body>
    </html>
  );
}
