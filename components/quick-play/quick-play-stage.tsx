'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { CircleX, Lightbulb, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { HintLevel, QuickPlayFeedback } from '@/hooks/useQuickPlay';
import { solutionOperators } from '@/lib/onboarding-puzzles';

type QuickPlayStageProps = {
  feedback: QuickPlayFeedback | null;
  hintLevel: HintLevel;
  solution: string | null;
  showTips: boolean;
  onDismissTips: () => void;
};

/**
 * 牌面上方的回饋區：答錯原因優先，其次是提示，最後是第一次玩的操作提示。
 * 回饋寫在畫面上（role="alert"／"status"），不只靠 toast
 */
export function QuickPlayStage({
  feedback,
  hintLevel,
  solution,
  showTips,
  onDismissTips,
}: QuickPlayStageProps) {
  const reduceMotion = useReducedMotion();
  const t = useTranslations('QuickPlay');

  if (feedback) {
    return (
      <motion.div
        key={JSON.stringify(feedback)}
        role="alert"
        data-testid="quick-play-error"
        initial={reduceMotion ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex w-full items-center gap-3 rounded-2xl border-2 border-danger bg-danger-tint px-4 py-3.5"
      >
        <CircleX aria-hidden className="h-6 w-6 shrink-0 text-danger-ink" />
        <div className="flex flex-1 flex-col gap-0.5">
          <strong className="text-base text-danger-ink">
            {t(`errors.${feedback.error}`, { value: feedback.value ?? 0 })}
          </strong>
          {feedback.error !== 'EMPTY' && (
            <span className="text-[13px] text-ink">{t('fixHint')}</span>
          )}
        </div>
      </motion.div>
    );
  }

  if (hintLevel > 0 && solution) {
    const operators = solutionOperators(solution).map(op =>
      op === '-' ? '−' : op,
    );
    return (
      <div
        role="status"
        data-testid="quick-play-hint"
        className="flex w-full items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-tint text-amber-ink">
          <Lightbulb aria-hidden className="h-[18px] w-[18px]" />
        </span>
        <div className="flex flex-1 flex-col gap-0.5 text-left">
          <strong className="text-sm font-bold text-ink-2">
            {t('hint.title')}
          </strong>
          {hintLevel === 1 ? (
            <span className="flex flex-wrap items-center gap-1.5 text-base font-bold text-ink">
              {t('hint.operators')}
              {operators.map(op => (
                <span
                  key={op}
                  className="inline-flex h-8 min-w-8 items-center justify-center rounded-xl border border-line-strong bg-sunken px-2 font-display text-lg font-extrabold"
                >
                  {op}
                </span>
              ))}
            </span>
          ) : (
            <span className="font-display text-xl font-extrabold text-ink">
              {solution.replace(/-/g, '−')} = 24
            </span>
          )}
        </div>
      </div>
    );
  }

  if (showTips) {
    return (
      <motion.section
        aria-labelledby="quick-play-tips-title"
        data-testid="quick-play-tips"
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full rounded-2xl border border-line bg-surface px-4 pt-3.5 pb-3 text-left"
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 h-11 w-11 text-ink-2"
          onClick={onDismissTips}
          aria-label={t('tips.close')}
        >
          <X className="h-5 w-5" />
        </Button>
        <h2
          id="quick-play-tips-title"
          className="pr-10 text-base font-extrabold text-ink"
        >
          {t('tips.title')}
        </h2>
        <ol className="mt-2.5 flex flex-col gap-2">
          {(['step1', 'step2', 'step3'] as const).map((key, i) => (
            <li key={key} className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary-tint font-display text-sm font-extrabold text-primary-ink"
              >
                {i + 1}
              </span>
              <span className="text-[15px] text-ink">{t(`tips.${key}`)}</span>
            </li>
          ))}
        </ol>
        <div className="mt-1 flex justify-end">
          <Button
            variant="ghost"
            className="h-11 px-3 text-sm font-bold text-primary-ink"
            onClick={onDismissTips}
          >
            {t('tips.dismiss')}
          </Button>
        </div>
      </motion.section>
    );
  }

  return null;
}
