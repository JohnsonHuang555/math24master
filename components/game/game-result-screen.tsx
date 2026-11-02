'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ResultStat = {
  label: string;
  value: React.ReactNode;
  /** 次要數值（如「之前最佳」）以灰字顯示 */
  muted?: boolean;
};

type GameResultScreenProps = {
  /** 標題上方的插圖（如消消樂的迷你牌面） */
  hero?: React.ReactNode;
  /** 最上方的小標，如「遊戲結束」「時間到！」 */
  eyebrow: React.ReactNode;
  /** 小標下方的說明與輔助內容 */
  detail?: React.ReactNode;
  /** 大數字上方的說明，如「最終關卡」 */
  label?: string;
  value: React.ReactNode;
  /** 次要結果（如卡關未計分）以灰字、較小字級顯示 */
  valueMuted?: boolean;
  /** 大數字下方的標記，如「新紀錄！」 */
  badge?: React.ReactNode;
  stats?: ResultStat[];
  /** 統計格與主要按鈕之間：排名列、作答紀錄、分享等 */
  children?: React.ReactNode;
  backLabel: string;
  onBack: () => void;
  retryLabel: string;
  onRetry: () => void;
  className?: string;
};

/**
 * 單人模式結算畫面：上半部置中大數字，下半部統計格與操作，按鈕集中在拇指可及的底部。
 * 大數字以縮放彈入，reduced-motion 直接顯示
 */
export function GameResultScreen({
  hero,
  eyebrow,
  detail,
  label,
  value,
  valueMuted,
  badge,
  stats,
  children,
  backLabel,
  onBack,
  retryLabel,
  onRetry,
  className,
}: GameResultScreenProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      data-testid="game-result"
      className={cn(
        'mx-auto flex h-full w-full max-w-md flex-col gap-3.5 px-4 pt-4 pb-6',
        className,
      )}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
        {hero && <div className="mb-2">{hero}</div>}
        <h2
          className={cn(
            'flex items-center gap-1.5 [&_svg]:h-5 [&_svg]:w-5',
            hero
              ? 'text-[26px] font-black text-ink'
              : 'text-base font-bold text-ink-2',
          )}
        >
          {eyebrow}
        </h2>
        {detail}
        {label && (
          <span className="mt-1.5 text-[15px] font-bold text-ink-2">
            {label}
          </span>
        )}
        <motion.span
          data-testid="result-value"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className={cn(
            'font-display leading-[0.95] font-extrabold tracking-tight whitespace-nowrap tabular-nums',
            valueMuted
              ? 'text-[56px] text-ink-2'
              : 'text-[clamp(56px,22vw,88px)] text-ink',
          )}
        >
          {value}
        </motion.span>
        {badge && <div className="mt-1.5">{badge}</div>}
      </div>

      {stats && stats.length > 0 && (
        <div
          className="grid overflow-hidden rounded-2xl border border-line bg-surface"
          style={{
            gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))`,
          }}
        >
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={cn(
                'flex flex-col items-center gap-1.5 px-1 py-3.5',
                i > 0 && 'border-l border-line',
              )}
            >
              <span className="text-xs font-semibold text-ink-2">
                {stat.label}
              </span>
              <span
                className={cn(
                  'flex min-h-10 items-center font-display text-[28px] leading-none font-extrabold tabular-nums',
                  stat.muted ? 'text-ink-2' : 'text-ink',
                )}
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {children}

      <div className="flex gap-2.5">
        <Button
          variant="tactileOutline"
          className="flex-1 px-3"
          onClick={onBack}
        >
          {backLabel}
        </Button>
        <Button variant="tactile" className="flex-[1.3] px-3" onClick={onRetry}>
          {retryLabel}
        </Button>
      </div>
    </div>
  );
}

/** 「新紀錄！」標記：琥珀實心 + 星形圖示，不只靠顏色 */
export function RecordBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-7 items-center gap-[5px] rounded-full bg-amber px-2.5 text-[13px] font-bold whitespace-nowrap text-on-amber">
      <Star aria-hidden className="h-4 w-4" />
      {children}
    </span>
  );
}

/** 結算畫面的次要操作（作答紀錄、分享），平面按鈕 */
export function ResultSecondaryButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface text-sm font-bold text-ink transition-colors hover:bg-sunken disabled:opacity-50 [&_svg]:h-[18px] [&_svg]:w-[18px]',
        className,
      )}
      {...props}
    />
  );
}
