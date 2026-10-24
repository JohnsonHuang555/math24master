import { RefObject } from 'react';
import { CalendarDays, LucideIcon, Search, Timer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import GameModeCard, { GameModeCardTheme } from './game-mode-card';

const THEMES: Record<'teal' | 'amber' | 'violet', GameModeCardTheme> = {
  teal: {
    card: 'border-teal-200 bg-teal-50 shadow-[0_6px_0_0_var(--color-teal-200)] hover:bg-teal-100/70 dark:border-teal-800 dark:bg-teal-900/20 dark:shadow-[0_6px_0_0_var(--color-teal-800)] dark:hover:bg-teal-900/30',
    iconBg: 'bg-teal-500',
    title: 'text-teal-800 dark:text-teal-300',
    description: 'text-teal-600 dark:text-teal-400/80',
    chevron: 'text-teal-400',
  },
  amber: {
    card: 'border-amber-200 bg-amber-50 shadow-[0_6px_0_0_var(--color-amber-200)] hover:bg-amber-100/70 dark:border-amber-800 dark:bg-amber-900/20 dark:shadow-[0_6px_0_0_var(--color-amber-800)] dark:hover:bg-amber-900/30',
    iconBg: 'bg-amber-400',
    title: 'text-amber-800 dark:text-amber-300',
    description: 'text-amber-600 dark:text-amber-400/80',
    chevron: 'text-amber-400',
  },
  violet: {
    card: 'border-violet-200 bg-violet-50 shadow-[0_6px_0_0_var(--color-violet-200)] hover:bg-violet-100/70 dark:border-violet-800 dark:bg-violet-900/20 dark:shadow-[0_6px_0_0_var(--color-violet-800)] dark:hover:bg-violet-900/30',
    iconBg: 'bg-violet-400',
    title: 'text-violet-800 dark:text-violet-300',
    description: 'text-violet-600 dark:text-violet-400/80',
    chevron: 'text-violet-400',
  },
};

type GameMode = {
  id: 'dailyChallenge' | 'guessNumber' | 'quickMath';
  href: string;
  icon: LucideIcon;
  theme: GameModeCardTheme;
  badgeClassName?: string;
  delay: number;
};

const GAME_MODES: GameMode[] = [
  {
    id: 'dailyChallenge',
    href: '/daily-challenge',
    icon: CalendarDays,
    theme: THEMES.teal,
    delay: 0,
  },
  {
    id: 'guessNumber',
    href: '/guess-number',
    icon: Search,
    theme: THEMES.amber,
    badgeClassName:
      'rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-800/40 dark:text-amber-300',
    delay: 0.08,
  },
  {
    id: 'quickMath',
    href: '/quick-math',
    icon: Timer,
    theme: THEMES.violet,
    delay: 0.16,
  },
];

type MoreModesSectionProps = {
  scrollRef: RefObject<HTMLDivElement | null>;
};

const MoreModesSection = ({ scrollRef }: MoreModesSectionProps) => {
  const t = useTranslations('Home.moreModes');

  return (
    <section className="px-4 py-14 md:px-10 md:py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-6 text-2xl font-black tracking-tight text-foreground md:text-3xl">
          {t('title')}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 md:gap-6">
          {GAME_MODES.map(({ id, badgeClassName, ...mode }) => (
            <GameModeCard
              key={id}
              scrollRef={scrollRef}
              title={t(`${id}.title`)}
              description={t(`${id}.description`)}
              badge={
                badgeClassName && id === 'guessNumber'
                  ? { label: t(`${id}.badge`), className: badgeClassName }
                  : undefined
              }
              {...mode}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default MoreModesSection;
