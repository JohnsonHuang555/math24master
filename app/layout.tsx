import { ToastContainer } from 'react-toastify';
import { Noto_Sans_TC } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
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
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
    googleBot: 'index, follow',
  },
  applicationName: '24點大師',
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
        )}
      >
        <div
          className="m:bg-center absolute h-full w-full bg-cover opacity-30 max-md:bg-right"
          style={{
            backgroundImage: `url(/b2.webp)`,
            zIndex: '-999',
          }}
        />
        <AlertDialogStoreProvider>{children}</AlertDialogStoreProvider>
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
