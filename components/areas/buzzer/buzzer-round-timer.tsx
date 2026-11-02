'use client';

import { AlarmClock, Pause, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

type BuzzerRoundTimerProps = {
  roundSeconds: number | null;
  roundRemaining: number | null;
  isPaused: boolean;
};

/**
 * 回合計時膠囊：一般、剩不到四分之一（警示）、暫停三種狀態。
 * 警示不只換顏色，圖示也換成鬧鐘
 */
const BuzzerRoundTimer = ({
  roundSeconds,
  roundRemaining,
  isPaused,
}: BuzzerRoundTimerProps) => {
  if (roundSeconds === null || roundRemaining === null) return null;

  const ratio = Math.max(0, Math.min(1, roundRemaining / roundSeconds));
  const isLow = !isPaused && ratio <= 0.25;
  const minutes = Math.floor(roundRemaining / 60);
  const seconds = String(roundRemaining % 60).padStart(2, '0');
  const Icon = isPaused ? Pause : isLow ? AlarmClock : Timer;

  return (
    <span
      role="timer"
      aria-live={isLow ? 'polite' : 'off'}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[13px] font-bold',
        isPaused
          ? 'border-line-strong bg-sunken text-ink-2'
          : isLow
            ? 'border-danger bg-danger-tint text-danger-ink'
            : 'border-line bg-surface text-ink',
      )}
    >
      <Icon aria-hidden className="h-4 w-4" />
      {isPaused ? (
        '暫停'
      ) : (
        <span className="font-display text-[15px] tabular-nums">
          {minutes}:{seconds}
        </span>
      )}
    </span>
  );
};

export default BuzzerRoundTimer;
