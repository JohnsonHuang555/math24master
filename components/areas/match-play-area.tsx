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
import { Kbd } from '@/components/ui/kbd';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useGameKeyboard } from '@/hooks/useGameKeyboard';
import { calculateAnswer, cn } from '@/lib/utils';
import { MatchCell } from '@/models/MatchBoard';
import { SelectedCard } from '@/models/SelectedCard';

// 操作列的次要按鈕：與經典模式 puzzle-play-area.tsx 相同（手機圖示鈕、桌機加文字）
const ACTION_BUTTON_CLASS =
  'h-14 w-[52px] shrink-0 gap-2 rounded-xl border border-line-strong bg-surface text-ink shadow-none hover:bg-sunken hover:text-ink lg:h-[60px] lg:w-auto lg:flex-1 lg:rounded-2xl lg:border-2 lg:px-[18px] lg:text-base lg:font-bold lg:shadow-[0_4px_0_0_var(--line-strong)]';

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
  children?: React.ReactNode; // 手機 HUD 插槽（分數/剩餘張數）
  /** 桌機頂部整條工具列 */
  desktopBar?: React.ReactNode;
  /** 桌機按 Esc 時觸發 */
  onEscape?: () => void;
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
  desktopBar,
  onEscape,
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

  // 桌機鍵盤：符號、⌫ 倒退、Enter 確認、Esc 離開（牌要用滑鼠或 Tab 選）
  useGameKeyboard(true, {
    onSymbol: symbol => onSelectCard({ symbol }),
    onBackspace: onBackStep,
    onEnter: onSubmit,
    onEscape,
  });

  return (
    <div className="flex h-full flex-col">
      {desktopBar && <div className="hidden lg:block">{desktopBar}</div>}
      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col px-3 pt-2.5 pb-5 sm:px-4 lg:max-w-none lg:flex-row lg:items-center lg:justify-center lg:gap-14 lg:p-6">
        <div
          className={cn(
            'flex w-full flex-col gap-1',
            desktopBar && 'lg:hidden',
          )}
        >
          {children}
        </div>

        {/* 4x4 牌面；桌機放在面板裡 */}
        <div className="relative flex flex-1 items-start justify-center pt-3.5 pb-3 lg:flex-none lg:rounded-3xl lg:border lg:border-line lg:bg-surface lg:p-6">
          <div
            role="grid"
            aria-label="牌局"
            className="grid w-full max-w-[330px] grid-cols-4 gap-x-3 gap-y-2.5 lg:w-auto lg:max-w-none lg:grid-cols-[repeat(4,112px)] lg:gap-4"
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

        <div className="flex w-full flex-col gap-2.5 lg:w-[440px] lg:gap-5">
          <ExpressionBar
            tokens={selectedCards}
            result={livePreview}
            // 一次最多選 4 張；不到 4 張時還可能再加牌，不判定為錯
            isFinal={selectedNumberIds.size >= 4}
            placeholder="點選 2~4 張牌和符號組成算式..."
          />

          <div className="flex justify-center gap-2 lg:justify-between">
            <Symbols
              showShortcuts
              onClick={symbol => onSelectCard({ symbol })}
            />
          </div>

          <TooltipProvider>
            <div className="flex flex-wrap gap-2 lg:gap-3">
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
                    <span className="hidden lg:inline">清除</span>
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
                    <span className="hidden lg:inline">倒退</span>
                    <Kbd>⌫</Kbd>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>倒退一步</TooltipContent>
              </Tooltip>
              <Button
                variant="tactile"
                className={cn(
                  'min-w-0 flex-1 gap-2 lg:h-[60px] lg:basis-full lg:rounded-2xl',
                  isReady &&
                    'shadow-[0_5px_0_0_var(--primary-edge),0_0_0_4px_var(--primary-tint)]',
                )}
                onClick={onSubmit}
              >
                {isReady && <Check aria-hidden className="h-5 w-5" />}
                確認消除
                <Kbd>Enter</Kbd>
              </Button>
            </div>
          </TooltipProvider>

          <Button
            variant="ghost"
            className="h-9 gap-1.5 self-center px-3 text-sm font-bold text-ink-2 hover:bg-sunken hover:text-ink lg:h-11 lg:self-start lg:px-0 lg:hover:bg-transparent"
            onClick={() => setShowRestartConfirm(true)}
          >
            <Shuffle aria-hidden className="h-4 w-4" />
            重新開局
          </Button>
          <p className="hidden items-center gap-1.5 text-[13px] text-ink-2 lg:flex">
            符號直接按鍵盤 · <Kbd>⌫</Kbd> 倒退 · <Kbd>Enter</Kbd> 確認
          </p>
        </div>
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
