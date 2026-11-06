'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Pause, Timer, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn, formatTime } from '@/lib/utils';

export type TimerDelta = {
  /** 每次變動給新的 key，飄字才會重新播放 */
  key: number;
  seconds: number;
};

type GameTimerProps = {
  seconds: number;
  maxSeconds: number;
  /** 剩餘秒數小於等於這個值時進入低時限狀態 */
  lowThreshold?: number;
  paused?: boolean;
  /** 加時或扣時，以 pill 顯示正負秒數 */
  delta?: TimerDelta | null;
  /** 計時器右上角的資訊（如關卡、分數） */
  aside?: React.ReactNode;
  className?: string;
};

/**
 * 倒數計時器：一般、低時限、暫停三種狀態。
 * 低時限不只靠紅色：外框加粗、警示圖示與文字標籤；一般模式下數字每秒脈動一次，reduced-motion 不脈動
 */
export function GameTimer({
  seconds,
  maxSeconds,
  lowThreshold = 60,
  paused,
  delta,
  aside,
  className,
}: GameTimerProps) {
  const t = useTranslations('GameUI.timer');
  const reduceMotion = useReducedMotion();
  const isLow = !paused && seconds <= lowThreshold;
  const progress = Math.min(100, Math.max(0, (seconds / maxSeconds) * 100));

  return (
    <div
      role="timer"
      aria-live={isLow ? 'polite' : 'off'}
      className={cn(
        'flex w-full flex-col gap-2.5 rounded-[18px] border px-4 py-3.5',
        paused
          ? 'border-line bg-sunken'
          : isLow
            ? 'border-[3px] border-danger bg-danger-tint px-[14px] py-[12px]'
            : 'border-line bg-surface',
        className,
      )}
    >
      {(isLow || paused || aside) && (
        <div className="flex min-h-7 items-center justify-between gap-2">
          {isLow ? (
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-danger px-2.5 text-[13px] font-bold whitespace-nowrap text-white">
              <TriangleAlert aria-hidden className="h-4 w-4" />
              {t('lowTime')}
            </span>
          ) : paused ? (
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-2.5 text-[13px] font-bold whitespace-nowrap text-ink">
              <Pause aria-hidden className="h-4 w-4" />
              {t('paused')}
            </span>
          ) : (
            <span />
          )}
          {aside}
        </div>
      )}

      <div className="flex items-center gap-2.5">
        <Timer
          aria-hidden
          className={cn(
            'h-6 w-6 shrink-0 lg:h-[26px] lg:w-[26px]',
            isLow ? 'text-danger-ink' : 'text-ink-2',
          )}
        />
        <motion.span
          key={isLow && !reduceMotion ? seconds : 'steady'}
          initial={isLow && !reduceMotion ? { scale: 1.04 } : false}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'font-display text-[44px] leading-none font-extrabold tabular-nums lg:text-[60px]',
            paused ? 'text-ink-2' : isLow ? 'text-danger-ink' : 'text-ink',
          )}
        >
          {formatTime(seconds)}
        </motion.span>
        <AnimatePresence>
          {delta && (
            <motion.span
              key={delta.key}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
              transition={{ duration: reduceMotion ? 0.15 : 0.28 }}
              className={cn(
                'ml-auto inline-flex h-7 items-center rounded-full px-2.5 font-display text-base font-extrabold whitespace-nowrap',
                delta.seconds >= 0
                  ? 'bg-primary-tint text-primary-ink'
                  : 'bg-danger-tint text-danger-ink',
                isLow && delta.seconds < 0 && 'bg-surface',
              )}
            >
              {t('delta', {
                sign: delta.seconds >= 0 ? '+' : '−',
                seconds: Math.abs(delta.seconds),
              })}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div
        className={cn(
          'overflow-hidden rounded-full',
          isLow ? 'h-2.5 bg-surface' : 'h-2 bg-line',
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500',
            paused
              ? 'bg-[repeating-linear-gradient(135deg,var(--ink-2)_0_6px,transparent_6px_10px)]'
              : isLow
                ? 'bg-danger'
                : 'bg-primary',
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
