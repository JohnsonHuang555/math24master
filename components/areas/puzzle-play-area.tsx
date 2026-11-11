'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Delete, RotateCcw, SkipForward } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
import { Kbd } from '@/components/ui/kbd';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useGameKeyboard } from '@/hooks/useGameKeyboard';
import { fadeVariants } from '@/lib/animation-variants';
import { calculateAnswer, cn } from '@/lib/utils';
import { NumberCard as NumberCardModel } from '@/models/Player';
import { SelectedCard } from '@/models/SelectedCard';

/**
 * 操作列的次要按鈕：手機為 52px 平面圖示鈕；桌機加上文字標籤，改成有厚度的外框鈕
 */
export const ACTION_BUTTON_CLASS =
  'h-14 w-[52px] shrink-0 gap-2 rounded-xl border border-line-strong bg-surface text-ink shadow-none hover:bg-sunken hover:text-ink lg:h-[60px] lg:w-auto lg:rounded-2xl lg:border-2 lg:px-[18px] lg:text-base lg:font-bold lg:shadow-[0_4px_0_0_var(--line-strong)]';

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
  /** 手機頂部 HUD；桌機改用 desktopBar */
  children?: React.ReactNode;
  /** 桌機頂部整條工具列 */
  desktopBar?: React.ReactNode;
  /** 手機在 HUD 下方、桌機在牌的上方（挑戰模式的計時器） */
  banner?: React.ReactNode;
  /** 桌機右側欄（經典模式的本局作答） */
  aside?: React.ReactNode;
  /** HUD 與手牌之間的空白區，放計分明細等回饋 */
  stage?: React.ReactNode;
  submitLabel?: string;
  onBackStep?: () => void;
  /** 桌機按 Esc 時觸發（通常是打開離開確認） */
  onEscape?: () => void;
  /** 計分動畫中：所有操作 disabled，CTA 顯示 busyLabel */
  busy?: boolean;
  busyLabel?: string;
  /** 手機在操作列下方、桌機排進操作列（經典模式的跳過換牌） */
  footerSlot?: React.ReactNode;
}

