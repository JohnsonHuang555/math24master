'use client';

import { memo, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { toast } from 'react-toastify';
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
import { Input } from '@/components/ui/input';
import { useGuessNumber } from '@/hooks/useGuessNumber';
import type { HistoryEntry } from '@/hooks/useGuessNumber';
import type { ClueCard, LineClueCard } from '@/lib/guess-number';
import { cn } from '@/lib/utils';

const NumberBoard = memo(function NumberBoard({
  remaining,
  guessedNumbers,
}: {
  remaining: number[];
  guessedNumbers: number[];
}) {
  const remainingSet = new Set(remaining);
  const guessedSet = new Set(guessedNumbers);
  return (
    <div className="grid grid-cols-10 gap-1">
      {Array.from({ length: 90 }, (_, i) => i + 10).map(n => (
        <div
          key={n}
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded text-[10px] font-medium transition-colors',
            guessedSet.has(n)
              ? 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-400 dark:bg-yellow-900/40 dark:text-yellow-300'
              : remainingSet.has(n)
                ? 'bg-white text-gray-800 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700'
                : 'bg-gray-100 text-gray-300 dark:bg-gray-900 dark:text-gray-600',
          )}
        >
          {n}
        </div>
      ))}
    </div>
  );
});

function formatCardQuestion(card: LineClueCard, lastGuess: number | null): string {
  if (card.id === 'higher-than-last' && lastGuess !== null) {
    return `謎底比你上一次猜的（${lastGuess}）大嗎？`;
  }
  if (card.id === 'within-ten' && lastGuess !== null) {
    return `謎底和你上次猜的（${lastGuess}）相差在 10 以內嗎？`;
  }
  return card.question;
}

function ClueCardButton({
  card,
  selected,
  disabled,
  lastGuess,
  onClick,
}: {
  card: ClueCard;
  selected: boolean;
  disabled: boolean;
  lastGuess: number | null;
  onClick: () => void;
}) {
  const isPeek = card.id === 'peek';
  const isRedraw = card.id === 'redraw';
  const displayText =
    'question' in card
      ? formatCardQuestion(card, lastGuess)
      : card.description;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-[100px] flex-1 flex-col items-center justify-center rounded-xl border-2 px-2 py-3 text-center outline-none transition-all focus:outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent]',
        isRedraw
          ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-gray-800'
          : isPeek
            ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-gray-800'
            : selected
              ? 'border-teal-500 bg-teal-500 text-white'
              : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      <span className="text-sm font-bold leading-tight">{card.name}</span>
      <span
        className={cn(
          'mt-1 text-xs leading-tight',
          isRedraw
            ? 'text-blue-500 dark:text-blue-400'
            : isPeek
              ? 'text-amber-500 dark:text-amber-400'
              : selected
                ? 'text-teal-100'
                : 'text-gray-500 dark:text-gray-400',
        )}
      >
        {displayText}
      </span>
    </button>
  );
}

function HistoryChips({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) return null;
  return (
    <div className="w-full max-w-lg">
      <div className="flex gap-1.5 overflow-x-auto px-0.5 py-1 scrollbar-none">
        {history.map((e, i) => {
          if (e.type === 'clue') {
            return (
              <span
                key={i}
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium',
                  e.result === 'yes'
                    ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:ring-teal-800'
                    : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-800',
                )}
              >
                {e.question.replace('謎底', '').replace('嗎？', '')}
                {e.result === 'yes' ? ' ✓' : ' ✗'}
              </span>
            );
          }
          if (e.type === 'peek') {
            return (
              <span
                key={i}
                className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800"
              >
                🔍
              </span>
            );
          }
          if (e.type === 'guess') {
            return (
              <span
                key={i}
                className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                猜{e.number}
              </span>
            );
          }
        })}
      </div>
    </div>
  );
}

