'use client';

import { motion, useReducedMotion } from 'framer-motion';

type BuzzerButtonProps = {
  isLocked: boolean;
  lockRemaining: number;
  isBuzzerOpen: boolean;
  isAnswering: boolean;
  isCurrentAnswerer: boolean;
  onBuzz: () => void;
};

const BuzzerButton = ({
  isLocked,
  lockRemaining,
  isBuzzerOpen,
  isAnswering,
  isCurrentAnswerer,
  onBuzz,
}: BuzzerButtonProps) => {
  const reduceMotion = useReducedMotion();

  if (isCurrentAnswerer) return null;

  const isDisabled =
    isLocked || !isBuzzerOpen || (isAnswering && !isCurrentAnswerer);

  // 鎖定中
  if (isLocked) {
    return (
      <div className="flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl border-2 border-zinc-200 bg-zinc-100 px-6 py-4 font-display text-xl font-black text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500 md:w-auto md:min-w-[220px] md:max-w-none md:px-10 md:py-5">
        鎖定中 {lockRemaining}s
      </div>
    );
  }

  // 等待中（搶答未開放 或 他人作答中）
  if (!isBuzzerOpen || isAnswering) {
    return (
      <div className="flex w-full max-w-sm items-center justify-center rounded-2xl border-2 border-amber-200 bg-amber-50 px-6 py-4 font-display text-xl font-black text-amber-300 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-700 md:w-auto md:min-w-[220px] md:max-w-none md:px-10 md:py-5">
        等待中...
      </div>
    );
  }

  // 搶答開放！大 tactile amber 按鈕
  return (
    <motion.button
      onClick={onBuzz}
      whileTap={reduceMotion ? undefined : { scale: 0.96, y: 4 }}
      animate={
        reduceMotion
          ? undefined
          : {
              boxShadow: [
                '0 6px 0 #d97706',
                '0 6px 28px rgba(251,191,36,0.55), 0 6px 0 #d97706',
                '0 6px 0 #d97706',
              ],
            }
      }
      transition={
        reduceMotion
          ? undefined
          : { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
      }
      className="w-full max-w-sm cursor-pointer rounded-2xl bg-amber-400 py-5 font-display text-2xl font-black text-white shadow-[0_6px_0_0_#d97706] transition-colors hover:bg-amber-500 active:translate-y-1.5 active:shadow-none md:w-auto md:min-w-[220px] md:max-w-none md:px-12 md:py-6 md:text-3xl"
    >
      搶答！
    </motion.button>
  );
};

export default BuzzerButton;