/**
 * 經典與挑戰模式的遊戲版面。
 * 手機：HUD 在上，手牌、算式、符號與操作集中在底部拇指區。
 * 桌機：頂部整條工具列，中間 640px 欄位放大牌面，可用鍵盤操作（1–4、符號、⌫、Enter、Esc）
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
  skipPenaltyText: skipPenaltyTextProp,
  children,
  desktopBar,
  banner,
  aside,
  stage,
  submitLabel: submitLabelProp,
  onBackStep,
  onEscape,
  busy = false,
  busyLabel,
  footerSlot,
}: PuzzlePlayAreaProps) {
  const t = useTranslations('GameUI.puzzle');
  const tTimer = useTranslations('GameUI.timer');
  const skipPenaltyText =
    skipPenaltyTextProp ?? tTimer('delta', { sign: '−', seconds: 15 });
  const submitLabel = submitLabelProp ?? t('submit');
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

  const handleSubmit = () => {
    if (selectedCards.length === 0) {
      setShowSkipConfirm(true);
    } else {
      onSubmit();
    }
  };

  useGameKeyboard(!busy, {
    onDigit: index => {
      const card = currentNumbers[index];
      if (card) onSelectCard({ number: card });
    },
    onSymbol: symbol => onSelectCard({ symbol }),
    onBackspace: onBackStep,
    onEnter: handleSubmit,
    onEscape,
  });

  return (
    <div className="flex h-full flex-col">
      {desktopBar && <div className="hidden lg:block">{desktopBar}</div>}

      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col px-3 pt-2.5 pb-6 sm:px-4 lg:max-w-none lg:flex-row lg:gap-6 lg:p-6">
        <div className="flex min-w-0 flex-1 flex-col lg:items-center lg:justify-center lg:gap-6">
          <div
            className={cn(
              'flex w-full flex-col gap-1.5',
              desktopBar && 'lg:hidden',
            )}
          >
            {children}
          </div>
          {banner && (
            <div className="mt-1.5 w-full lg:mt-0 lg:w-[640px]">{banner}</div>
          )}

          <div className="flex min-h-4 flex-1 items-center justify-center py-3 lg:w-[640px] lg:flex-none lg:py-0">
            {stage}
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-[640px] lg:items-center lg:gap-6">
            {/* 數字牌 */}
            <div
              className={cn(
                'flex justify-center gap-2 pt-2 transition-opacity lg:gap-4 lg:pt-3',
                busy && 'pointer-events-none opacity-35',
              )}
            >
              {currentNumbers.map((card, index) => {
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
                      shortcut={String(index + 1)}
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
                  placeholder={t('placeholder')}
                  onRemoveToken={chipsClickable ? onRemoveCard : undefined}
                />
                <div className="flex justify-center gap-2 lg:gap-2.5">
                  <Symbols
                    showShortcuts
                    onClick={symbol => onSelectCard({ symbol })}
                  />
                </div>
              </>
            )}

            {/* 操作列：手機為平面圖示鈕 + 大 CTA；桌機加上文字與快捷鍵 */}
            <TooltipProvider>
              <div className="flex w-full flex-wrap gap-2 lg:flex-nowrap lg:gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className={ACTION_BUTTON_CLASS}
                      onClick={onClearSelection}
                      disabled={busy}
                      aria-label={t('clearSelection')}
                    >
                      <RotateCcw className="h-5 w-5" />
                      <span className="hidden lg:inline">{t('clear')}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('clearSelection')}</TooltipContent>
                </Tooltip>
                {onBackStep && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className={ACTION_BUTTON_CLASS}
                        onClick={onBackStep}
                        disabled={busy}
                        aria-label={t('undoStep')}
                      >
                        <Delete className="h-5 w-5" />
                        <span className="hidden lg:inline">{t('undo')}</span>
                        <Kbd>⌫</Kbd>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('undoStep')}</TooltipContent>
                  </Tooltip>
                )}
                {showSkipButton && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          ACTION_BUTTON_CLASS,
                          'w-auto flex-col gap-0 px-2.5 leading-tight lg:flex-row lg:gap-2',
                        )}
                        onClick={onSkip}
                        disabled={busy}
                        aria-label={t('skipQuestion', {
                          penalty: skipPenaltyText,
                        })}
                      >
                        {/* 直接顯示下次跳過扣幾秒，不只放在 tooltip */}
                        <span className="flex items-center gap-1 text-sm font-bold lg:text-base">
                          <SkipForward className="h-4 w-4 lg:h-5 lg:w-5" />
                          {t('skip')}
                        </span>
                        <span className="font-display text-[13px] font-bold text-danger-ink lg:text-base lg:font-extrabold">
                          {skipPenaltyText}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t('skipQuestion', { penalty: skipPenaltyText })}
                    </TooltipContent>
                  </Tooltip>
                )}
                <Button
                  variant="tactile"
                  className={cn(
                    'min-w-0 flex-1 gap-2 lg:order-last lg:h-[60px] lg:rounded-2xl',
                    isReady &&
                      !busy &&
                      'shadow-[0_5px_0_0_var(--primary-edge),0_0_0_4px_var(--primary-tint)]',
                  )}
                  disabled={busy}
                  onClick={handleSubmit}
                >
                  {isReady && !busy && (
                    <Check aria-hidden className="h-5 w-5" />
                  )}
                  {busy ? (busyLabel ?? submitLabel) : submitLabel}
                  {!busy && <Kbd>Enter</Kbd>}
                </Button>
                {/* 頁尾插槽（經典：跳過換牌）；手機排在操作列下方、計分中保留高度，桌機排進操作列 */}
                <div className="flex min-h-11 basis-full justify-center lg:basis-auto lg:empty:hidden">
                  {footerSlot}
                </div>
              </div>
            </TooltipProvider>
          </div>
        </div>

        {aside && (
          <aside className="hidden w-[300px] shrink-0 flex-col gap-3 rounded-[20px] border border-line bg-surface p-5 lg:flex">
            {aside}
          </aside>
        )}
      </div>

      {/* 未作答確認彈窗 */}
      <AlertDialog open={showSkipConfirm} onOpenChange={setShowSkipConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('skipConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('skipConfirmDescription')}
              {showSkipButton &&
                t('skipConfirmPenalty', { penalty: skipPenaltyText })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowSkipConfirm(false)}>
              {t('keepAnswering')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowSkipConfirm(false);
                onSkip();
              }}
            >
              {t('skip')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
