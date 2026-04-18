'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
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

export interface PuzzlePlayAreaProps {
  currentNumbers: NumberCard[];
  selectedCards: SelectedCard[];
  onSelectCard: (card: SelectedCard) => void;
  onRemoveCard: (index: number) => void;
  onClearSelection: () => void;
  onSubmit: () => void;
  onSkip: () => void;
  // Challenge: quitGame() 後導回；Level: 同語意，行為由父層決定
  onBack: () => void;
  // Challenge=true（按鈕常駐）；Level=false（跳過藏在空答案 dialog）
  showSkipButton?: boolean;
  // 插入標頭區域
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
  children,
}: PuzzlePlayAreaProps) {
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  const selectedNumberIds = new Set(
    selectedCards.filter(c => c.number).map(c => c.number!.id),
  );

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-4 px-2">
      {/* 標頭插槽 */}
      {children}

      {/* 數字牌 */}
      <div className="flex gap-4">
        {currentNumbers.map(card => {
          const isSelected = selectedNumberIds.has(card.id);
          return (
            <motion.div
              key={card.id}
              variants={fadeVariants}
              initial="hidden"
              animate="show"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 1 }}
            >
              <Card
                onClick={() => onSelectCard({ number: card })}
                className={`flex aspect-[5/7] min-w-[70px] cursor-pointer items-center justify-center text-3xl font-bold transition-all md:min-w-[85px] ${
                  isSelected
                    ? 'bg-blue-300 text-blue-900 ring-2 ring-blue-500 hover:bg-red-100 hover:text-red-600 hover:ring-red-400'
                    : 'bg-slate-200 hover:bg-slate-300'
                }`}
              >
                {card.value}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* 已選卡牌列 */}
      <div className="flex min-h-[52px] w-full max-w-md flex-wrap items-center gap-2 rounded-xl border p-2">
        {selectedCards.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            點選數字和符號組成算式...
          </span>
        ) : (
          selectedCards.map((card, i) => (
            <motion.button
              key={i}
              variants={fadeVariants}
              initial="hidden"
              animate="show"
              onClick={() => onRemoveCard(i)}
              className="rounded-md bg-slate-200 px-3 py-1 text-sm font-semibold hover:bg-red-100 hover:text-red-600 transition-colors"
              title="點擊移除"
            >
              {cardLabel(card)}
            </motion.button>
          ))
        )}
      </div>

      {/* 符號列 */}
      <div className="flex gap-3">
        <Symbols onClick={symbol => onSelectCard({ symbol })} />
      </div>

      {/* 操作按鈕 */}
      <div className="grid w-full max-w-md grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => setShowBackConfirm(true)}>
          回上一頁
        </Button>
        <Button variant="secondary" onClick={onClearSelection}>
          清除
        </Button>
        {showSkipButton && (
          <Button variant="outline" onClick={onSkip}>
            跳過
          </Button>
        )}
        <Button
          className={showSkipButton ? '' : 'col-span-2'}
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
