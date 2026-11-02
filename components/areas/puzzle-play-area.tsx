'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Delete, RotateCcw, SkipForward } from 'lucide-react';
import { ExpressionBar } from '@/components/game/expression-bar';
import { NumberCard } from '@/components/game/number-card';
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
import { fadeVariants } from '@/lib/animation-variants';
import { calculateAnswer, cn } from '@/lib/utils';
import { NumberCard as NumberCardModel } from '@/models/Player';
import { SelectedCard } from '@/models/SelectedCard';

// 操作列的次要按鈕：平面樣式，厚度只留給數字牌與主 CTA
const ACTION_BUTTON_CLASS =
  'h-14 w-[52px] shrink-0 rounded-xl border border-line-strong bg-surface text-ink shadow-none hover:bg-sunken hover:text-ink';

export interface PuzzlePlayAreaProps {
  currentNumbers: NumberCardModel[];
  selectedCards: SelectedCard[];
  onSelectCard: (card: SelectedCard) => void;
  onRemoveCard: (index: number) => void;
  onClearSelection: () => void;
  onSubmit: () => void;
  onSkip: () => void;
  showSkipButton?: boolean;
  /** 跳過懲罰的顯示文字（如 '−15 秒'），供按鈕與確認彈窗使用 */
  skipPenaltyText?: string;
  /** 頂部 HUD */
  children?: React.ReactNode;
  /** HUD 與手牌之間的空白區，放計分明細等回饋 */
  stage?: React.ReactNode;
  submitLabel?: string;
  onBackStep?: () => void;
  /** 計分動畫中：所有操作 disabled，CTA 顯示 busyLabel */
  busy?: boolean;
  busyLabel?: string;
  footerSlot?: React.ReactNode;
}

/**
 * 經典與挑戰模式的遊戲版面：HUD 在上，手牌、算式、符號與操作集中在底部拇指區。
 * 算式等於 24 時主 CTA 加上勾勾與外圈，引導出牌
 */
export function PuzzlePlayArea({
  currentNumbers,
  selectedCards,
  onSelectCard,
  onRemoveCard,
  onClearSelection,
  onSubmit,
  onSkip,
  showSkipButton = false,
  skipPenaltyText = '−15 秒',
  children,
  stage,
  submitLabel = '確認',
  onBackStep,
  busy = false,
  busyLabel,
  footerSlot,
}: PuzzlePlayAreaProps) {
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // 選中角標顯示第幾個被選
  const selectedNumberOrder = new Map(
    selectedCards
      .filter(c => c.number)
      .map((c, i) => [c.number!.id, i + 1] as const),
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

  const usedAllCards = selectedNumberOrder.size === currentNumbers.length;
  const isReady =
    usedAllCards && livePreview !== null && Math.abs(livePreview - 24) < 1e-9;

  // 有倒退鍵時，算式格只供顯示，不另外提供點擊移除
  const chipsClickable = !onBackStep && !busy;

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col px-3 pt-2.5 pb-6 sm:px-4">
      <div className="flex w-full flex-col gap-1.5">{children}</div>

      <div className="flex min-h-4 flex-1 items-center justify-center py-3">
        {stage}
      </div>

      <div className="flex w-full flex-col gap-3">
        {/* 數字牌 */}
        <div
          className={cn(
            'flex justify-center gap-2 pt-2 transition-opacity',
            busy && 'pointer-events-none opacity-35',
          )}
        >
          {currentNumbers.map(card => {
            const order = selectedNumberOrder.get(card.id);
            return (
              <motion.div
                key={card.id}
                variants={fadeVariants}
                initial="hidden"
                animate="show"
              >
                <NumberCard
                  value={card.value}
                  state={
                    busy
                      ? 'disabled'
                      : order !== undefined
                        ? 'selected'
                        : 'idle'
                  }
                  order={busy ? undefined : order}
                  onClick={() => onSelectCard({ number: card })}
                  data-testid="hand-card"
                  data-selected={order !== undefined}
                />
              </motion.div>
            );
          })}
        </div>

        {!busy && (
          <>
            <ExpressionBar
              tokens={selectedCards}
              result={livePreview}
              isFinal={usedAllCards}
              placeholder="點選數字和符號組成算式..."
              onRemoveToken={chipsClickable ? onRemoveCard : undefined}
            />
            <div className="flex justify-center gap-2">
              <Symbols onClick={symbol => onSelectCard({ symbol })} />
            </div>
          </>
        )}

        {/* 操作列：平面次要按鈕 + 大 CTA */}
        <TooltipProvider>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={ACTION_BUTTON_CLASS}
                  onClick={onClearSelection}
                  disabled={busy}
                  aria-label="清除所選取的牌"
                >
                  <RotateCcw className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>清除所選取的牌</TooltipContent>
            </Tooltip>
            {onBackStep && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={ACTION_BUTTON_CLASS}
                    onClick={onBackStep}
                    disabled={busy}
                    aria-label="倒退一步"
                  >
                    <Delete className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>倒退一步</TooltipContent>
              </Tooltip>
            )}
            {showSkipButton && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      ACTION_BUTTON_CLASS,
                      'w-auto flex-col gap-0 px-2.5 leading-tight',
                    )}
                    onClick={onSkip}
                    disabled={busy}
                    aria-label={`跳過此題 (${skipPenaltyText})`}
                  >
                    {/* 直接顯示下次跳過扣幾秒，不只放在 tooltip */}
                    <span className="flex items-center gap-1 text-sm font-bold">
                      <SkipForward className="h-4 w-4" />
                      跳過
                    </span>
                    <span className="font-display text-[13px] font-bold text-danger-ink">
                      {skipPenaltyText}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>跳過此題 ({skipPenaltyText})</TooltipContent>
              </Tooltip>
            )}
            <Button
              variant="tactile"
              className={cn(
                'min-w-0 flex-1 gap-2',
                isReady &&
                  !busy &&
                  'shadow-[0_5px_0_0_var(--primary-edge),0_0_0_4px_var(--primary-tint)]',
              )}
              disabled={busy}
              onClick={() => {
                if (selectedCards.length === 0) {
                  setShowSkipConfirm(true);
                } else {
                  onSubmit();
                }
              }}
            >
              {isReady && !busy && <Check aria-hidden className="h-5 w-5" />}
              {busy ? (busyLabel ?? submitLabel) : submitLabel}
            </Button>
          </div>
        </TooltipProvider>
        {/* 頁尾插槽 (classic: 跳過換牌)；計分中保留高度避免版面跳動 */}
        <div className="flex min-h-11 justify-center">{footerSlot}</div>
      </div>

      {/* 未作答確認彈窗 */}
      <AlertDialog open={showSkipConfirm} onOpenChange={setShowSkipConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>未作答，確定要跳過？</AlertDialogTitle>
            <AlertDialogDescription>
              這題尚未作答。跳過後不會計分。
              {showSkipButton && `（跳過 ${skipPenaltyText}）`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowSkipConfirm(false)}>
              繼續作答
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowSkipConfirm(false);
                onSkip();
              }}
            >
              跳過
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
