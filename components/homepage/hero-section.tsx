'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import {
  BarChart2,
  CalendarDays,
  LayoutGrid,
  Trophy,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Button } from '@/components/ui/button';
import { Link, useHardNavigate } from '@/i18n/navigation';
import { trackCtaClick } from '@/lib/analytics';
import { DailyStatusBadge } from './daily-status';

const HERO_CARDS = [
  { value: 6, rotate: -14, y: 18 },
  { value: 4, rotate: -5, y: 0 },
  { value: 3, rotate: 5, y: 0 },
  { value: 2, rotate: 14, y: 18 },
];

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

type HeroSectionProps = {
  onOpenStatsModal: () => void;
};

const HeroSection = ({ onOpenStatsModal }: HeroSectionProps) => {
  const reduceMotion = useReducedMotion();
  const hardNavigate = useHardNavigate();
  const t = useTranslations('Home');
  const tDaily = useTranslations('Home.moreModes.dailyChallenge');

  const navItems = [
    { key: 'leaderboard', label: t('leaderboard'), icon: Trophy },
    {
      key: 'stats',
      label: t('stats'),
      icon: BarChart2,
      onClick: onOpenStatsModal,
    },
    // 成就功能尚未規劃完成，入口先隱藏（AchievementModal 與 Home.achievements 文案保留）
  ];

  // 手機只有圖示，桌機為「圖示＋文字」
  const navButtonClass =
    'h-11 w-11 gap-1.5 px-0 font-bold text-ink md:w-auto md:px-3 lg:font-semibold lg:text-ink-2 lg:hover:text-ink';

  return (
    <section className="relative flex flex-col">
      {/* teal 底部光暈 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_40rem_at_50%_130%,rgba(13,148,136,0.13),transparent_70%)]"
      />

      {/* 導覽列：手機為圖示按鈕；桌機為整條導覽列 */}
      <header className="relative z-10 flex h-16 shrink-0 items-center justify-between gap-2 pr-2 pl-4 md:px-10 lg:border-b lg:border-line lg:bg-surface/75">
        <Image
          src="/logo.webp"
          alt={t('logoAlt')}
          width={100}
          height={30}
          className="h-7 w-auto"
          priority
        />
        <nav className="flex items-center gap-0.5 lg:gap-1">
          {navItems.map(({ key, label, icon: Icon, onClick }) =>
            onClick ? (
              <Button
                key={key}
                variant="ghost"
                className={navButtonClass}
                onClick={onClick}
                aria-label={label}
              >
                <Icon className="h-5 w-5 md:hidden lg:inline lg:h-[18px] lg:w-[18px]" />
                <span className="hidden md:inline">{label}</span>
              </Button>
            ) : (
              <Button
                key={key}
                variant="ghost"
                className={navButtonClass}
                asChild
              >
                <Link href="/leaderboard" aria-label={label}>
                  <Icon className="h-5 w-5 md:hidden lg:inline lg:h-[18px] lg:w-[18px]" />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              </Button>
            ),
          )}
          <LocaleSwitcher className="text-ink lg:ml-2 lg:border lg:border-line" />
        </nav>
      </header>

      {/* Hero：手機由上而下（牌面、算式、標題、CTA）；桌機左文右圖 */}
      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col items-center gap-[18px] px-4 pt-5 pb-8 text-center md:gap-6 md:pt-14 md:pb-16 lg:grid lg:max-w-[1120px] lg:grid-cols-[minmax(0,1fr)_480px] lg:gap-12 lg:px-10 lg:pt-[72px] lg:pb-20 lg:text-left">
        {/* 牌面扇形＋算式膠囊 */}
        <div className="flex flex-col items-center gap-[18px] md:gap-6 lg:order-2 lg:gap-7">
          <div
            className="flex h-[118px] items-start justify-center md:h-[170px] lg:h-[200px]"
            aria-hidden
          >
            {HERO_CARDS.map((card, i) => (
              <motion.div
                key={card.value}
                initial={
                  reduceMotion
                    ? false
                    : { opacity: 0, y: 60, rotate: card.rotate - 8 }
                }
                animate={{ opacity: 1, y: card.y, rotate: card.rotate }}
                whileHover={
                  reduceMotion ? undefined : { y: card.y - 12, scale: 1.05 }
                }
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 18,
                  delay: reduceMotion ? 0 : i * 0.06,
                }}
                className="-mx-1 flex h-[88px] w-16 items-center justify-center rounded-[13px] border-2 border-playcard-line bg-playcard font-display text-[38px] font-extrabold text-playcard-ink shadow-[0_5px_0_0_var(--playcard-edge)] md:-mx-1.5 md:h-[132px] md:w-24 md:rounded-[18px] md:text-[56px] lg:-mx-1 lg:h-[154px] lg:w-28 lg:rounded-[20px] lg:border-[2.5px] lg:text-[68px] lg:shadow-[0_7px_0_0_var(--playcard-edge)]"
              >
                {card.value}
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: reduceMotion ? 0 : 0.4,
              duration: 0.4,
              ease: EASE_OUT,
            }}
            className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 font-display lg:gap-2.5 lg:px-[22px] lg:py-3"
          >
            <span className="text-lg font-bold text-ink-2 lg:text-2xl">
              6 × 4 × (3 − 2) =
            </span>
            <span className="text-[22px] font-extrabold text-primary-ink lg:text-[30px]">
              24
            </span>
          </motion.div>
        </div>

        {/* 標題、副文案、CTA */}
        <div className="flex flex-col items-center gap-[18px] md:gap-6 lg:order-1 lg:items-start lg:gap-[22px]">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: reduceMotion ? 0 : 0.25,
              duration: 0.5,
              ease: EASE_OUT,
            }}
            className="mt-1.5 space-y-3 lg:mt-0 lg:space-y-[22px]"
          >
            <h1 className="text-[34px] leading-[1.15] font-black tracking-tight text-balance text-ink md:text-6xl md:leading-[1.05] lg:leading-[1.1]">
              {t.rich('title', {
                br: () => <br className="lg:hidden" />,
                highlight: chunks => (
                  <span className="font-display text-[44px] font-extrabold text-primary-ink md:text-7xl lg:text-[84px]">
                    {chunks}
                  </span>
                ),
              })}
            </h1>
            <p className="mx-auto max-w-sm text-[15px] leading-relaxed text-pretty text-ink-2 md:text-lg lg:mx-0 lg:max-w-[520px] lg:text-[19px] lg:leading-[1.65]">
              {t('subtitle')}
            </p>
          </motion.div>

          {/* CTA 層級：主按鈕快速試玩 → 第二入口每日挑戰 → 次要導覽（選擇模式、多人對戰） */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: reduceMotion ? 0 : 0.45,
              duration: 0.4,
              ease: EASE_OUT,
            }}
            className="mt-1.5 flex w-full flex-col items-center gap-3 md:w-auto lg:mt-2.5 lg:items-start lg:gap-3.5"
          >
            <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-start lg:gap-3.5">
              <div className="flex flex-col items-center gap-2 lg:items-start">
                {/* 主按鈕直接進快速試玩（不選模式、不登入）；?from=home 用來區分 GA4 入口 */}
                <Button
                  variant="tactile"
                  className="w-full md:w-auto md:px-8 lg:h-[60px] lg:px-9"
                  asChild
                >
                  <Link
                    href="/quick-play?from=home"
                    onClick={() => trackCtaClick('home_hero', 'quick_play')}
                  >
                    {t('start')}
                  </Link>
                </Button>
                <p
                  className="text-[13px] font-semibold text-ink-2 md:text-sm"
                  data-testid="home-cta-meta"
                >
                  {t('startMeta')}
                </p>
              </div>
              {/* 第二入口：每日挑戰，附今日狀態與連續天數 */}
              <Button
                variant="tactileOutline"
                className="w-full gap-2 px-4 text-lg md:w-auto md:px-6 lg:h-[60px] lg:px-7"
                asChild
              >
                <Link
                  href="/daily-challenge?from=home"
                  onClick={() => trackCtaClick('home_hero', 'daily_challenge')}
                  data-testid="home-daily-cta"
                >
                  <CalendarDays aria-hidden className="h-5 w-5" />
                  {tDaily('title')}
                  <DailyStatusBadge />
                </Link>
              </Button>
            </div>

            {/* 次要導覽：平面文字按鈕，不與主 CTA 搶視覺焦點 */}
            <nav
              aria-label={t('secondaryNav')}
              className="flex items-center gap-1 lg:-ml-3"
            >
              <Button
                variant="ghost"
                className="h-11 gap-1.5 px-3 text-[15px] font-bold text-ink-2 hover:text-ink"
                onClick={() => {
                  trackCtaClick('home_hero', 'choose_mode');
                  hardNavigate('/single-play');
                }}
              >
                <LayoutGrid aria-hidden className="h-[18px] w-[18px]" />
                {t('chooseMode')}
              </Button>
              <span aria-hidden className="h-4 w-px bg-line-strong" />
              <Button
                variant="ghost"
                className="h-11 gap-1.5 px-3 text-[15px] font-bold text-ink-2 hover:text-ink"
                onClick={() => {
                  trackCtaClick('home_hero', 'multiplayer');
                  hardNavigate('/multiple-play');
                }}
              >
                <Users aria-hidden className="h-[18px] w-[18px]" />
                {t('multiplayer')}
              </Button>
            </nav>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
