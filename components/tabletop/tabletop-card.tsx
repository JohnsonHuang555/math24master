'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Circle, Diamond, Square, Triangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { CardColor, NumberCard } from '@/models/Player';

/**
 * 牌色只出現在牌面上（見 CONTEXT.md「牌色」），每種顏色另外配一個形狀，色弱玩家也能分辨。
 * 形狀放在左上角並在數字下方重複一次，牌被手指蓋住一半也看得到
 */
export const CARD_COLOR_STYLE: Record<
  CardColor,
  { text: string; border: string; Shape: typeof Circle }
> = {
  red: {
    text: 'text-suit-red',
    border: 'border-suit-red',
    Shape: Circle,
  },
  blue: {
    text: 'text-suit-blue',
    border: 'border-suit-blue',
    Shape: Square,
  },
  yellow: {
    text: 'text-suit-yellow',
    border: 'border-suit-yellow',
    Shape: Triangle,
  },
  black: {
    text: 'text-suit-black',
    border: 'border-suit-black',
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

const SIZE_CLASS = {
  // 手牌
  md: {
    card: 'h-[72px] w-[52px] rounded-[11px] border-2 text-[28px] shadow-[0_4px_0_0_var(--playcard-edge)]',
    corner: 'top-[5px] left-[5px] h-[9px] w-[9px]',
    under: 'h-2 w-2',
  },
  // 桌面牌組、組裝列
  sm: {
    card: 'h-[46px] w-[34px] rounded-lg border-[1.5px] text-xl shadow-[0_3px_0_0_var(--playcard-edge)]',
    corner: 'top-[3px] left-[3px] h-[7px] w-[7px]',
    under: null,
  },
} as const;

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
  const sizeClass = SIZE_CLASS[size];
  const isUndeclaredJoker = card.isJoker && !style;
  const t = useTranslations('Tabletop');

  return (
    <motion.button
      type="button"
      disabled={!interactive}
      onClick={onClick}
      whileHover={interactive && !reduceMotion ? { y: -3 } : undefined}
      whileTap={interactive && !reduceMotion ? { y: 3 } : undefined}
      transition={{ type: 'spring', stiffness: 600, damping: 32 }}
      aria-label={
        isUndeclaredJoker
          ? t('card.undeclaredJoker')
          : t(card.isJoker ? 'card.jokerLabel' : 'card.label', {
              color: face.color ? t(`colors.${face.color}`) : '',
              value: face.value,
            })
      }
      className={cn(
        'relative flex shrink-0 flex-col items-center justify-center gap-0.5 border-playcard-line bg-playcard p-0 font-display leading-none font-extrabold select-none',
        sizeClass.card,
        style?.text,
        // 已宣告的 Joker：虛線邊框用宣告的牌色
        card.isJoker && style && ['border-dashed', style.border],
        isUndeclaredJoker &&
          'bg-[repeating-linear-gradient(135deg,var(--playcard)_0_8px,var(--sunken)_8px_16px)] text-playcard-ink',
        highlighted && 'ring-2 ring-amber ring-offset-2 ring-offset-background',
        interactive
          ? 'cursor-pointer focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus'
          : 'cursor-default',
      )}
    >
      {Shape && (
        <Shape
          aria-hidden
          className={cn('absolute fill-current stroke-0', sizeClass.corner)}
        />
      )}
      <span>{face.value}</span>
      {/* 已宣告的 Joker 底部改放 J 標，不重複形狀 */}
      {Shape && sizeClass.under && !card.isJoker && (
        <Shape
          aria-hidden
          className={cn('fill-current stroke-0', sizeClass.under)}
        />
      )}
      {isUndeclaredJoker && size === 'md' && (
        <span className="font-noto text-[9px] font-extrabold tracking-[0.06em] text-ink-2">
          JOKER
        </span>
      )}
      {card.isJoker && style && (
        <span
          aria-hidden
          className={cn(
            'absolute rounded bg-suit-black px-1 font-noto font-extrabold text-white',
            size === 'md'
              ? 'bottom-1 text-[9px] leading-3'
              : '-right-1 -bottom-1 text-[8px] leading-[11px]',
          )}
        >
          J
        </span>
      )}
    </motion.button>
  );
}
