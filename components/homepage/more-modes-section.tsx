import { RefObject } from 'react';
import { CalendarDays, Search, Timer } from 'lucide-react';
import GameModeCard, { GameModeCardTheme } from './game-mode-card';

const THEMES: Record<'teal' | 'amber' | 'violet', GameModeCardTheme> = {
  teal: {
    card: 'border-teal-200 bg-teal-50 shadow-[0_6px_0_0_theme(colors.teal.200)] hover:bg-teal-100/70 dark:border-teal-800 dark:bg-teal-900/20 dark:shadow-[0_6px_0_0_theme(colors.teal.800)] dark:hover:bg-teal-900/30',
    iconBg: 'bg-teal-500',
    title: 'text-teal-800 dark:text-teal-300',
    description: 'text-teal-600 dark:text-teal-400/80',
    chevron: 'text-teal-400',
  },
  amber: {
    card: 'border-amber-200 bg-amber-50 shadow-[0_6px_0_0_theme(colors.amber.200)] hover:bg-amber-100/70 dark:border-amber-800 dark:bg-amber-900/20 dark:shadow-[0_6px_0_0_theme(colors.amber.800)] dark:hover:bg-amber-900/30',
    iconBg: 'bg-amber-400',
    title: 'text-amber-800 dark:text-amber-300',
    description: 'text-amber-600 dark:text-amber-400/80',
    chevron: 'text-amber-400',
  },
  violet: {
    card: 'border-violet-200 bg-violet-50 shadow-[0_6px_0_0_theme(colors.violet.200)] hover:bg-violet-100/70 dark:border-violet-800 dark:bg-violet-900/20 dark:shadow-[0_6px_0_0_theme(colors.violet.800)] dark:hover:bg-violet-900/30',
    iconBg: 'bg-violet-400',
    title: 'text-violet-800 dark:text-violet-300',
    description: 'text-violet-600 dark:text-violet-400/80',
    chevron: 'text-violet-400',
  },
};

const GAME_MODES = [
  {
    href: '/daily-challenge',
    icon: CalendarDays,
    title: '每日挑戰',
    description: '每天 3 題 · 連續挑戰紀錄',
    theme: THEMES.teal,
    delay: 0,
  },
  {
    href: '/guess-number',
    icon: Search,
    title: '猜數字',
    description: '用線索卡推理謎底數字',
    theme: THEMES.amber,
    badge: {
      label: '推理小遊戲',
      className:
        'rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-800/40 dark:text-amber-300',
    },
    delay: 0.08,
  },
  {
    href: '/quick-math',
    icon: Timer,
    title: '心算快答',
    description: '10 題限時心算 · 挑戰你的心算速度',
    theme: THEMES.violet,
    delay: 0.16,
  },
];

type MoreModesSectionProps = {
  scrollRef: RefObject<HTMLDivElement | null>;
};

const MoreModesSection = ({ scrollRef }: MoreModesSectionProps) => {
  return (
    <section className="px-4 py-14 md:px-10 md:py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-6 text-2xl font-black tracking-tight text-foreground md:text-3xl">
          更多遊戲
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 md:gap-6">
          {GAME_MODES.map(mode => (
            <GameModeCard key={mode.href} scrollRef={scrollRef} {...mode} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default MoreModesSection;
