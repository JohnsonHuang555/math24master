'use client';

import { useEffect } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import { BookOpen, ChevronLeft, Flag, Layers, Volume2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';

type GameHudProps = {
  modeLabel: string;
  score: number;
  /** 牌庫或牌面剩餘張數；最後一輪時改顯示旗標 */
  remaining?: number;
  isLastRound?: boolean;
  onExit?: () => void;
  onOpenRules?: () => void;
  className?: string;
};

/**
 * 遊戲頂部 HUD：模式名稱、分數（數字滾動）、剩餘張數、規則。
 * 剩餘張數只用圖示＋數字表示以省寬度；音效鈕先預留位置，未來啟用
 */
export function GameHud({
  modeLabel,
  score,
  remaining,
  isLastRound,
  onExit,
  onOpenRules,
  className,
}: GameHudProps) {
  const t = useTranslations('GameUI.hud');

  const reduceMotion = useReducedMotion();
  const count = useMotionValue(score);
  const rounded = useTransform(count, Math.round);
  useEffect(() => {
    if (reduceMotion) {
      count.set(score);
      return;
    }
    const controls = animate(count, score, { duration: 0.3 });
    return () => controls.stop();
  }, [count, score, reduceMotion]);

  return (
    <div
      className={cn(
        'flex w-full items-center gap-2 rounded-2xl border border-line bg-surface p-2',
        className,
      )}
    >
      {onExit && (
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 text-ink-2"
          onClick={onExit}
          aria-label={t('exit')}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}
      <div className={cn('flex min-w-0 flex-1 flex-col', !onExit && 'pl-2')}>
        <span className="truncate text-xs font-semibold text-ink-2">
          {modeLabel}
        </span>
        <span className="flex items-baseline">
          <motion.span className="font-display text-[28px] leading-none font-extrabold text-ink tabular-nums">
            {rounded}
          </motion.span>
          <span className="ml-1 text-[15px] font-bold text-ink-2">
            {t('pointsUnit')}
          </span>
        </span>
      </div>

      {isLastRound ? (
        <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-amber px-2.5 text-[13px] font-bold whitespace-nowrap text-on-amber">
          <Flag aria-hidden className="h-4 w-4" />
          {t('lastRound')}
        </span>
      ) : (
        remaining !== undefined && (
          <span
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-sunken px-2.5 text-ink"
            aria-label={t('remaining', { count: remaining })}
          >
            <Layers aria-hidden className="h-4 w-4" />
            <span className="font-display text-[15px] font-bold tabular-nums">
              {remaining}
            </span>
          </span>
        )
      )}

      {onOpenRules && (
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 text-ink-2"
          onClick={onOpenRules}
          aria-label={t('rules')}
        >
          <BookOpen className="h-5 w-5" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 shrink-0 text-ink-2"
        disabled
        aria-label={t('soundComingSoon')}
      >
        <Volume2 className="h-5 w-5" />
      </Button>
    </div>
  );
}

type GameDesktopBarProps = {
  title: React.ReactNode;
  /** 有分數的模式顯示「得分 N」 */
  score?: number;
  remaining?: number;
  isLastRound?: boolean;
  /** 分數右側的額外資訊（如計時、回合數） */
  center?: React.ReactNode;
  onExit?: () => void;
  /** 離開鈕的文字，預設「離開」；不在對局中的頁面可改成「首頁」 */
  exitLabel?: string;
  onOpenRules?: () => void;
  /** 規則右側的額外按鈕（如提前結算） */
  actions?: React.ReactNode;
  className?: string;
};

/**
 * 桌機（lg 以上）遊戲頁的頂部整條工具列：離開（Esc）、模式名稱、得分與剩餘張數置中、右側規則。
 * 手機版用 GameHud
 */
export function GameDesktopBar({
  title,
  score,
  remaining,
  isLastRound,
  center,
  onExit,
  exitLabel,
  onOpenRules,
  actions,
  className,
}: GameDesktopBarProps) {
  const t = useTranslations('GameUI.hud');
  const reduceMotion = useReducedMotion();
  const count = useMotionValue(score ?? 0);
  const rounded = useTransform(count, Math.round);
  useEffect(() => {
    if (score === undefined) return;
    if (reduceMotion) {
      count.set(score);
      return;
    }
    const controls = animate(count, score, { duration: 0.3 });
    return () => controls.stop();
  }, [count, score, reduceMotion]);

  return (
    <header
      className={cn(
        'flex h-16 items-center gap-2 border-b border-line bg-surface/75 px-6',
        className,
      )}
    >
      {onExit && (
        <Button
          variant="ghost"
          className="h-11 gap-1.5 px-3 text-sm font-semibold text-ink"
          onClick={onExit}
        >
          <ChevronLeft className="h-5 w-5" />
          {exitLabel ?? t('exit')}
          <Kbd>Esc</Kbd>
        </Button>
      )}
      <strong className="ml-1.5 text-[17px] whitespace-nowrap text-ink">
        {title}
      </strong>
      <span className="flex-1" />
      {score !== undefined && (
        <span className="flex items-baseline gap-1.5">
          <span className="text-[13px] font-semibold text-ink-2">
            {t('scoreLabel')}
          </span>
          <motion.span className="font-display text-[32px] leading-none font-extrabold text-ink tabular-nums">
            {rounded}
          </motion.span>
        </span>
      )}
      {isLastRound ? (
        <span className="ml-3.5 inline-flex h-[34px] items-center gap-1.5 rounded-full bg-amber px-3 text-sm font-bold whitespace-nowrap text-on-amber">
          <Flag aria-hidden className="h-4 w-4" />
          {t('lastRound')}
        </span>
      ) : (
        remaining !== undefined && (
          <span className="ml-3.5 inline-flex h-[34px] items-center gap-1.5 rounded-full bg-sunken px-3 text-sm font-bold whitespace-nowrap text-ink">
            <Layers aria-hidden className="h-4 w-4" />
            {t.rich('remainingRich', {
              count: remaining,
              n: chunks => (
                <span className="font-display text-base">{chunks}</span>
              ),
            })}
          </span>
        )
      )}
      {center}
      <span className="flex-1" />
      {onOpenRules && (
        <Button
          variant="ghost"
          className="h-11 gap-1.5 px-3 text-sm font-semibold text-ink"
          onClick={onOpenRules}
        >
          <BookOpen className="h-5 w-5" />
          {t('rules')}
        </Button>
      )}
      {actions}
    </header>
  );
}
