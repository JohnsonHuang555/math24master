import { ToastContainer } from 'react-toastify';
import { Inter as FontSans } from 'next/font/google';
import type { Metadata } from 'next';
import { cn } from '@/lib/utils';
import { AlertDialogStoreProvider } from '@/providers/alert-dialog-store-provider';
import './globals.css';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: {
    default: '24 點',
    template: '24 點 | %s',
  },
  description:
    '歡迎來到24點數學遊戲！這是一款充滿挑戰和樂趣的益智遊戲，考驗你的數學運算能力和策略思維',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body
        className={cn(
          'relative h-screen font-sans antialiased',
          fontSans.variable,
        )}
      >
        <div
          className="absolute h-full w-full opacity-30"
          style={{
            backgroundImage: `url(/b2.jpg)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
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
