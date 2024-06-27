import { ToastContainer } from 'react-toastify';
import { Noto_Sans_TC } from 'next/font/google';
import type { Metadata } from 'next';
import { cn } from '@/lib/utils';
import { AlertDialogStoreProvider } from '@/providers/alert-dialog-store-provider';
import './globals.css';

const fontNotoSans = Noto_Sans_TC({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans',
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: '24點大師',
    template: '24點大師 | %s',
  },
  description:
    '歡迎來到24點數學遊戲！這是一款充滿挑戰和樂趣的益智遊戲，考驗你的數學運算能力和邏輯思維',
  keywords: ['24點', 'math24', '24點大師'],
  // openGraph: {
  //   title: '24點大師',
  //   description:
  //     '歡迎來到24點數學遊戲！這是一款充滿挑戰和樂趣的益智遊戲，考驗你的數學運算能力和邏輯思維',
  //   images: [
  //     {
  //       url: '/logo.svg',
  //       width: 400,
  //       height: 300,
  //     },
  //   ],
  //   locale: 'zh',
  //   type: 'website',
  // },
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
            backgroundImage: `url(/b2.jpg)`,
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
