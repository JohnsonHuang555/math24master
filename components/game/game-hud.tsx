'use client';

import { useEffect } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import { BookOpen, ChevronLeft, Flag, Layers, Volume2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type GameHudProps = {
  modeLabel: string;
  score: number;
  /** 牌庫或牌面剩餘張數；最後一輪時改顯示旗標 */
  remaining?: number;
  isLastRound?: boolean;
  onExit?: () => void;
  onOpenRules?: () => void;
  className?: string;
};

/**
 * 遊戲頂部 HUD：模式名稱、分數（數字滾動）、剩餘張數、規則。
 * 剩餘張數只用圖示＋數字表示以省寬度；音效鈕先預留位置，未來啟用
 */
export function GameHud({
  modeLabel,
  score,
  remaining,
  isLastRound,
  onExit,
  onOpenRules,
  className,
}: GameHudProps) {
  const t = useTranslations('GameUI.hud');

  const reduceMotion = useReducedMotion();
  const count = useMotionValue(score);
  const rounded = useTransform(count, Math.round);
  useEffect(() => {
    if (reduceMotion) {
      count.set(score);
      return;
    }
    const controls = animate(count, score, { duration: 0.3 });
    return () => controls.stop();
  }, [count, score, reduceMotion]);

  return (
    <div
      className={cn(
        'flex w-full items-center gap-2 rounded-2xl border border-line bg-surface p-2',
        className,
      )}
    >
      {onExit && (
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 text-ink-2"
          onClick={onExit}
          aria-label={t('exit')}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}
      <div className={cn('flex min-w-0 flex-1 flex-col', !onExit && 'pl-2')}>
        <span className="truncate text-xs font-semibold text-ink-2">
          {modeLabel}
        </span>
        <span className="flex items-baseline">
          <motion.span className="font-display text-[28px] leading-none font-extrabold text-ink tabular-nums">
            {rounded}
          </motion.span>
          <span className="ml-1 text-[15px] font-bold text-ink-2">
            {t('pointsUnit')}
          </span>
        </span>
      </div>

      {isLastRound ? (
        <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-amber px-2.5 text-[13px] font-bold whitespace-nowrap text-on-amber">
          <Flag aria-hidden className="h-4 w-4" />
          {t('lastRound')}
        </span>
      ) : (
        remaining !== undefined && (
          <span
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-sunken px-2.5 text-ink"
            aria-label={t('remaining', { count: remaining })}
          >
            <Layers aria-hidden className="h-4 w-4" />
            <span className="font-display text-[15px] font-bold tabular-nums">
              {remaining}
            </span>
          </span>
        )
      )}

      {onOpenRules && (
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 text-ink-2"
          onClick={onOpenRules}
          aria-label={t('rules')}
        >
          <BookOpen className="h-5 w-5" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 shrink-0 text-ink-2"
        disabled
        aria-label={t('soundComingSoon')}
      >
        <Volume2 className="h-5 w-5" />
      </Button>
    </div>
  );
}
