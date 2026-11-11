'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ChevronRight,
  Layers,
  LayoutGrid,
  Shapes,
  Timer,
  Trophy,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import ChallengePlayGame from '@/app/[locale]/single-play/[mode]/challenge-play-game';
import ClassicPlayGame from '@/app/[locale]/single-play/[mode]/classic-play-game';
import MatchPlayGame from '@/app/[locale]/single-play/[mode]/match-play-game';
import TabletopPlayGame from '@/app/[locale]/single-play/[mode]/tabletop-play-game';
import { BackToHomeButton } from '@/components/back-to-home-button';
import { SiteHeader } from '@/components/layouts/site-header';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Kbd } from '@/components/ui/kbd';
import { Link } from '@/i18n/navigation';
import { prewarmMatchGenerator } from '@/lib/match-board-generator';
import { useStatsStore } from '@/stores/stats-store';

// 關卡模式（normal）暫時下架，改版為固定題庫後再回歸
type PlayMode = 'classic' | 'challenge' | 'match' | 'tabletop';

// 模式之間用圖示區分，不用顏色（設計系統：所有模式卡都是 teal）；文案在 messages 的 SinglePlay.modes
const MODE_CONFIG = [
  {
    value: 'classic' as const,
    badge: undefined as string | undefined,
    Icon: Layers,
  },
  {
    value: 'challenge' as const,
    badge: undefined as string | undefined,
    Icon: Timer,
  },
  {
    value: 'match' as const,
    badge: undefined as string | undefined,
    Icon: LayoutGrid,
  },
  {
    value: 'tabletop' as const,
    badge: undefined as string | undefined,
    Icon: Shapes,
  },
] as const;

const CHIP_KEYS = ['chip1', 'chip2', 'chip3'] as const;

