'use client';

import { motion } from 'framer-motion';

type BuzzerRoundTimerProps = {
  roundSeconds: number | null;
  roundRemaining: number | null;
  isPaused: boolean;
};

const SIZE = 80;
const STROKE = 7;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const BuzzerRoundTimer = ({
  roundSeconds,
  roundRemaining,
  isPaused,
}: BuzzerRoundTimerProps) => {
  if (roundSeconds === null || roundRemaining === null) return null;

  const ratio = Math.max(0, Math.min(1, roundRemaining / roundSeconds));

  const getColor = () => {
    if (ratio > 0.5) return '#22c55e';
    if (ratio > 0.3) return '#eab308';
    return '#ef4444';
  };

  const dashOffset = CIRCUMFERENCE * (1 - ratio);

  return (
    <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={STROKE}
        />
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={getColor()}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.5, ease: 'linear' }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isPaused ? (
          <span className="text-xs font-bold text-gray-500">暫停</span>
        ) : (
          <span className="text-xl font-extrabold text-gray-800">
            {roundRemaining}
          </span>
        )}
      </div>
    </div>
  );
};

export default BuzzerRoundTimer;
