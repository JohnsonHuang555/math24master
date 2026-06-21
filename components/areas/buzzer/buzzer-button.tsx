'use client';

import { motion } from 'framer-motion';

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
  if (isCurrentAnswerer) return null;

  const isDisabled =
    isLocked || !isBuzzerOpen || (isAnswering && !isCurrentAnswerer);

  const getLabel = () => {
    if (isLocked) return `鎖定中 (${lockRemaining}s)`;
    if (!isBuzzerOpen) return '等待中...';
    if (isAnswering) return '等待中...';
    return '搶答！';
  };

  const getStyle = () => {
    if (isLocked) {
      return 'bg-gray-400 cursor-not-allowed opacity-70 text-white';
    }
    if (!isBuzzerOpen || isAnswering) {
      return 'bg-[#E9A368] opacity-40 cursor-not-allowed text-white';
    }
    return 'bg-[#E9A368] hover:bg-[#d4884d] active:scale-95 cursor-pointer text-white shadow-[0_6px_0_#b5622a] hover:shadow-[0_4px_0_#b5622a] active:shadow-none active:translate-y-1';
  };

  return (
    <motion.button
      disabled={isDisabled}
      onClick={onBuzz}
      animate={
        !isDisabled
          ? {
              boxShadow: [
                '0 6px 0 #b5622a',
                '0 8px 24px rgba(233,163,104,0.7)',
                '0 6px 0 #b5622a',
              ],
            }
          : {}
      }
      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      className={`min-w-[200px] rounded-2xl px-10 py-5 text-2xl font-extrabold transition-all duration-150 ${getStyle()}`}
    >
      {getLabel()}
    </motion.button>
  );
};

export default BuzzerButton;
