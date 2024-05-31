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
          'h-screen bg-background font-sans antialiased',
          fontSans.variable,
        )}
      >
        <AlertDialogStoreProvider>{children}</AlertDialogStoreProvider>
        <Toaster />
      </body>
    </html>
  );
}