function ProgressDots({ roundCount }: { roundCount: number }) {
  const filledClass =
    roundCount >= 9
      ? 'bg-red-500'
      : roundCount >= 7
        ? 'bg-amber-500'
        : 'bg-teal-500';
  const currentClass =
    roundCount >= 9
      ? 'bg-red-300 animate-pulse'
      : roundCount >= 7
        ? 'bg-amber-300 animate-pulse'
        : 'bg-teal-300 animate-pulse';

  return (
    <div className="flex gap-1.5">
      {Array.from({ length: 10 }, (_, i) => {
        if (i < roundCount) {
          return (
            <div key={i} className={cn('h-2 flex-1 rounded-full', filledClass)} />
          );
        }
        if (i === roundCount) {
          return (
            <div key={i} className={cn('h-2 flex-1 rounded-full', currentClass)} />
          );
        }
        return (
          <div
            key={i}
            className="h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700"
          />
        );
      })}
    </div>
  );
}

export default function GuessNumberPage() {
  const {
    answer,
    remaining,
    guessedNumbers,
    drawnCards,
    roundCount,
    peekUsed,
    peekActive,
    isPeeking,
    selectedCard,
    clueResult,
    isRoundGuessed,
    isWin,
    gameOver,
    rating,
    history,
    isMounted,
    lastGuess,
    redrawUsed,
    redrawnThisRound,
    selectCard,
    submitGuess,
    nextRound,
    restart,
  } = useGuessNumber();

  const [inputValue, setInputValue] = useState('');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [pendingCard, setPendingCard] = useState<ClueCard | null>(null);
  const [pendingIdx, setPendingIdx] = useState<number | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesMarked, setNotesMarked] = useState<Set<number>>(new Set());

  const prevRoundCountRef = useRef(0);
  const prevClueResultRef = useRef<'yes' | 'no' | null>(null);
  useEffect(() => {
    if (roundCount > prevRoundCountRef.current && !gameOver) {
      toast.error('猜錯了！', { autoClose: 2000 });
    }
    prevRoundCountRef.current = roundCount;
  }, [roundCount, gameOver]);

  useEffect(() => {
    if (clueResult !== null && prevClueResultRef.current === null) {
      toast.success('線索獲得！現在可以輸入猜測了', { autoClose: 2500 });
    }
    prevClueResultRef.current = clueResult;
  }, [clueResult]);

  const parsedGuess = parseInt(inputValue, 10);
  const isValidInput =
    !isNaN(parsedGuess) && parsedGuess >= 10 && parsedGuess <= 99;
  const alreadyGuessed = isValidInput && guessedNumbers.includes(parsedGuess);

  const canSubmit =
    isValidInput &&
    (peekActive || (selectedCard !== null && selectedCard.id !== 'peek')) &&
    !isRoundGuessed &&
    !gameOver;

  const lineCardAreaDisabled = isRoundGuessed || selectedCard !== null || peekActive;

  const getCardDisabled = (card: ClueCard) => {
    if (card.id === 'peek') return peekUsed || isRoundGuessed || gameOver || selectedCard !== null;
    if (card.id === 'redraw') return redrawUsed || redrawnThisRound || isRoundGuessed || gameOver || selectedCard !== null;
    return lineCardAreaDisabled || gameOver;
  };

  const handleSelectCard = (card: ClueCard, idx: number) => {
    setPendingCard(card);
    setPendingIdx(idx);
  };

  const handleConfirmCard = () => {
    if (!pendingCard) return;
    if (pendingCard.id !== 'peek' && pendingCard.id !== 'redraw') {
      setSelectedIdx(pendingIdx);
    } else {
      setSelectedIdx(null);
    }
    selectCard(pendingCard);
    setPendingCard(null);
    setPendingIdx(null);
  };

  const toggleNoteMark = (n: number) => {
    setNotesMarked(prev => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    submitGuess(parsedGuess);
    setInputValue('');
  };

  const handleNextRound = () => {
    nextRound();
    setInputValue('');
    setSelectedIdx(null);
  };

  const handleRestart = () => {
    prevRoundCountRef.current = 0;
    restart();
    setInputValue('');
    setSelectedIdx(null);
    setPendingCard(null);
    setPendingIdx(null);
  };

  const visibleCards = drawnCards.filter(c => !(c.id === 'peek' && peekUsed));

  if (!isMounted) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <p className="text-muted-foreground">載入中...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col items-center gap-5 px-4 py-6">
      {/* 標題列 */}
      <div className="flex w-full max-w-lg items-center justify-between">
        <Link
          href="/"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← 回首頁
        </Link>
        <h1 className="text-xl font-bold">猜數字</h1>
        <button
          onClick={() => setNotesOpen(true)}
          className="flex h-8 w-16 items-center justify-end gap-1 text-muted-foreground outline-none [-webkit-tap-highlight-color:transparent] hover:text-foreground"
        >
          <BookOpen size={16} />
          <span className="text-xs">筆記</span>
        </button>
      </div>

      {/* 謎題展示區 */}
      <AnimatePresence mode="wait">
        {isPeeking ? (
          <motion.div
            key="peek-open"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-lg rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-gray-900"
          >
            <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">
              透視中… 候選範圍（{remaining.length} 個）
            </p>
            <NumberBoard remaining={remaining} guessedNumbers={guessedNumbers} />
            <motion.div
              className="mt-2 h-1 rounded-full bg-amber-400"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 5, ease: 'linear' }}
            />
            <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded bg-white ring-1 ring-gray-300 dark:bg-gray-800" />
                候選
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded bg-gray-100 dark:bg-gray-900" />
                排除
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded bg-yellow-100 ring-1 ring-yellow-400" />
                已猜
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="peek-closed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-lg rounded-xl border border-gray-200 bg-gray-50 px-6 py-5 text-center dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="text-7xl font-black tracking-tighter text-gray-200 dark:text-gray-700">
              ??
            </div>
            <div className="mt-2 text-2xl font-bold text-teal-600 dark:text-teal-400">
              剩 {remaining.length} 個候選
            </div>
            <div className="mt-1 text-xs text-gray-400">謎底是 10–99 之間的數字</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 進度指示器 */}
      <div className="w-full max-w-lg">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            第 {roundCount + 1} / 10 回合
          </span>
          <span className="text-xs text-muted-foreground">
            已排除 {90 - remaining.length} 個
          </span>
        </div>
        <ProgressDots roundCount={roundCount} />
      </div>

      {/* 歷史 chip 列 */}
      <HistoryChips history={history} />

      {/* 線索結果 banner */}
      <div className="w-full max-w-lg">
        <AnimatePresence>
          {clueResult !== null &&
            selectedCard !== null &&
            selectedCard.id !== 'peek' && (
              <motion.div
                key="clue-banner"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3',
                  clueResult === 'yes'
                    ? 'border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-900/20'
                    : 'border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/20',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      'text-xs font-semibold',
                      clueResult === 'yes' ? 'text-teal-600' : 'text-rose-600',
                    )}
                  >
                    {'name' in selectedCard ? selectedCard.name : ''}
                  </div>
                  <div className="truncate text-sm text-gray-600 dark:text-gray-400">
                    {'question' in selectedCard
                      ? formatCardQuestion(selectedCard as LineClueCard, lastGuess)
                      : ''}
                  </div>
                </div>
                <div
                  className={cn(
                    'shrink-0 text-3xl font-black',
                    clueResult === 'yes' ? 'text-teal-500' : 'text-rose-500',
                  )}
                >
                  {clueResult === 'yes' ? '✓' : '✗'}
                </div>
              </motion.div>
            )}
          {redrawnThisRound && !clueResult && !peekActive && (
            <motion.div
              key="redraw-banner"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20"
            >
              <span className="text-2xl">🔄</span>
              <div>
                <div className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                  全面革新
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-500">
                  已換牌，請選線索牌
                </div>
              </div>
            </motion.div>
          )}
          {peekActive && !clueResult && (
            <motion.div
              key="peek-banner"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20"
            >
              <span className="text-2xl">🔍</span>
              <div>
                <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                  透視鏡
                </div>
                <div className="text-sm text-amber-600 dark:text-amber-500">
                  已使用，請直接輸入猜測
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 選牌區 */}
      <div className="w-full max-w-lg">
        <p className="mb-2 text-sm text-muted-foreground">
          {peekActive
            ? '透視鏡已使用，請輸入猜測數字'
            : selectedCard !== null && selectedCard.id !== 'peek'
              ? '已選牌，請輸入猜測數字'
              : redrawnThisRound
                ? '已換牌，請選線索牌'
                : '選擇一張牌使用'}
        </p>
        <div className="flex gap-2">
          {visibleCards.map((card, i) => (
            <ClueCardButton
              key={`${card.id}-${i}-${roundCount}`}
              card={card}
              selected={selectedIdx === i}
              disabled={getCardDisabled(card)}
              lastGuess={lastGuess}
              onClick={() => handleSelectCard(card, i)}
            />
          ))}
        </div>
      </div>

      {/* 猜測輸入 */}
      <div className="w-full max-w-lg">
        <div className="flex gap-2">
          <Input
            inputMode="numeric"
            placeholder="輸入 10–99"
            value={inputValue}
            onChange={e => setInputValue(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            disabled={
              (!peekActive &&
                (selectedCard === null || selectedCard.id === 'peek')) ||
              isRoundGuessed ||
              gameOver
            }
            className="flex-[3] text-center text-lg font-bold"
            maxLength={2}
          />
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-40"
          >
            送出
          </Button>
        </div>
        <AnimatePresence>
          {alreadyGuessed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-1 text-sm text-yellow-500"
            >
              你已猜過 {parsedGuess}，可繼續送出
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* 下一回合 */}
      <AnimatePresence>
        {isRoundGuessed && !gameOver && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-lg"
          >
            <Button
              className="w-full bg-teal-500 text-white hover:bg-teal-600"
              onClick={handleNextRound}
            >
              下一回合 →
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 選牌確認彈窗 */}
      <AlertDialog
        open={pendingCard !== null}
        onOpenChange={open => {
          if (!open) {
            setPendingCard(null);
            setPendingIdx(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>使用這張牌？</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCard?.name}
              {pendingCard && ' — '}
              {pendingCard &&
                ('question' in pendingCard ? pendingCard.question : pendingCard.description)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCard}
              className="bg-teal-500 text-white hover:bg-teal-600"
            >
              確認使用
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 筆記抽屜 */}
      <AnimatePresence>
        {notesOpen && (
          <>
            <motion.div
              key="notes-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNotesOpen(false)}
              className="fixed inset-0 z-40 bg-black/30"
            />
            <motion.div
              key="notes-drawer"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl dark:bg-gray-900"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold">筆記</h2>
                <div className="flex gap-4">
                  <button
                    onClick={() => setNotesMarked(new Set())}
                    className="text-xs text-gray-400 outline-none [-webkit-tap-highlight-color:transparent] hover:text-gray-600"
                  >
                    清除全部
                  </button>
                  <button
                    onClick={() => setNotesOpen(false)}
                    className="text-xs text-gray-400 outline-none [-webkit-tap-highlight-color:transparent] hover:text-gray-600"
                  >
                    關閉
                  </button>
                </div>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">點擊數字標記候選，再次點擊取消</p>
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-10 sm:gap-1">
                {Array.from({ length: 90 }, (_, i) => i + 10).map(n => (
                  <button
                    key={n}
                    onClick={() => toggleNoteMark(n)}
                    className={cn(
                      'flex h-11 w-full items-center justify-center rounded text-xs font-medium transition-colors outline-none sm:h-8 [-webkit-tap-highlight-color:transparent]',
                      notesMarked.has(n)
                        ? 'bg-teal-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 結算畫面 */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          >
            <div
              className={cn(
                'w-full max-w-sm rounded-2xl border-2 bg-white p-6 text-center dark:bg-gray-900',
                isWin ? 'border-teal-500' : 'border-rose-500',
              )}
            >
              <p className="mb-1 text-sm text-muted-foreground">謎底是</p>
              <div
                className={cn(
                  'mb-1 text-6xl font-black',
                  isWin
                    ? 'text-teal-600 dark:text-teal-400'
                    : 'text-rose-600 dark:text-rose-400',
                )}
              >
                {answer}
              </div>
              <div className="mb-2 text-sm text-muted-foreground">
                共 {roundCount} 回合
              </div>
              <div className="mb-6 text-2xl font-bold">{rating}</div>
              <Button
                className={cn(
                  'w-full text-white',
                  isWin
                    ? 'bg-teal-500 hover:bg-teal-600'
                    : 'bg-rose-500 hover:bg-rose-600',
                )}
                onClick={handleRestart}
              >
                再玩一次
              </Button>
              <Link
                href="/"
                className="mt-3 block text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                回首頁
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