export default function SinglePlayPage() {
  const t = useTranslations('SinglePlay');
  const tHome = useTranslations('Home');
  const reduceMotion = useReducedMotion();
  const [activeMode, setActiveMode] = useState<PlayMode | null>(null);

  const {
    classicBestScore,
    challengeBestStage,
    matchBestScore,
    tabletopBestScore,
  } = useStatsStore();

  // 消消樂模式牌局的反向構造需要先窮舉可解組合，趁玩家瀏覽模式選單的空檔背景預熱，
  // 避免點「開始遊戲」時卡頓（詳見 lib/match-board-generator.ts）
  useEffect(() => {
    prewarmMatchGenerator();
  }, []);

  // 桌機鍵盤：1–4 直接進入對應模式
  useEffect(() => {
    if (activeMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      const mode = MODE_CONFIG[Number(e.key) - 1];
      if (mode) setActiveMode(mode.value);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeMode]);

  const bestLabel: Record<PlayMode, { prefix?: string; value: string } | null> =
    {
      classic:
        classicBestScore > 0
          ? { value: t('points', { score: classicBestScore }) }
          : null,
      challenge:
        challengeBestStage > 0
          ? { value: t('stage', { stage: challengeBestStage }) }
          : null,
      match:
        matchBestScore > 0
          ? { value: t('points', { score: matchBestScore }) }
          : null,
      tabletop:
        tabletopBestScore > 0
          ? { value: t('points', { score: tabletopBestScore }) }
          : null,
    };

  if (activeMode === 'challenge') {
    return <ChallengePlayGame onBack={() => setActiveMode(null)} autoStart />;
  }
  if (activeMode === 'classic') {
    return <ClassicPlayGame onBack={() => setActiveMode(null)} autoStart />;
  }
  if (activeMode === 'match') {
    return <MatchPlayGame onBack={() => setActiveMode(null)} autoStart />;
  }
  if (activeMode === 'tabletop') {
    return <TabletopPlayGame onBack={() => setActiveMode(null)} autoStart />;
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <SiteHeader>
        <Link
          href="/leaderboard"
          className="flex h-11 items-center gap-1.5 rounded-xl px-3.5 text-[15px] font-semibold text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
        >
          <Trophy aria-hidden className="h-[18px] w-[18px]" />
          {tHome('leaderboard')}
        </Link>
        <LocaleSwitcher className="ml-2 border border-line text-ink" />
      </SiteHeader>

      <header className="flex shrink-0 items-center gap-1 px-2 pt-2 lg:hidden">
        <BackToHomeButton />
        <span className="flex-1" />
        <Link
          href="/leaderboard"
          aria-label={tHome('leaderboard')}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-ink transition-colors hover:bg-sunken"
        >
          <Trophy className="h-5 w-5" />
        </Link>
        <LocaleSwitcher className="text-ink" />
      </header>

      <div className="mx-auto flex w-full max-w-lg items-end gap-4 px-4 pt-2 pb-5 lg:max-w-[1120px] lg:px-10 lg:pt-9 lg:pb-6">
        <BackToHomeButton className="hidden border border-line bg-surface lg:flex" />
        <div className="flex flex-1 flex-col gap-1.5 lg:gap-1">
          <h1 className="text-[28px] font-black tracking-tight text-ink lg:text-4xl">
            {t('title')}
          </h1>
          <p className="text-[15px] text-ink-2 lg:text-base">{t('subtitle')}</p>
        </div>
        <span className="hidden items-center gap-1.5 text-[13px] text-ink-2 lg:flex">
          {t.rich('keyboardHint', { kbd: chunks => <Kbd>{chunks}</Kbd> })}
        </span>
      </div>

      <main className="mx-auto grid w-full max-w-lg grid-cols-1 gap-3.5 px-4 pb-10 lg:max-w-[1120px] lg:grid-cols-2 lg:gap-5 lg:px-10">
        {MODE_CONFIG.map((mode, i) => {
          const best = bestLabel[mode.value];
          return (
            <motion.button
              key={mode.value}
              type="button"
              aria-keyshortcuts={String(i + 1)}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.28,
                delay: reduceMotion ? 0 : i * 0.05,
                ease: [0.2, 0, 0, 1],
              }}
              onClick={() => setActiveMode(mode.value)}
              className="group flex w-full flex-col gap-3 rounded-[20px] border border-line bg-surface p-[18px] text-left transition-[border-color,translate,box-shadow] duration-[90ms] hover:border-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus active:translate-y-0.5 lg:gap-4 lg:rounded-[22px] lg:p-[26px] lg:hover:shadow-[0_0_0_4px_var(--primary-tint)]"
            >
              <div className="flex items-center gap-3.5 lg:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-primary-tint text-primary-ink lg:h-14 lg:w-14 lg:rounded-2xl">
                  <mode.Icon className="h-6 w-6 lg:h-7 lg:w-7" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2">
                    <strong className="text-[19px] text-ink lg:text-[22px]">
                      {t(`modes.${mode.value}.label`)}
                    </strong>
                    {mode.badge && (
                      <span className="rounded-[5px] bg-amber px-1.5 py-[3px] text-[10px] font-extrabold tracking-[0.06em] text-on-amber uppercase">
                        {mode.badge}
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-ink-2 lg:text-[15px]">
                    {t(`modes.${mode.value}.tagline`)}
                  </span>
                </div>
                <ChevronRight
                  aria-hidden
                  className="h-5 w-5 shrink-0 text-ink-2 group-hover:text-primary-ink lg:hidden"
                />
                <Kbd className="text-xs text-ink-2">{i + 1}</Kbd>
              </div>

              <div className="flex flex-wrap gap-1.5 lg:gap-2">
                {CHIP_KEYS.map(chipKey => (
                  <span
                    key={chipKey}
                    className="inline-flex h-[26px] items-center rounded-full bg-sunken px-[9px] text-xs font-semibold whitespace-nowrap text-ink lg:h-[30px] lg:px-3 lg:text-[13px]"
                  >
                    {t(`modes.${mode.value}.${chipKey}`)}
                  </span>
                ))}
              </div>

              {best && (
                <div className="flex items-center justify-between border-t border-line pt-3 lg:mt-auto lg:pt-3.5">
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 lg:text-sm">
                    <Trophy aria-hidden className="h-4 w-4" />
                    {t('personalBest')}
                  </span>
                  <span className="flex items-baseline gap-1.5">
                    {best.prefix && (
                      <span className="text-[13px] font-bold text-ink-2 lg:text-sm">
                        {best.prefix}
                      </span>
                    )}
                    <span className="font-display text-[22px] font-extrabold text-ink lg:text-[26px]">
                      {best.value}
                    </span>
                  </span>
                </div>
              )}
            </motion.button>
          );
        })}
      </main>
    </div>
  );
}
