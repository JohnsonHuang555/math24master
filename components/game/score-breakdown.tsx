'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { SYMBOL_SCORE, calcRoundScore } from '@/lib/scoring';
import { cn } from '@/lib/utils';
import { SelectedCard } from '@/models/SelectedCard';
import { Symbol } from '@/models/Symbol';
import { SYMBOL_LABEL } from './expression-bar';

type ScoreBreakdownProps = {
  /** 出牌的完整算式 */
  tokens: SelectedCard[];
  /** 已經揭曉分數的運算符號數量；reduced-motion 時忽略，一次全部顯示 */
  revealed: number;
  className?: string;
};

/**
 * 出牌成功的計分明細：每個運算符號下方依序跳出得分，全部揭曉後顯示加成與本手總分。
 * reduced-motion 一次顯示全部明細，不逐一播放
 */
export function ScoreBreakdown({
  tokens,
  revealed,
  className,
}: ScoreBreakdownProps) {
  const t = useTranslations('GameUI.scoring');
  const reduceMotion = useReducedMotion();

  const operators = tokens.filter(
    token => token.symbol && SYMBOL_SCORE[token.symbol] !== undefined,
  );
  const shown = reduceMotion ? operators.length : revealed;
  const isDone = shown >= operators.length;
  const timesCount = operators.filter(o => o.symbol === Symbol.Times).length;
  const divideCount = operators.filter(o => o.symbol === Symbol.Divide).length;
  const total = calcRoundScore(operators);

  let operatorIndex = 0;

  return (
    <div
      role="status"
      className={cn('flex w-full flex-col items-center gap-3.5', className)}
    >
      <AnimatePresence>
        {isDone && (
          <motion.span
            initial={reduceMotion ? false : { opacity: 0, scale: 0.6, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
            className="font-display text-[80px] leading-none font-extrabold text-primary-ink"
          >
            +{total}
            <span className="ml-1 font-noto text-4xl font-black">
              {t('gainedUnit')}
            </span>
          </motion.span>
        )}
      </AnimatePresence>

      <div className="flex w-full flex-col gap-3 rounded-[18px] border border-line bg-surface p-4">
        <div className="flex flex-wrap items-start justify-center gap-[5px]">
          {tokens.map((token, i) => {
            if (token.number) {
              return (
                <span
                  key={i}
                  className="flex h-10 min-w-[30px] items-center justify-center rounded-lg border-[1.5px] border-playcard-line bg-playcard px-1 font-display text-[22px] font-extrabold text-playcard-ink shadow-[0_2px_0_0_var(--playcard-edge)]"
                >
                  {token.number.value}
                </span>
              );
            }
            const score = token.symbol ? SYMBOL_SCORE[token.symbol] : undefined;
            const label = token.symbol ? SYMBOL_LABEL[token.symbol] : '';
            if (score === undefined) {
              return (
                <span
                  key={i}
                  className="flex h-10 items-center font-display text-[22px] font-extrabold text-ink-2"
                >
                  {label}
                </span>
              );
            }
            const isShown = operatorIndex++ < shown;
            return (
              <span key={i} className="flex flex-col items-center gap-1">
                <span className="flex h-10 items-center font-display text-[22px] font-extrabold text-ink">
                  {label}
                </span>
                <motion.span
                  initial={false}
                  animate={
                    isShown
                      ? { opacity: 1, y: 0 }
                      : { opacity: 0, y: reduceMotion ? 0 : 6 }
                  }
                  transition={{ duration: 0.18 }}
                  className="font-display text-sm font-extrabold text-primary-ink"
                >
                  +{score}
                </motion.span>
              </span>
            );
          })}
        </div>

        {isDone && (timesCount >= 2 || divideCount >= 2) && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {timesCount >= 2 && <BonusPill>{t('timesBonus')}</BonusPill>}
            {divideCount >= 2 && <BonusPill>{t('divideBonus')}</BonusPill>}
          </div>
        )}
      </div>
    </div>
  );
}

function BonusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-7 items-center rounded-full bg-amber-tint px-2.5 text-[13px] font-bold whitespace-nowrap text-amber-ink">
      {children}
    </span>
  );
}
