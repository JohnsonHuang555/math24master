'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, SkipForward } from 'lucide-react';
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

export type PuzzleTheme = 'blue' | 'orange';

const THEME_TOKENS: Record<PuzzleTheme, {
  cardSelected: string;
  expressionBorder: string;
  confirmBtn: string;
  timerColor: string;
  timerLow: string;
  iconBtn: string;
}> = {
  blue: {
    cardSelected: 'bg-blue-200 text-blue-900 ring-2 ring-blue-400 hover:bg-red-100 hover:text-red-600 hover:ring-red-400',
    expressionBorder: 'border-blue-200 dark:border-blue-800',
    confirmBtn: 'bg-blue-500 hover:bg-blue-600 text-white',
    timerColor: 'text-blue-600 dark:text-blue-400',
    timerLow: 'text-red-500',
    iconBtn: 'border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400',
  },
  orange: {
    cardSelected: 'bg-orange-200 text-orange-900 ring-2 ring-orange-400 hover:bg-red-100 hover:text-red-600 hover:ring-red-400',
    expressionBorder: 'border-orange-200 dark:border-orange-800',
    confirmBtn: 'bg-orange-500 hover:bg-orange-600 text-white',
    timerColor: 'text-orange-600 dark:text-orange-400',
    timerLow: 'text-red-500',
    iconBtn: 'border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400',
  },
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

  return (
    <div className="flex h-full flex-col items-center justify-between gap-3 px-4 py-4">
      {/* HUD 插槽 (計時器 + 分數) */}
      <div className="w-full flex flex-col items-center gap-1">
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
                  'flex w-[72px] h-[100px] cursor-pointer items-center justify-center text-3xl font-bold transition-all select-none',
                  'sm:w-[80px] sm:h-[112px]',
                  isSelected ? t.cardSelected : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700',
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
        t.expressionBorder,
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
                onClick={() => onRemoveCard(i)}
                className="rounded-md bg-slate-200 dark:bg-slate-700 px-2.5 py-0.5 text-sm font-semibold hover:bg-red-100 hover:text-red-600 transition-colors"
                title="點擊移除"
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
                'text-right text-base font-bold',
                isCorrect ? 'text-green-500' : 'text-red-400',
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
        <div className="flex gap-2">
          {/* 返回 */}
          <Button
            variant="outline"
            size="icon"
            className={cn('flex-1 h-10', t.iconBtn)}
            onClick={() => setShowBackConfirm(true)}
            title="回上一頁"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {/* 清除 */}
          <Button
            variant="outline"
            size="icon"
            className={cn('flex-1 h-10', t.iconBtn)}
            onClick={onClearSelection}
            title="清除算式"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          {/* 跳過 (挑戰模式) */}
          {showSkipButton && (
            <Button
              variant="outline"
              size="icon"
              className={cn('flex-1 h-10', t.iconBtn)}
              onClick={onSkip}
              title="跳過 (-15s)"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          )}
        </div>
        {/* 確認 CTA */}
        <Button
          className={cn('w-full h-12 text-base font-semibold', t.confirmBtn)}
          onClick={() => {
            if (selectedCards.length === 0) {
              setShowSkipConfirm(true);
            } else {
              onSubmit();
            }
          }}
        >
          確認
        </Button>
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
