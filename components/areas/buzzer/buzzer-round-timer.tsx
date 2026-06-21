'use client';

import { motion, useReducedMotion } from 'framer-motion';

type BuzzerRoundTimerProps = {
  roundSeconds: number | null;
  roundRemaining: number | null;
  isPaused: boolean;
};

const SIZE = 55;
const STROKE = 7;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const BuzzerRoundTimer = ({
  roundSeconds,
  roundRemaining,
  isPaused,
}: BuzzerRoundTimerProps) => {
  const reduceMotion = useReducedMotion();

  if (roundSeconds === null || roundRemaining === null) return null;

  const ratio = Math.max(0, Math.min(1, roundRemaining / roundSeconds));

  const getStrokeColor = () => {
    if (ratio > 0.5) return 'hsl(175 84% 32%)';
    if (ratio > 0.25) return 'hsl(43 96% 56%)';
    return 'hsl(347 77% 50%)';
  };

  const getTextColorClass = () => {
    if (ratio > 0.5) return 'text-primary';
    if (ratio > 0.25) return 'text-amber-500';
    return 'text-rose-500';
  };

  const dashOffset = CIRCUMFERENCE * (1 - ratio);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: SIZE, height: SIZE }}
    >
      <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="hsl(240 5% 90%)"
          strokeWidth={STROKE}
          className="dark:stroke-zinc-700"
        />
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={getStrokeColor()}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          animate={{ strokeDashoffset: dashOffset }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.5, ease: 'linear' }
          }
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isPaused ? (
          <span className="text-xs font-bold text-muted-foreground">暫停</span>
        ) : (
          <span
            className={`font-display text-2xl font-black tabular-nums ${getTextColorClass()}`}
          >
            {roundRemaining}
          </span>
        )}
      </div>
    </div>
  );
};

export default BuzzerRoundTimer;
