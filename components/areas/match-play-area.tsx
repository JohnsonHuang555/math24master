'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, LogOut, RotateCcw } from 'lucide-react';
import Symbols from '@/components/symbols';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { calculateAnswer, cn } from '@/lib/utils';
import { MatchCell } from '@/models/MatchBoard';
import { SelectedCard } from '@/models/SelectedCard';
import { Symbol } from '@/models/Symbol';

function cardLabel(card: SelectedCard): string {
  if (card.number) return String(card.number.value);
  switch (card.symbol) {
    case Symbol.Times:
      return '×';
    case Symbol.Divide:
      return '÷';
    default:
      return card.symbol ?? '';
  }
}

// 沿用經典模式 puzzle-play-area.tsx 的牌面/操作列色彩 token，維持全站牌面樣式一致
const TOKENS = {
  cardSelected:
    'border-primary bg-primary text-primary-foreground shadow-[0_5px_0_0_hsl(175_84%_22%)] hover:border-red-400 hover:bg-red-400 hover:shadow-[0_5px_0_0_theme(colors.red.600)]',
  cardIdle:
    'border-zinc-200 bg-white text-zinc-800 shadow-[0_5px_0_0_rgba(0,0,0,0.08)] hover:border-primary/50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100',
  cardEmpty: 'border-dashed border-zinc-200 opacity-40 dark:border-zinc-700',
  expressionBox:
    'border-zinc-200 bg-white shadow-[0_4px_0_0_rgba(0,0,0,0.05)] dark:border-zinc-700 dark:bg-zinc-900',
  iconBtn:
    'border-2 border-zinc-200 bg-white text-zinc-500 shadow-[0_3px_0_0_rgba(0,0,0,0.06)] hover:bg-zinc-50 hover:text-primary active:translate-y-0.5 active:shadow-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400',
};

export interface MatchPlayAreaProps {
  cells: MatchCell[];
  selectedCards: SelectedCard[];
  onSelectCard: (card: SelectedCard) => void;
  onClearSelection: () => void;
  onBackStep: () => void;
  onSubmit: () => void;
  onRestart: () => void;
  onExit: () => void;
  children?: React.ReactNode; // HUD 插槽（分數/剩餘張數）
}

export function MatchPlayArea({
  cells,
  selectedCards,
  onSelectCard,
  onClearSelection,
  onBackStep,
  onSubmit,
  onRestart,
  onExit,
  children,
}: MatchPlayAreaProps) {
  const reduceMotion = useReducedMotion();
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const selectedNumberIds = new Set(
    selectedCards.filter(c => c.number).map(c => c.number!.id),
  );

  const livePreview = useMemo(() => {
    if (selectedCards.length === 0) return null;
    try {
      const result = calculateAnswer(selectedCards);
      if (typeof result !== 'number' || !isFinite(result)) return null;
      return Math.round(result * 1e9) / 1e9;
    } catch {
      return null;
    }
  }, [selectedCards]);

  const isCorrect = livePreview !== null && Math.abs(livePreview - 24) < 1e-9;

  return (
    <div className="flex h-full flex-col items-center justify-between gap-3 px-4 py-4">
      {/* HUD 插槽 */}
      <div className="flex w-full max-w-sm flex-col items-center gap-1">
        {children}
      </div>

      {/* 4x4 牌面 */}
      <div className="grid w-full max-w-sm grid-cols-4 gap-3">
        <AnimatePresence mode="popLayout">
          {cells.map(cell =>
            cell.card ? (
              <motion.button
                key={cell.card.id}
                layout
                initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.4, transition: { duration: 0.25 } }
                }
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 190, damping: 16 }
                }
                onClick={() => onSelectCard({ number: cell.card! })}
                className={cn(
                  'aspect-square cursor-pointer select-none rounded-2xl border-2 font-display text-3xl font-semibold transition-colors',
                  selectedNumberIds.has(cell.card.id)
                    ? TOKENS.cardSelected
                    : TOKENS.cardIdle,
                )}
              >
                {cell.card.value}
              </motion.button>
            ) : (
              <div
                key={`empty-${cell.cellIndex}`}
                className={cn(
                  'aspect-square rounded-2xl border-2',
                  TOKENS.cardEmpty,
                )}
              />
            ),
          )}
        </AnimatePresence>
      </div>

      {/* 算式列 + 即時預覽 */}
      <div
        className={cn(
          'flex w-full max-w-sm flex-col gap-1 rounded-2xl border-2 px-4 py-3',
          TOKENS.expressionBox,
        )}
      >
        <div className="flex min-h-[32px] flex-wrap items-center gap-1.5">
          {selectedCards.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              點選 2~4 張牌和符號組成算式...
            </span>
          ) : (
            selectedCards.map((card, i) => (
              <motion.span
                key={i}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="cursor-default rounded-lg bg-zinc-100 px-3 py-1.5 font-display text-2xl dark:bg-zinc-800"
              >
                {cardLabel(card)}
              </motion.span>
            ))
          )}
        </div>
        <AnimatePresence>
          {livePreview !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'text-right font-display text-lg font-bold',
                isCorrect ? 'text-primary' : 'text-red-400',
              )}
            >
              = {livePreview} {isCorrect ? '✓' : '✗'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 符號列 */}
      <div className="flex gap-2.5">
        <Symbols onClick={symbol => onSelectCard({ symbol })} />
      </div>

      {/* 操作列 */}
      <div className="flex w-full max-w-sm flex-col gap-2">
        <TooltipProvider>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn('h-10 flex-1', TOKENS.iconBtn)}
                  onClick={onClearSelection}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>清除所選取的牌</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn('h-10 flex-1', TOKENS.iconBtn)}
                  onClick={onBackStep}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>倒退一步</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn('h-10 flex-1', TOKENS.iconBtn)}
                  onClick={() => setShowExitConfirm(true)}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>返回上一頁</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        <Button
          variant="tactile"
          className="h-12 w-full text-base"
          onClick={onSubmit}
        >
          確認消除
        </Button>

        <button
          className="py-1 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setShowRestartConfirm(true)}
        >
          重新開局
        </button>
      </div>

      {/* 重新開局確認彈窗 */}
      <AlertDialog
        open={showRestartConfirm}
        onOpenChange={setShowRestartConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>要放棄目前牌局嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              將會開始新的一局，目前的進度不會保留。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowRestartConfirm(false)}>
              繼續這局
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowRestartConfirm(false);
                onRestart();
              }}
            >
              重新開局
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 離開確認彈窗 */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要離開？</AlertDialogTitle>
            <AlertDialogDescription>
              離開後本局進度將不會保存。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowExitConfirm(false)}>
              繼續遊戲
            </AlertDialogCancel>
            <AlertDialogAction onClick={onExit}>離開</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
