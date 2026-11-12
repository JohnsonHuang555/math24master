'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Hourglass, Lock, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';

type BuzzerButtonProps = {
  isLocked: boolean;
  lockRemaining: number;
  /** 鎖定總秒數，用來畫底部的倒數進度條 */
  lockTotal?: number;
  isBuzzerOpen: boolean;
  isAnswering: boolean;
  isCurrentAnswerer: boolean;
  /** 被他人搶到時顯示是誰 */
  answeringPlayerName?: string;
  onBuzz: () => void;
};

const BOX_CLASS =
  'relative flex h-[72px] w-full max-w-sm items-center justify-center gap-2 overflow-hidden rounded-[18px] md:w-auto md:min-w-[260px] md:max-w-none md:px-10';

const BuzzerButton = ({
  isLocked,
  lockRemaining,
  lockTotal,
  isBuzzerOpen,
  isAnswering,
  isCurrentAnswerer,
  answeringPlayerName,
  onBuzz,
}: BuzzerButtonProps) => {
  const reduceMotion = useReducedMotion();
  const t = useTranslations('Multiplayer.buzzer');

  if (isCurrentAnswerer) return null;

  // 鎖定中：底部進度條倒數
  if (isLocked) {
    const progress =
      lockTotal && lockTotal > 0
        ? Math.min(100, (lockRemaining / lockTotal) * 100)
        : 100;
    return (
      <div
        role="status"
        className={`${BOX_CLASS} border-2 border-danger bg-danger-tint text-xl font-extrabold text-danger-ink`}
      >
        <Lock aria-hidden className="h-6 w-6" />
        {t('locked')}
        <span className="font-display text-[26px]">{lockRemaining}s</span>
        <div
          aria-hidden
          className="absolute bottom-0 left-0 h-[5px] bg-danger transition-[width] duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  }

  // 已被他人搶到：顯示是誰
  if (isAnswering && answeringPlayerName) {
    return (
      <div
        role="status"
        className={`${BOX_CLASS} border border-line-strong bg-sunken text-[17px] font-bold text-ink`}
      >
        <span
          aria-hidden
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-tint text-[13px] font-extrabold text-primary-ink"
        >
          {Array.from(answeringPlayerName.trim())[0] ?? '?'}
        </span>
        <span className="min-w-0 truncate">
          {t.rich('answering', {
            name: answeringPlayerName,
            b: chunks => <strong>{chunks}</strong>,
          })}
        </span>
      </div>
    );
  }

  // 等待中（搶答未開放）
  if (!isBuzzerOpen || isAnswering) {
    return (
      <div
        role="status"
        className={`${BOX_CLASS} bg-line text-xl font-extrabold text-ink-2 shadow-[0_5px_0_0_var(--line-strong)]`}
      >
        <Hourglass aria-hidden className="h-6 w-6" />
        {t('waiting')}
      </div>
    );
  }

  // 可搶答：主色 tactile 大按鈕
  return (
    <motion.button
      type="button"
      onClick={onBuzz}
      animate={
        reduceMotion
          ? undefined
          : {
              boxShadow: [
                '0 6px 0 var(--primary-edge), 0 0 0 0 rgba(13,150,139,0)',
                '0 6px 0 var(--primary-edge), 0 0 0 6px rgba(13,150,139,0.25)',
                '0 6px 0 var(--primary-edge), 0 0 0 0 rgba(13,150,139,0)',
              ],
            }
      }
      transition={
        reduceMotion
          ? undefined
          : { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
      }
      className={`${BOX_CLASS} cursor-pointer bg-primary text-2xl font-extrabold text-primary-foreground shadow-[0_6px_0_0_var(--primary-edge)] transition-transform duration-[90ms] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus active:translate-y-1.5`}
    >
      <Zap aria-hidden className="h-7 w-7 fill-current" />
      {t('buzz')}
    </motion.button>
  );
};

export default BuzzerButton;
