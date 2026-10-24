'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Circle, Diamond, Sparkles, Square, Triangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardColor, NumberCard } from '@/models/Player';

/**
 * 牌色對應設計系統的色相（見 CONTEXT.md「牌色」）：紅 → rose、青 → teal、黃 → amber、黑 → zinc，
 * 每種顏色另外配一個形狀，色弱玩家也能分辨
 */
export const CARD_COLOR_STYLE: Record<
  CardColor,
  { label: string; text: string; border: string; Shape: typeof Circle }
> = {
  red: {
    label: '紅',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-300 dark:border-rose-800',
    Shape: Circle,
  },
  blue: {
    label: '青',
    text: 'text-teal-700 dark:text-teal-400',
    border: 'border-teal-300 dark:border-teal-800',
    Shape: Square,
  },
  yellow: {
    label: '黃',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-300 dark:border-amber-800',
    Shape: Triangle,
  },
  black: {
    label: '黑',
    text: 'text-zinc-800 dark:text-zinc-100',
    border: 'border-zinc-400 dark:border-zinc-500',
    Shape: Diamond,
  },
};

export const CARD_COLORS: CardColor[] = ['red', 'blue', 'yellow', 'black'];

/** Joker 以宣告的數值與顏色呈現；手上還沒宣告的 Joker 顯示 J */
function faceOf(card: NumberCard): { value: string; color?: CardColor } {
  if (!card.isJoker) return { value: String(card.value), color: card.color };
  if (card.jokerDeclaredValue === undefined) return { value: 'J' };
  return {
    value: String(card.jokerDeclaredValue),
    color: card.jokerDeclaredColor,
  };
}

type TabletopCardProps = {
  card: NumberCard;
  size?: 'sm' | 'md';
  highlighted?: boolean;
  onClick?: () => void;
  disabled?: boolean;
};

export function TabletopCard({
  card,
  size = 'md',
  highlighted,
  onClick,
  disabled,
}: TabletopCardProps) {
  const reduceMotion = useReducedMotion();
  const face = faceOf(card);
  const style = face.color ? CARD_COLOR_STYLE[face.color] : null;
  const Shape = style?.Shape;
  const interactive = !!onClick && !disabled;

  return (
    <motion.button
      type="button"
      disabled={!interactive}
      onClick={onClick}
      whileHover={interactive && !reduceMotion ? { y: -3 } : undefined}
      whileTap={interactive && !reduceMotion ? { scale: 0.95 } : undefined}
      transition={{ type: 'spring', stiffness: 190, damping: 16 }}
      aria-label={
        card.isJoker && !style
          ? 'Joker（尚未宣告）'
          : `${style?.label ?? ''}${face.value}${card.isJoker ? '（Joker）' : ''}`
      }
      className={cn(
        'relative flex shrink-0 flex-col items-center justify-center rounded-2xl border-2 bg-white font-display font-bold select-none dark:bg-zinc-800',
        size === 'md'
          ? 'h-16 w-12 text-2xl shadow-[0_4px_0_0_rgba(0,0,0,0.08)]'
          : 'h-11 w-8 rounded-xl text-lg shadow-[0_3px_0_0_rgba(0,0,0,0.06)]',
        style
          ? [style.text, style.border]
          : 'border-zinc-800 bg-zinc-900 text-white dark:border-zinc-200 dark:bg-zinc-100 dark:text-zinc-900',
        highlighted &&
          'ring-2 ring-amber-400 ring-offset-2 ring-offset-background',
        interactive ? 'cursor-pointer' : 'cursor-default',
      )}
    >
      {Shape && (
        <Shape
          aria-hidden
          className={cn(
            'absolute fill-current',
            size === 'md'
              ? 'top-1 left-1 h-2.5 w-2.5'
              : 'top-0.5 left-0.5 h-2 w-2',
          )}
        />
      )}
      {card.isJoker && (
        <Sparkles
          aria-hidden
          className={cn(
            'absolute',
            size === 'md'
              ? 'right-1 bottom-1 h-3 w-3'
              : 'right-0.5 bottom-0.5 h-2 w-2',
          )}
        />
      )}
      <span className="leading-none">{face.value}</span>
    </motion.button>
  );
}
