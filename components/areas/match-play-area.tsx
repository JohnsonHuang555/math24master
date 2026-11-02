'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Delete, RotateCcw, Shuffle } from 'lucide-react';
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
import { calculateAnswer, cn } from '@/lib/utils';
import { MatchCell } from '@/models/MatchBoard';
import { SelectedCard } from '@/models/SelectedCard';

// 操作列的次要按鈕：與經典模式 puzzle-play-area.tsx 相同的平面樣式
const ACTION_BUTTON_CLASS =
  'h-14 w-[52px] shrink-0 rounded-xl border border-line-strong bg-surface text-ink shadow-none hover:bg-sunken hover:text-ink';

export interface MatchPlayAreaProps {
  cells: MatchCell[];
  selectedCards: SelectedCard[];
  onSelectCard: (card: SelectedCard) => void;
  onClearSelection: () => void;
  onBackStep: () => void;
  onSubmit: () => void;
  onRestart: () => void;
  /** 蓋在牌面上的回饋（消除得分） */
  boardOverlay?: React.ReactNode;
  children?: React.ReactNode; // HUD 插槽（分數/剩餘張數）
}

/**
 * 消消樂版面：HUD、4×4 牌面緊接在上方，算式、符號與操作固定在底部。
 * 被消除的牌縮小淡出，原位留下虛線空位；reduced-motion 直接消失
 */
export function MatchPlayArea({
  cells,
  selectedCards,
  onSelectCard,
  onClearSelection,
  onBackStep,
  onSubmit,
  onRestart,
  boardOverlay,
  children,
}: MatchPlayAreaProps) {
  const reduceMotion = useReducedMotion();
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

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

  const isReady =
    selectedNumberIds.size >= 2 &&
    livePreview !== null &&
    Math.abs(livePreview - 24) < 1e-9;

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col px-3 pt-2.5 pb-5 sm:px-4">
      <div className="flex w-full flex-col gap-1">{children}</div>

      {/* 4x4 牌面 */}
      <div className="relative flex flex-1 items-start justify-center pt-3.5 pb-3">
        <div
          role="grid"
          aria-label="牌局"
          className="grid w-full max-w-[330px] grid-cols-4 gap-x-3 gap-y-2.5"
        >
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
                      ? { opacity: 0, transition: { duration: 0 } }
                      : {
                          opacity: 0,
                          scale: 0.4,
                          transition: { duration: 0.25 },
                        }
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
        {boardOverlay}
      </div>

      <div className="flex w-full flex-col gap-2.5">
        <ExpressionBar
          tokens={selectedCards}
          result={livePreview}
          // 一次最多選 4 張；不到 4 張時還可能再加牌，不判定為錯
          isFinal={selectedNumberIds.size >= 4}
          placeholder="點選 2~4 張牌和符號組成算式..."
        />

        <div className="flex justify-center gap-2">
          <Symbols onClick={symbol => onSelectCard({ symbol })} />
        </div>

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
                  <Delete className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>倒退一步</TooltipContent>
            </Tooltip>
            <Button
              variant="tactile"
              className={cn(
                'min-w-0 flex-1 gap-2',
                isReady &&
                  'shadow-[0_5px_0_0_var(--primary-edge),0_0_0_4px_var(--primary-tint)]',
              )}
              onClick={onSubmit}
            >
              {isReady && <Check aria-hidden className="h-5 w-5" />}
              確認消除
            </Button>
          </div>
        </TooltipProvider>

        <Button
          variant="ghost"
          className="h-9 gap-1.5 self-center px-3 text-sm font-bold text-ink-2 hover:bg-sunken hover:text-ink"
          onClick={() => setShowRestartConfirm(true)}
        >
          <Shuffle aria-hidden className="h-4 w-4" />
          重新開局
        </Button>
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
    </div>
  );
}
