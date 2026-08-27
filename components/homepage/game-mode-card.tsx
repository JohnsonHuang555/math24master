'use client';

import { RefObject } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronRight, LucideIcon } from 'lucide-react';

export type GameModeCardTheme = {
  card: string;
  iconBg: string;
  title: string;
  description: string;
  chevron: string;
};

type GameModeCardProps = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  theme: GameModeCardTheme;
  badge?: { label: string; className: string };
  delay?: number;
  scrollRef: RefObject<HTMLDivElement | null>;
};

const GameModeCard = ({
  href,
  icon: Icon,
  title,
  description,
  theme,
  badge,
  delay = 0,
  scrollRef,
}: GameModeCardProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ root: scrollRef, once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      className={`flex w-full items-center gap-4 rounded-2xl border-2 p-5 text-left transition-colors active:translate-y-1 active:shadow-none md:p-6 ${theme.card}`}
      onClick={() => (window.location.href = href)}
    >
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white ${theme.iconBg}`}
      >
        <Icon className="h-7 w-7" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-lg font-black ${theme.title}`}>{title}</span>
          {badge && <span className={badge.className}>{badge.label}</span>}
        </div>
        <div className={`mt-0.5 text-sm ${theme.description}`}>
          {description}
        </div>
      </div>
      <ChevronRight className={`h-5 w-5 shrink-0 ${theme.chevron}`} />
    </motion.button>
  );
};

export default GameModeCard;
