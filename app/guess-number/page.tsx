'use client';

import { memo, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGuessNumber } from '@/hooks/useGuessNumber';
import type { HistoryEntry } from '@/hooks/useGuessNumber';
import type { ClueCard } from '@/lib/guess-number';
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

function ClueCardButton({
  card,
  selected,
  disabled,
  onClick,
}: {
  card: ClueCard;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const isPeek = card.id === 'peek';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-[100px] flex-1 flex-col items-center justify-center rounded-xl border-2 px-2 py-3 text-center transition-all',
        isPeek
          ? 'border-amber-300 bg-amber-50 hover:border-amber-400 dark:border-amber-700 dark:bg-gray-800'
          : selected
            ? 'border-teal-500 bg-teal-500 text-white'
            : 'border-gray-200 bg-white hover:border-teal-400 dark:border-gray-700 dark:bg-gray-800',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      <span className="text-sm font-bold leading-tight">{card.name}</span>
      <span
        className={cn(
          'mt-1 text-xs leading-tight',
          isPeek
            ? 'text-amber-500 dark:text-amber-400'
            : selected
              ? 'text-teal-100'
              : 'text-gray-500 dark:text-gray-400',
        )}
      >
        {'question' in card ? card.question : card.description}
      </span>
    </button>
  );
}

function HistoryChips({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) return null;
  return (
    <div className="w-full max-w-lg">
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
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
    selectCard,
    submitGuess,
    nextRound,
    restart,
  } = useGuessNumber();

  const [inputValue, setInputValue] = useState('');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const prevRoundCountRef = useRef(0);
  useEffect(() => {
    if (roundCount > prevRoundCountRef.current && !gameOver) {
      toast.error('猜錯了！', { autoClose: 2000 });
    }
    prevRoundCountRef.current = roundCount;
  }, [roundCount, gameOver]);

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
    if (card.id === 'peek') return peekUsed || isRoundGuessed || gameOver;
    return lineCardAreaDisabled || gameOver;
  };

  const handleSelectCard = (card: ClueCard, idx: number) => {
    if (card.id !== 'peek') {
      setSelectedIdx(idx);
    } else {
      setSelectedIdx(null);
    }
    selectCard(card);
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
        <div className="w-16" />
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
                    {'question' in selectedCard ? selectedCard.question : ''}
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
              : '選擇一張牌使用'}
        </p>
        <div className="flex gap-2">
          {visibleCards.map((card, i) => (
            <ClueCardButton
              key={`${card.id}-${i}-${roundCount}`}
              card={card}
              selected={selectedIdx === i}
              disabled={getCardDisabled(card)}
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
            className="text-center text-lg font-bold"
            maxLength={2}
          />
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="shrink-0 bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-40"
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
