'use client';

import { Calculator, ChevronRight, HelpCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useHardNavigate } from '@/i18n/navigation';
import { type CtaName, trackCtaClick } from '@/lib/analytics';

const MORE_GAMES = [
  {
    cta: 'quick_math',
    href: '/quick-math',
    icon: Calculator,
    key: 'quickMath',
  },
  {
    cta: 'guess_number',
    href: '/guess-number',
    icon: HelpCircle,
    key: 'guessNumber',
  },
] as const satisfies readonly {
  cta: CtaName;
  href: string;
  icon: unknown;
  key: string;
}[];

/**
 * 首頁底部的「更多遊戲」文字入口：首頁聚焦 24 點，其他小遊戲只留精簡連結，
 * 遊戲頁面與路由不變。每日挑戰已移到 Hero 作為第二入口
 */
const MoreModesSection = () => {
  const t = useTranslations('Home.moreModes');
  const hardNavigate = useHardNavigate();

  return (
    <section className="px-4 pb-8 md:px-10 md:pb-12">
      <nav
        aria-labelledby="home-more-games-title"
        className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-1 gap-y-1 lg:max-w-[1040px]"
      >
        <h2
          id="home-more-games-title"
          className="mr-1 text-sm font-bold text-ink-2"
        >
          {t('title')}
        </h2>
        {MORE_GAMES.map(({ cta, href, icon: Icon, key }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              trackCtaClick('home_more_games', cta);
              hardNavigate(href);
            }}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 text-[15px] font-bold text-ink transition-colors hover:bg-sunken focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <Icon aria-hidden className="h-[18px] w-[18px] text-primary-ink" />
            {t(`${key}.title`)}
            <ChevronRight aria-hidden className="h-4 w-4 text-ink-2" />
          </button>
        ))}
      </nav>
    </section>
  );
};

export default MoreModesSection;
