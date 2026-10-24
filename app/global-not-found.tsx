import { Baloo_2, Noto_Sans_TC } from 'next/font/google';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { HTML_LANG } from '@/i18n/locales';
import { getPathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import './globals.css';

// 對不到任何路由的網址（含尚未開放的語系前綴）都由這頁回 404。
// root layout 是 app/[locale]/layout.tsx（頂層動態路由），一般的 not-found.js
// 在 server 端接不住，所以改用 global-not-found；它不經過 layout，要自己帶齊樣式與字型。
const fontNotoSans = Noto_Sans_TC({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans',
  preload: false,
});

const fontBaloo = Baloo_2({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-baloo',
  weight: ['800'],
  preload: false,
});

export const metadata: Metadata = {
  title: '404',
};

export default async function GlobalNotFound() {
  const locale = await getLocale();
  const t = await getTranslations('NotFound');

  return (
    <html lang={HTML_LANG[locale]}>
      <body
        className={cn(
          'font-noto antialiased',
          fontNotoSans.variable,
          fontBaloo.variable,
        )}
      >
        <main className="flex h-dvh flex-col items-center justify-center gap-4 bg-[#f3faf8] px-4 text-center dark:bg-zinc-950">
          <p className="font-display text-6xl font-extrabold text-primary">
            404
          </p>
          <h1 className="text-lg font-bold">{t('title')}</h1>
          <a
            href={getPathname({ href: '/', locale })}
            className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backHome')}
          </a>
        </main>
      </body>
    </html>
  );
}
