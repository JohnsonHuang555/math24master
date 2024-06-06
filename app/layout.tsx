import { Inter as FontSans } from 'next/font/google';
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { AlertDialogStoreProvider } from '@/providers/alert-dialog-store-provider';
import './globals.css';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: '24 點',
  description: '24 點',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
        <Toaster />
      </body>
    </html>
  );
}
