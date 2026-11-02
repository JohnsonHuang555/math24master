'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, LogOut, RotateCcw, SkipForward } from 'lucide-react';
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
import { calculateAnswer } from '@/lib/utils';
import { NumberCard as NumberCardModel } from '@/models/Player';
import { SelectedCard } from '@/models/SelectedCard';

export type PuzzleTheme = 'blue' | 'orange' | 'emerald';

// 操作列的次要按鈕：平面樣式，厚度只留給數字牌與主 CTA
const ACTION_BUTTON_CLASS =
  'h-12 flex-1 rounded-xl border border-line-strong bg-surface text-ink shadow-none hover:bg-sunken hover:text-ink';

export interface PuzzlePlayAreaProps {
  currentNumbers: NumberCardModel[];
  selectedCards: SelectedCard[];
  onSelectCard: (card: SelectedCard) => void;
  onRemoveCard: (index: number) => void;
  onClearSelection: () => void;
  onSubmit: () => void;
  onSkip: () => void;
  onBack: () => void;
  showSkipButton?: boolean;
  /** 跳過懲罰的顯示文字（如 '-15 秒'），供 tooltip 與確認彈窗使用 */
  skipPenaltyText?: string;
  theme?: PuzzleTheme;
  children?: React.ReactNode;
  // Classic mode extensions
  submitLabel?: string;
  onBackStep?: () => void;
  hideExitButton?: boolean;
  footerSlot?: React.ReactNode;
}

export function PuzzlePlayArea({
  currentNumbers,
  selectedCards,
  onSelectCard,
  onRemoveCard,
  onClearSelection,
  onSubmit,
  onSkip,
  onBack,
  showSkipButton = false,
  skipPenaltyText = '−15 秒',
  children,
  submitLabel = '確認',
  onBackStep,
  hideExitButton = false,
  footerSlot,
}: PuzzlePlayAreaProps) {
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  // 選中角標顯示第幾個被選
  const selectedNumberOrder = new Map(
    selectedCards
      .filter(c => c.number)
      .map((c, i) => [c.number!.id, i + 1] as const),
  );

  // Live equation preview
  const livePreview = useMemo(() => {
    if (selectedCards.length === 0) return null;
    try {
      const result = calculateAnswer(selectedCards);
      if (typeof result !== 'number' || !isFinite(result)) return null;
      const rounded = Math.round(result * 1e9) / 1e9;
      return rounded;
    } catch {
      return null;
    }
  }, [selectedCards]);

  // When onBackStep is provided, chips are display-only (no per-chip remove)
  const chipsClickable = !onBackStep;

  return (
    <div className="flex h-full flex-col items-center justify-between gap-3 px-4 py-4">
      {/* HUD 插槽 (計時器 + 分數) */}
      <div className="flex w-full max-w-sm flex-col items-center gap-1">
        {children}
      </div>

      {/* 數字牌 */}
      <div className="flex gap-2 pt-2">
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
                state={order !== undefined ? 'selected' : 'idle'}
                order={order}
                onClick={() => onSelectCard({ number: card })}
                data-testid="hand-card"
                data-selected={order !== undefined}
              />
            </motion.div>
          );
        })}
      </div>

      {/* 算式列 + 即時預覽 */}
      <ExpressionBar
        className="max-w-sm"
        tokens={selectedCards}
        result={livePreview}
        isFinal={selectedNumberOrder.size === currentNumbers.length}
        placeholder="點選數字和符號組成算式..."
        onRemoveToken={chipsClickable ? onRemoveCard : undefined}
      />

      {/* 符號列 */}
      <div className="flex gap-2">
        <Symbols onClick={symbol => onSelectCard({ symbol })} />
      </div>

      {/* 操作列：圖示小按鈕 + 大 CTA */}
      <div className="flex w-full max-w-sm flex-col gap-2">
        <TooltipProvider>
          <div className="flex gap-2">
            {/* 清除 */}
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
            {/* 倒退一步 (classic mode) */}
            {onBackStep && (
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
            )}
            {/* 跳過 (挑戰模式) */}
            {showSkipButton && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={`${ACTION_BUTTON_CLASS} flex-col gap-0 leading-tight`}
                    onClick={onSkip}
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
            {/* 返回/離開 (隱藏時不顯示) */}
            {!hideExitButton && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={ACTION_BUTTON_CLASS}
                    onClick={() => setShowBackConfirm(true)}
                    aria-label="返回上一頁"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>返回上一頁</TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
        {/* 確認 / 出牌 CTA */}
        <Button
          variant="tactile"
          className="w-full"
          onClick={() => {
            if (selectedCards.length === 0) {
              setShowSkipConfirm(true);
            } else {
              onSubmit();
            }
          }}
        >
          {submitLabel}
        </Button>
        {/* 頁尾插槽 (classic: 跳過換牌) */}
        {footerSlot}
      </div>

      {/* 離開確認彈窗 */}
      <AlertDialog open={showBackConfirm} onOpenChange={setShowBackConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要離開？</AlertDialogTitle>
            <AlertDialogDescription>
              離開後本局進度將不會保存。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowBackConfirm(false)}>
              繼續遊戲
            </AlertDialogCancel>
            <AlertDialogAction onClick={onBack}>離開</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              取消
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
