import { Baloo_2, Figtree, Noto_Sans_TC } from 'next/font/google';
import { House } from 'lucide-react';
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

const fontFigtree = Figtree({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-figtree',
  weight: ['400', '800', '900'],
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

const CARD_CLASS =
  'flex h-[100px] w-[74px] items-center justify-center rounded-[14px] border-2 font-display text-[40px] font-extrabold';

export default async function GlobalNotFound() {
  const locale = await getLocale();
  const t = await getTranslations('NotFound');

  return (
    <html lang={HTML_LANG[locale]}>
      <body
        className={cn(
          'font-noto antialiased',
          fontNotoSans.variable,
          fontFigtree.variable,
          fontBaloo.variable,
        )}
      >
        <main className="flex h-dvh flex-col items-center justify-center gap-5 bg-[#f3faf8] px-6 text-center text-ink">
          {/* 404 用三張牌呈現，中間的 0 是缺牌的虛線空位 */}
          <div role="img" aria-label="404" className="flex items-end gap-2.5">
            <div
              className={cn(
                CARD_CLASS,
                '-rotate-6 border-playcard-line bg-playcard text-playcard-ink shadow-[0_5px_0_0_var(--playcard-edge)]',
              )}
            >
              4
            </div>
            <div
              className={cn(
                CARD_CLASS,
                'border-dashed border-[#9fb0ac] text-ink-2',
              )}
            >
              0
            </div>
            <div
              className={cn(
                CARD_CLASS,
                'rotate-6 border-playcard-line bg-playcard text-playcard-ink shadow-[0_5px_0_0_var(--playcard-edge)]',
              )}
            >
              4
            </div>
          </div>
          <h1 className="mt-4 text-[26px] font-black">{t('title')}</h1>
          <p className="text-[15px] leading-relaxed text-ink-2">
            {t('description')}
          </p>
          <a
            href={getPathname({ href: '/', locale })}
            className="mt-2 flex h-14 items-center justify-center gap-2 rounded-[14px] bg-primary px-8 text-xl font-extrabold text-primary-foreground shadow-[0_5px_0_0_var(--primary-edge)] transition-[translate,box-shadow] duration-[90ms] active:translate-y-1 active:shadow-[0_1px_0_0_var(--primary-edge)]"
          >
            <House aria-hidden className="h-5 w-5" />
            {t('backHome')}
          </a>
        </main>
      </body>
    </html>
  );
}
