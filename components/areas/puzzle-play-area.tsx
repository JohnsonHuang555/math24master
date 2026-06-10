'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, LogOut, RotateCcw, SkipForward } from 'lucide-react';
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
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { fadeVariants } from '@/lib/animation-variants';
import { calculateAnswer, cn } from '@/lib/utils';
import { NumberCard } from '@/models/Player';
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

export type PuzzleTheme = 'blue' | 'orange' | 'emerald';

// 全站色彩鎖：三種模式共用 teal 品牌 tokens（theme prop 保留 API 相容）
const BRAND_TOKENS = {
  cardSelected:
    'border-primary bg-primary text-primary-foreground shadow-[0_5px_0_0_hsl(175_84%_22%)] hover:border-red-400 hover:bg-red-400 hover:shadow-[0_5px_0_0_theme(colors.red.600)]',
  cardIdle:
    'border-zinc-200 bg-white text-zinc-800 shadow-[0_5px_0_0_rgba(0,0,0,0.08)] hover:border-primary/50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100',
  expressionBox:
    'border-zinc-200 bg-white shadow-[0_4px_0_0_rgba(0,0,0,0.05)] dark:border-zinc-700 dark:bg-zinc-900',
  iconBtn:
    'border-2 border-zinc-200 bg-white text-zinc-500 shadow-[0_3px_0_0_rgba(0,0,0,0.06)] hover:bg-zinc-50 hover:text-primary active:translate-y-0.5 active:shadow-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400',
};

const THEME_TOKENS: Record<PuzzleTheme, typeof BRAND_TOKENS> = {
  blue: BRAND_TOKENS,
  orange: BRAND_TOKENS,
  emerald: BRAND_TOKENS,
};

export interface PuzzlePlayAreaProps {
  currentNumbers: NumberCard[];
  selectedCards: SelectedCard[];
  onSelectCard: (card: SelectedCard) => void;
  onRemoveCard: (index: number) => void;
  onClearSelection: () => void;
  onSubmit: () => void;
  onSkip: () => void;
  onBack: () => void;
  showSkipButton?: boolean;
  theme?: PuzzleTheme;
  children?: React.ReactNode;
  // Classic mode extensions
  submitLabel?: string;
  onBackStep?: () => void;
  hideExitButton?: boolean;
  footerSlot?: React.ReactNode;
  compact?: boolean;
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
  theme = 'blue',
  children,
  submitLabel = '確認',
  onBackStep,
  hideExitButton = false,
  footerSlot,
  compact = false,
}: PuzzlePlayAreaProps) {
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  const t = THEME_TOKENS[theme];

  const selectedNumberIds = new Set(
    selectedCards.filter(c => c.number).map(c => c.number!.id),
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

  const isCorrect = livePreview !== null && Math.abs(livePreview - 24) < 1e-9;

  // Card size classes
  const cardSizeClass = compact
    ? 'w-[60px] h-[84px] sm:w-[68px] sm:h-[95px]'
    : 'w-[72px] h-[100px] sm:w-[80px] sm:h-[112px]';

  // When onBackStep is provided, chips are display-only (no per-chip remove)
  const chipsClickable = !onBackStep;

  return (
    <div className="flex h-full flex-col items-center justify-between gap-3 px-4 py-4">
      {/* HUD 插槽 (計時器 + 分數) */}
      <div className="max-w-sm w-full flex flex-col items-center gap-1">
        {children}
      </div>

      {/* 數字牌 */}
      <div className="flex gap-3">
        {currentNumbers.map(card => {
          const isSelected = selectedNumberIds.has(card.id);
          return (
            <motion.div
              key={card.id}
              variants={fadeVariants}
              initial="hidden"
              animate="show"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.96 }}
            >
              <Card
                onClick={() => onSelectCard({ number: card })}
                className={cn(
                  'flex cursor-pointer select-none items-center justify-center rounded-2xl border-2 font-display text-3xl font-bold transition-all sm:text-4xl',
                  cardSizeClass,
                  isSelected ? t.cardSelected : t.cardIdle,
                )}
              >
                {card.value}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* 算式列 + 即時預覽 */}
      <div className={cn(
        'flex w-full max-w-sm flex-col gap-1 rounded-2xl border-2 px-4 py-3',
        t.expressionBox,
      )}>
        <div className="min-h-[32px] flex flex-wrap items-center gap-1.5">
          {selectedCards.length === 0 ? (
            <span className="text-sm text-muted-foreground">點選數字和符號組成算式...</span>
          ) : (
            selectedCards.map((card, i) => (
              <motion.button
                key={i}
                variants={fadeVariants}
                initial="hidden"
                animate="show"
                onClick={chipsClickable ? () => onRemoveCard(i) : undefined}
                className={cn(
                  'rounded-lg px-3 py-1.5 font-display text-2xl transition-colors',
                  chipsClickable
                    ? 'cursor-pointer bg-zinc-100 hover:bg-red-100 hover:text-red-600 dark:bg-zinc-800'
                    : 'cursor-default bg-zinc-100 dark:bg-zinc-800',
                )}
                title={chipsClickable ? '點擊移除' : undefined}
              >
                {cardLabel(card)}
              </motion.button>
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

      {/* 操作列：圖示小按鈕 + 大 CTA */}
      <div className="w-full max-w-sm flex flex-col gap-2">
        <TooltipProvider>
          <div className="flex gap-2">
            {/* 清除 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn('flex-1 h-10', t.iconBtn)}
                  onClick={onClearSelection}
                >
                  <RotateCcw className="h-4 w-4" />
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
                    className={cn('flex-1 h-10', t.iconBtn)}
                    onClick={onBackStep}
                  >
                    <ArrowLeft className="h-4 w-4" />
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
                    className={cn('flex-1 h-10', t.iconBtn)}
                    onClick={onSkip}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>跳過此題 (-15 秒)</TooltipContent>
              </Tooltip>
            )}
            {/* 返回/離開 (隱藏時不顯示) */}
            {!hideExitButton && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn('flex-1 h-10', t.iconBtn)}
                    onClick={() => setShowBackConfirm(true)}
                  >
                    <LogOut className="h-4 w-4" />
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
          className="h-12 w-full text-base"
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
            <AlertDialogAction onClick={onBack}>
              離開
            </AlertDialogAction>
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
              {showSkipButton && '（跳過 -15 秒）'}
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
