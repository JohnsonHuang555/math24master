'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, LogOut, RotateCcw } from 'lucide-react';
import { ExpressionBar } from '@/components/game/expression-bar';
import {
  EmptyCardSlot,
  numberCardVariants,
} from '@/components/game/number-card';
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
import { calculateAnswer } from '@/lib/utils';
import { MatchCell } from '@/models/MatchBoard';
import { SelectedCard } from '@/models/SelectedCard';

// 操作列的次要按鈕：與經典模式 puzzle-play-area.tsx 相同的平面樣式
const ACTION_BUTTON_CLASS =
  'h-12 flex-1 rounded-xl border border-line-strong bg-surface text-ink shadow-none hover:bg-sunken hover:text-ink';

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

  return (
    <div className="flex h-full flex-col items-center justify-between gap-3 px-4 py-4">
      {/* HUD 插槽 */}
      <div className="flex w-full max-w-sm flex-col items-center gap-1">
        {children}
      </div>

      {/* 4x4 牌面 */}
      <div className="grid w-full max-w-sm grid-cols-4 gap-2.5">
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
                data-testid="match-card"
                data-selected={selectedNumberIds.has(cell.card.id)}
                className={numberCardVariants({
                  size: 'md',
                  state: selectedNumberIds.has(cell.card.id)
                    ? 'selected'
                    : 'idle',
                })}
              >
                {cell.card.value}
              </motion.button>
            ) : (
              <EmptyCardSlot key={`empty-${cell.cellIndex}`} />
            ),
          )}
        </AnimatePresence>
      </div>

      {/* 算式列 + 即時預覽 */}
      <ExpressionBar
        className="max-w-sm"
        tokens={selectedCards}
        result={livePreview}
        // 一次最多選 4 張；不到 4 張時還可能再加牌，不判定為錯
        isFinal={selectedNumberIds.size >= 4}
        placeholder="點選 2~4 張牌和符號組成算式..."
      />

      {/* 符號列 */}
      <div className="flex gap-2">
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
                  className={ACTION_BUTTON_CLASS}
                  onClick={onClearSelection}
                  aria-label="清除所選取的牌"
                >
                  <RotateCcw className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>清除所選取的牌</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={ACTION_BUTTON_CLASS}
                  onClick={onBackStep}
                  aria-label="倒退一步"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>倒退一步</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={ACTION_BUTTON_CLASS}
                  onClick={() => setShowExitConfirm(true)}
                  aria-label="返回上一頁"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>返回上一頁</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        <Button variant="tactile" className="w-full" onClick={onSubmit}>
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
