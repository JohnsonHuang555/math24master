'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Award, BarChart2, Trophy, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Button } from '@/components/ui/button';
import { Link, useHardNavigate } from '@/i18n/navigation';

const HERO_CARDS = [
  { value: 6, rotate: -14, y: 18 },
  { value: 4, rotate: -5, y: 0 },
  { value: 3, rotate: 5, y: 0 },
  { value: 2, rotate: 14, y: 18 },
];

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

type HeroSectionProps = {
  onOpenStatsModal: () => void;
  onOpenAchievementModal: () => void;
};

const HeroSection = ({
  onOpenStatsModal,
  onOpenAchievementModal,
}: HeroSectionProps) => {
  const reduceMotion = useReducedMotion();
  const hardNavigate = useHardNavigate();
  const t = useTranslations('Home');

  const navItems = [
    { key: 'leaderboard', label: t('leaderboard'), icon: Trophy },
    {
      key: 'stats',
      label: t('stats'),
      icon: BarChart2,
      onClick: onOpenStatsModal,
    },
    {
      key: 'achievements',
      label: t('achievements'),
      icon: Award,
      onClick: onOpenAchievementModal,
    },
  ];

  return (
    <section className="relative flex flex-col">
      {/* teal 底部光暈 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_40rem_at_50%_130%,rgba(13,148,136,0.13),transparent_70%)]"
      />

      {/* 導覽列：手機為圖示按鈕，桌機為文字按鈕 */}
      <header className="relative z-10 flex h-16 shrink-0 items-center justify-between gap-2 pr-2 pl-4 md:px-10">
        <Image
          src="/logo.webp"
          alt={t('logoAlt')}
          width={100}
          height={30}
          className="h-7 w-auto"
          priority
        />
        <nav className="flex items-center gap-0.5">
          {navItems.map(({ key, label, icon: Icon, onClick }) =>
            onClick ? (
              <Button
                key={key}
                variant="ghost"
                className="h-11 w-11 px-0 font-bold text-ink md:w-auto md:px-3"
                onClick={onClick}
                aria-label={label}
              >
                <Icon className="h-5 w-5 md:hidden" />
                <span className="hidden md:inline">{label}</span>
              </Button>
            ) : (
              <Button
                key={key}
                variant="ghost"
                className="h-11 w-11 px-0 font-bold text-ink md:w-auto md:px-3"
                asChild
              >
                <Link href="/leaderboard" aria-label={label}>
                  <Icon className="h-5 w-5 md:hidden" />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              </Button>
            ),
          )}
          <LocaleSwitcher className="text-ink" />
        </nav>
      </header>

      {/* Hero 中心內容 */}
      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col items-center gap-[18px] px-4 pt-5 pb-8 text-center md:gap-6 md:pt-14 md:pb-16">
        {/* 牌面扇形 */}
        <div
          className="flex h-[118px] items-start justify-center md:h-[170px]"
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
              className="-mx-1 flex h-[88px] w-16 items-center justify-center rounded-[13px] border-2 border-playcard-line bg-playcard font-display text-[38px] font-extrabold text-playcard-ink shadow-[0_5px_0_0_var(--playcard-edge)] md:-mx-1.5 md:h-[132px] md:w-24 md:rounded-[18px] md:text-[56px]"
            >
              {card.value}
            </motion.div>
          ))}
        </div>

        {/* 算式膠囊 */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: reduceMotion ? 0 : 0.4,
            duration: 0.4,
            ease: EASE_OUT,
          }}
          className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 font-display"
        >
          <span className="text-lg font-bold text-ink-2">
            6 × 4 × (3 − 2) =
          </span>
          <span className="text-[22px] font-extrabold text-primary-ink">
            24
          </span>
        </motion.div>

        {/* 標題 + 副文案 */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: reduceMotion ? 0 : 0.25,
            duration: 0.5,
            ease: EASE_OUT,
          }}
          className="mt-1.5 space-y-3"
        >
          <h1 className="text-[34px] leading-[1.15] font-black tracking-tight text-balance text-ink md:text-6xl md:leading-[1.05]">
            {t.rich('title', {
              br: () => <br />,
              highlight: chunks => (
                <span className="font-display text-[44px] font-extrabold text-primary-ink md:text-7xl">
                  {chunks}
                </span>
              ),
            })}
          </h1>
          <p className="mx-auto max-w-sm text-[15px] leading-relaxed text-pretty text-ink-2 md:text-lg">
            {t('subtitle')}
          </p>
        </motion.div>

        {/* CTA：手機上下排、桌機並排 */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: reduceMotion ? 0 : 0.45,
            duration: 0.4,
            ease: EASE_OUT,
          }}
          className="mt-1.5 flex w-full flex-col gap-3 md:w-auto md:flex-row"
        >
          <Button
            variant="tactile"
            className="w-full md:w-60"
            onClick={() => hardNavigate('/single-play')}
          >
            {t('start')}
          </Button>
          <Button
            variant="tactileOutline"
            className="w-full gap-2 md:w-60"
            onClick={() => hardNavigate('/multiple-play')}
          >
            <Users className="h-5 w-5" />
            {t('multiplayer')}
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
