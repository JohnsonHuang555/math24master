'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  BookOpen,
  NotebookPen,
  ScanEye,
  Shuffle,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { BackToHomeButton } from '@/components/back-to-home-button';
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
import { useGuessNumber } from '@/hooks/useGuessNumber';
import type { HistoryEntry } from '@/hooks/useGuessNumber';
import { Link } from '@/i18n/navigation';
import type { ClueCard, GuessRating, LineClueCard } from '@/lib/guess-number';
import { cn } from '@/lib/utils';

/** 評級的顯示文字、對應回合數與五格評級條的格數 */
const RATING_INFO: Record<
  GuessRating,
  { label: string; rounds: string; level: number }
> = {
  lucky: { label: '運氣爆棚！', rounds: '1 回合', level: 5 },
  genius: { label: '邏輯天才！', rounds: '2–3 回合', level: 4 },
  steady: { label: '穩健推理', rounds: '4–6 回合', level: 3 },
  close: { label: '快追上了', rounds: '7–10 回合', level: 2 },
  keepGoing: { label: '再接再厲', rounds: '10 回合以上', level: 1 },
  miss: { label: '下次再試', rounds: '未猜中', level: 0 },
};

const RULE_RATINGS: GuessRating[] = [
  'lucky',
  'genius',
  'steady',
  'close',
  'miss',
];

function RatingBar({
  level,
  className,
}: {
  level: number;
  className?: string;
}) {
  return (
    <span aria-hidden className={cn('flex gap-1.5', className)}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-2.5 flex-1 rounded-full',
            i < level ? 'bg-primary' : 'bg-line',
          )}
        />
      ))}
    </span>
  );
}

/** 透視鏡的數字盤：剩餘、排除、已猜三種狀態，排除與已猜不只靠顏色（刪除線、粗框） */
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
            'flex aspect-square items-center justify-center rounded font-display text-[11px] font-bold',
            guessedSet.has(n)
              ? 'border-2 border-amber bg-surface text-ink'
              : remainingSet.has(n)
                ? 'border border-line-strong bg-surface text-ink'
                : 'bg-sunken text-ink-2/60 line-through',
          )}
        >
          {n}
        </div>
      ))}
    </div>
  );
});

function formatCardQuestion(
  card: LineClueCard,
  lastGuess: number | null,
): string {
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
  const isSpecial = card.id === 'peek' || card.id === 'redraw';
  const displayText =
    'question' in card ? formatCardQuestion(card, lastGuess) : card.description;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        'flex min-h-[128px] w-[132px] shrink-0 flex-col gap-1.5 rounded-2xl border-2 p-3 text-left transition-[translate,box-shadow] duration-[90ms] [-webkit-tap-highlight-color:transparent] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
        selected
          ? '-translate-y-1.5 border-primary-edge bg-primary text-primary-foreground shadow-[0_5px_0_0_var(--primary-edge)]'
          : isSpecial
            ? 'border-amber bg-amber-tint text-ink shadow-[0_4px_0_0_var(--amber)]'
            : 'border-playcard-line bg-playcard text-playcard-ink shadow-[0_4px_0_0_var(--playcard-edge)]',
        disabled
          ? selected
            ? 'cursor-default'
            : 'cursor-not-allowed opacity-40'
          : 'active:translate-y-0.5 active:shadow-none',
      )}
    >
      {isSpecial && (
        <span className="flex items-center gap-1 text-[11px] font-extrabold text-amber-ink">
          <Sparkles aria-hidden className="h-3.5 w-3.5" />
          特殊 · 限 1 次
        </span>
      )}
      <span className="text-base leading-tight font-extrabold">
        {card.name}
      </span>
      <span
        className={cn(
          'text-[13px] leading-snug',
          selected ? 'text-primary-foreground/85' : 'text-ink-2',
        )}
      >
        {displayText}
      </span>
    </button>
  );
}

function YesNoPill({ result }: { result: 'yes' | 'no' }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-1.5 text-[11px] font-extrabold',
        result === 'yes'
          ? 'bg-primary-ink text-white'
          : 'border border-line-strong bg-sunken text-ink',
      )}
    >
      {result === 'yes' ? '是' : '否'}
    </span>
  );
}

function HistoryChips({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) return null;
  return (
    <div
      aria-label="歷史紀錄"
      className="flex scrollbar-none gap-1.5 overflow-x-auto px-4 py-1"
    >
      {history.map((e, i) => {
        const chip =
          'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[13px] font-semibold text-ink';
        if (e.type === 'clue') {
          return (
            <span key={i} className={chip}>
              <span className="text-ink-2">{e.round}</span>
              {e.question.replace('謎底', '').replace('嗎？', '')}
              <YesNoPill result={e.result} />
            </span>
          );
        }
        if (e.type === 'peek') {
          return (
            <span key={i} className={chip}>
              <ScanEye aria-hidden className="h-4 w-4 text-amber-ink" />
              透視鏡
            </span>
          );
        }
        return (
          <span key={i} className={chip}>
            <span className="font-display text-sm font-bold">
              猜 {e.number}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** 回合進度：最後幾回合加上警示圖示，不只靠顏色變化 */
function ProgressBar({ roundCount }: { roundCount: number }) {
  const isLate = roundCount >= 7;
  return (
    <div aria-hidden className="flex gap-1">
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 flex-1 rounded-[3px]',
            i < roundCount
              ? isLate
                ? 'bg-amber'
                : 'bg-primary'
              : i === roundCount
                ? 'bg-primary/45'
                : 'bg-line',
          )}
        />
      ))}
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
  const [notesColumns, setNotesColumns] = useState<5 | 6>(5);
  const [dragSelectMode, setDragSelectMode] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  const prevRoundCountRef = useRef(0);
  const prevClueResultRef = useRef<'yes' | 'no' | null>(null);
  const dragModeRef = useRef<boolean | null>(null);
  const draggedSetRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (roundCount > prevRoundCountRef.current && !gameOver) {
      toast.error('猜錯了！', { duration: 2000 });
    }
    prevRoundCountRef.current = roundCount;
  }, [roundCount, gameOver]);

  useEffect(() => {
    if (clueResult !== null && prevClueResultRef.current === null) {
      toast.success('線索獲得！現在可以輸入猜測了', { duration: 2500 });
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

  const lineCardAreaDisabled =
    isRoundGuessed || selectedCard !== null || peekActive;

  const getCardDisabled = (card: ClueCard) => {
    if (card.id === 'peek')
      return peekUsed || isRoundGuessed || gameOver || selectedCard !== null;
    if (card.id === 'redraw')
      return (
        redrawUsed ||
        redrawnThisRound ||
        isRoundGuessed ||
        gameOver ||
        selectedCard !== null
      );
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

  const getNumFromTarget = (el: HTMLElement | null): number | null => {
    while (el) {
      const attr = (el as HTMLElement & { dataset: DOMStringMap }).dataset
        ?.noteNum;
      if (attr !== undefined) return Number(attr);
      el = el.parentElement;
    }
    return null;
  };

  const applyNoteDrag = (n: number, mark: boolean) => {
    setNotesMarked(prev => {
      const next = new Set(prev);
      if (mark) next.add(n);
      else next.delete(n);
      return next;
    });
  };

  const handleNotesPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const num = getNumFromTarget(e.target as HTMLElement);
    if (num === null) return;
    if (dragSelectMode) {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragModeRef.current = !notesMarked.has(num);
      draggedSetRef.current = new Set([num]);
      applyNoteDrag(num, dragModeRef.current);
    } else {
      applyNoteDrag(num, !notesMarked.has(num));
    }
  };

  const handleToggleDragSelect = () => {
    setDragSelectMode(prev => !prev);
    dragModeRef.current = null;
    draggedSetRef.current.clear();
  };

  const handleNotesPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragModeRef.current === null) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const num = getNumFromTarget(el as HTMLElement);
    if (num === null || draggedSetRef.current.has(num)) return;
    draggedSetRef.current.add(num);
    applyNoteDrag(num, dragModeRef.current);
  };

  const handleNotesPointerUp = () => {
    dragModeRef.current = null;
    draggedSetRef.current.clear();
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
        <p className="text-ink-2">載入中...</p>
      </div>
    );
  }

  // ── 結算畫面 ──
  if (gameOver && rating) {
    const info = RATING_INFO[rating];
    return (
      <div className="mx-auto flex h-full w-full max-w-md flex-col gap-3.5 px-4 pt-4 pb-6">
        <div className="flex flex-1 flex-col items-center justify-center gap-2.5 text-center">
          <span className="text-base font-bold text-ink-2">謎底是</span>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className={cn(
              'flex h-[140px] w-[140px] items-center justify-center rounded-[28px] border-[3px] bg-playcard',
              isWin
                ? 'border-primary shadow-[0_6px_0_0_var(--primary-edge)]'
                : 'border-danger shadow-[0_6px_0_0_var(--danger-ink)]',
            )}
          >
            <span className="font-display text-[80px] leading-none font-extrabold text-playcard-ink">
              {answer}
            </span>
          </motion.div>
          <h2 className="mt-2.5 text-2xl font-black text-ink">
            {isWin ? '猜中了！' : '沒猜中'}
          </h2>
          <span className="text-[15px] text-ink-2">
            共{' '}
            <b className="font-display text-xl font-extrabold text-ink">
              {roundCount}
            </b>{' '}
            回合
          </span>
          <RatingBar level={info.level} className="mt-2 w-[220px]" />
          <span className="text-sm font-bold text-ink">
            {info.label} · {info.rounds}
          </span>
        </div>
        <div className="flex gap-2.5">
          <Button variant="tactileOutline" className="flex-1 px-3" asChild>
            <Link href="/">回首頁</Link>
          </Button>
          <Button
            variant="tactile"
            className="flex-[1.3] px-3"
            onClick={handleRestart}
          >
            再玩一次
          </Button>
        </div>
      </div>
    );
  }

  const isGuessing =
    peekActive || (selectedCard !== null && selectedCard.id !== 'peek');
  const hint = peekActive
    ? '透視鏡已使用，請輸入猜測數字'
    : selectedCard !== null && selectedCard.id !== 'peek'
      ? '已選牌，請輸入猜測數字'
      : redrawnThisRound
        ? '已換牌，請選線索牌'
        : '選擇一張牌使用';

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col">
      {/* 標題列 */}
      <header className="flex items-center gap-0.5 px-2 pt-2">
        <BackToHomeButton />
        <h1 className="flex-1 pl-1 text-[17px] font-extrabold text-ink">
          猜數字
        </h1>
        <Button
          variant="ghost"
          className="h-11 gap-1.5 px-2.5 text-sm font-bold text-ink"
          onClick={() => setNotesOpen(true)}
        >
          <NotebookPen className="h-5 w-5" />
          筆記
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 text-ink"
          onClick={() => setRulesOpen(true)}
          aria-label="規則"
        >
          <BookOpen className="h-5 w-5" />
        </Button>
      </header>

      {/* 謎題展示區：透視中、線索結果、特殊牌提示、預設 */}
      <div className="px-4 pt-2.5">
        <AnimatePresence mode="wait" initial={false}>
          {isPeeking ? (
            <motion.div
              key="peek-open"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-[20px] border-2 border-amber bg-amber-tint p-3"
            >
              <p className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-amber-ink">
                <ScanEye aria-hidden className="h-4 w-4" />
                透視中… 剩餘的數字（{remaining.length} 個）
              </p>
              <NumberBoard
                remaining={remaining}
                guessedNumbers={guessedNumbers}
              />
              <motion.div
                className="mt-2 h-1 rounded-full bg-amber"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5, ease: 'linear' }}
              />
              <div className="mt-2 flex gap-3.5 text-xs text-ink-2">
                <span className="flex items-center gap-1">
                  <span className="h-3.5 w-3.5 rounded border border-line-strong bg-surface" />
                  剩餘
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3.5 w-3.5 rounded bg-sunken" />
                  排除
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3.5 w-3.5 rounded border-2 border-amber" />
                  已猜
                </span>
              </div>
            </motion.div>
          ) : clueResult !== null &&
            selectedCard !== null &&
            selectedCard.id !== 'peek' ? (
            <motion.div
              key="clue-result"
              role="status"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                'flex items-center gap-4 rounded-[20px] border-2 p-[18px]',
                clueResult === 'yes'
                  ? 'border-primary bg-primary-tint'
                  : 'border-line-strong bg-surface',
              )}
            >
              <span
                className={cn(
                  'flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full text-[30px] font-black',
                  clueResult === 'yes'
                    ? 'bg-primary-ink text-white'
                    : 'border-2 border-line-strong bg-sunken text-ink',
                )}
              >
                {clueResult === 'yes' ? '是' : '否'}
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span
                  className={cn(
                    'text-[13px] font-bold',
                    clueResult === 'yes' ? 'text-primary-ink' : 'text-ink-2',
                  )}
                >
                  {'name' in selectedCard ? selectedCard.name : ''}
                </span>
                <span className="text-[17px] leading-snug font-bold text-ink">
                  {'question' in selectedCard
                    ? formatCardQuestion(
                        selectedCard as LineClueCard,
                        lastGuess,
                      )
                    : ''}
                </span>
              </span>
            </motion.div>
          ) : (redrawnThisRound && !clueResult) ||
            (peekActive && !clueResult) ? (
            <motion.div
              key="special"
              role="status"
              initial={reduceMotion ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-4 rounded-[20px] border-2 border-amber bg-amber-tint p-[18px]"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber text-on-amber">
                {peekActive ? (
                  <ScanEye aria-hidden className="h-7 w-7" />
                ) : (
                  <Shuffle aria-hidden className="h-7 w-7" />
                )}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[13px] font-bold text-amber-ink">
                  {peekActive ? '透視鏡' : '全面革新'}
                </span>
                <span className="text-base font-bold text-ink">
                  {peekActive ? '已使用，請直接輸入猜測' : '已換牌，請選線索牌'}
                </span>
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="puzzle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-4 rounded-[20px] border border-line bg-surface p-[18px]"
            >
              <span
                aria-hidden
                className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-[18px] border-2 border-dashed border-line-strong bg-sunken font-display text-[44px] font-extrabold text-ink-2"
              >
                ??
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-sm text-ink-2">
                  謎底是 10–99 的兩位數
                </span>
                <span className="text-[15px] font-bold text-ink">
                  剩{' '}
                  <span className="font-display text-2xl font-extrabold">
                    {remaining.length}
                  </span>{' '}
                  個未猜
                </span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 進度 */}
      <div className="flex flex-col gap-1.5 px-4 pt-3.5 pb-2">
        <div className="flex justify-between text-[13px] font-bold text-ink-2">
          <span className="flex items-center gap-1">
            {roundCount >= 7 && (
              <TriangleAlert aria-hidden className="h-4 w-4 text-amber-ink" />
            )}
            第{' '}
            <span className="font-display text-[15px] text-ink">
              {roundCount + 1}
            </span>{' '}
            / 10 回合
          </span>
          <span>
            已排除{' '}
            <span className="font-display text-[15px] text-ink">
              {90 - remaining.length}
            </span>{' '}
            個
          </span>
        </div>
        <ProgressBar roundCount={roundCount} />
      </div>

      {/* 歷史 chip 列 */}
      <HistoryChips history={history} />

      {/* 底部操作區：選牌或輸入猜測 */}
      <div className="mt-auto flex flex-col gap-3 pt-4 pb-6">
        <span className="px-4 text-sm font-bold text-ink-2">{hint}</span>

        {!isGuessing && !isRoundGuessed && (
          <div className="flex scrollbar-none gap-2.5 overflow-x-auto px-4 pt-2.5 pb-1.5">
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
        )}

        {isGuessing && !isRoundGuessed && (
          <div className="flex flex-col gap-3 px-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="guess-input"
                className="text-sm font-bold text-ink"
              >
                你的猜測
              </label>
              <input
                id="guess-input"
                inputMode="numeric"
                autoComplete="off"
                placeholder="輸入 10-99"
                value={inputValue}
                onChange={e =>
                  setInputValue(e.target.value.replace(/[^0-9]/g, ''))
                }
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                maxLength={2}
                aria-describedby={alreadyGuessed ? 'guess-hint' : undefined}
                className={cn(
                  'h-16 w-full rounded-2xl border-2 bg-surface px-4 text-center font-display text-[34px] font-extrabold text-ink placeholder:font-noto placeholder:text-base placeholder:font-normal placeholder:text-ink-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
                  alreadyGuessed ? 'border-amber' : 'border-line-strong',
                )}
              />
              {alreadyGuessed && (
                <span
                  id="guess-hint"
                  className="flex items-center gap-1.5 text-[13px] font-semibold text-amber-ink"
                >
                  <TriangleAlert aria-hidden className="h-4 w-4" />
                  你已猜過 {parsedGuess}，可繼續送出
                </span>
              )}
            </div>
            <Button
              variant="tactile"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              送出
            </Button>
          </div>
        )}

        {isRoundGuessed && !gameOver && (
          <div className="px-4">
            <Button
              variant="tactile"
              className="w-full"
              onClick={handleNextRound}
            >
              下一回合
            </Button>
          </div>
        )}
      </div>

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
              {pendingCard && '：'}
              {pendingCard &&
                ('question' in pendingCard
                  ? pendingCard.question
                  : pendingCard.description)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCard}>
              確認使用
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 筆記抽屜 */}
      <BottomSheet
        open={notesOpen}
        onClose={() => {
          setNotesOpen(false);
          setDragSelectMode(false);
        }}
        title="筆記"
        actions={
          <button
            type="button"
            onClick={() => setNotesMarked(new Set())}
            className="h-11 rounded-xl px-2.5 text-sm font-bold text-danger-ink hover:bg-danger-tint"
          >
            清除全部
          </button>
        }
      >
        <div className="shrink-0 px-4 pt-2">
          <div
            role="radiogroup"
            aria-label="標記方式"
            className="flex gap-1 rounded-[14px] border border-line bg-sunken p-1"
          >
            {[
              { value: false, label: '點擊選取' },
              { value: true, label: '滑動連選' },
            ].map(option => (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={dragSelectMode === option.value}
                onClick={() => {
                  if (dragSelectMode !== option.value) handleToggleDragSelect();
                }}
                className={cn(
                  'h-10 flex-1 rounded-[10px] text-sm font-bold',
                  dragSelectMode === option.value
                    ? 'bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong)]'
                    : 'text-ink-2',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3.5 pt-2.5 text-xs text-ink-2">
            <span className="flex items-center gap-1">
              <span className="h-3.5 w-3.5 rounded border border-line bg-surface" />
              可能
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3.5 w-3.5 rounded bg-sunken" />
              已排除
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3.5 w-3.5 rounded border-2 border-amber" />
              已猜
            </span>
            <span className="ml-auto flex overflow-hidden rounded-lg border border-line">
              {([5, 6] as const).map(col => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setNotesColumns(col)}
                  aria-pressed={notesColumns === col}
                  className={cn(
                    'h-8 px-2.5 text-xs font-bold',
                    notesColumns === col
                      ? 'bg-primary-tint text-primary-ink'
                      : 'text-ink-2 hover:bg-sunken',
                  )}
                >
                  {col} 列
                </button>
              ))}
            </span>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-6">
          <div
            className={cn(
              'grid gap-1.5 sm:gap-1',
              notesColumns === 5
                ? 'grid-cols-5 sm:grid-cols-10'
                : 'grid-cols-6 sm:grid-cols-10',
              dragSelectMode && 'touch-none',
            )}
            onPointerDown={handleNotesPointerDown}
            onPointerMove={dragSelectMode ? handleNotesPointerMove : undefined}
            onPointerUp={dragSelectMode ? handleNotesPointerUp : undefined}
            onPointerCancel={dragSelectMode ? handleNotesPointerUp : undefined}
          >
            {Array.from({ length: 90 }, (_, i) => i + 10).map(n => {
              const marked = notesMarked.has(n);
              const guessed = guessedNumbers.includes(n);
              return (
                <button
                  key={n}
                  type="button"
                  data-note-num={n}
                  aria-pressed={marked}
                  className={cn(
                    'flex h-11 w-full items-center justify-center rounded-[10px] font-display text-base font-bold [-webkit-tap-highlight-color:transparent] sm:h-9',
                    marked
                      ? 'bg-sunken text-ink-2/60 line-through'
                      : 'border border-line bg-surface text-ink hover:bg-sunken',
                    guessed && 'border-2 border-amber',
                  )}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      </BottomSheet>

      {/* 規則抽屜 */}
      <BottomSheet
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        title="遊戲規則"
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-2 pb-8">
          <RuleSection title="遊戲目標">
            <p>
              利用線索牌推理出藏匿的兩位數（10-99），最多{' '}
              <b className="text-ink">10 回合</b>內猜對即獲勝。
            </p>
          </RuleSection>

          <RuleSection title="每回合流程">
            <ol className="flex flex-col gap-1.5">
              {[
                '從手牌中選一張線索牌，系統回答「是」或「否」',
                '根據線索縮小謎底範圍後，輸入你猜測的數字',
                '猜錯則繼續下一回合；猜對立即獲勝',
              ].map((step, i) => (
                <li key={step} className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-tint font-display text-xs font-extrabold text-primary-ink">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </RuleSection>

          <RuleSection title="特殊牌">
            <div className="flex flex-col gap-2">
              {[
                {
                  Icon: ScanEye,
                  name: '透視鏡',
                  desc: '顯示目前所有可能為謎底的數字 5 秒。每局限用一次，使用後本回合仍可猜數。',
                },
                {
                  Icon: Shuffle,
                  name: '全面革新',
                  desc: '重新抽一組全新手牌。每局限用一次，且每回合只能使用一次。',
                },
              ].map(({ Icon, name, desc }) => (
                <div
                  key={name}
                  className="flex gap-3 rounded-xl border border-amber bg-amber-tint px-3 py-2.5"
                >
                  <Icon
                    aria-hidden
                    className="mt-0.5 h-5 w-5 shrink-0 text-amber-ink"
                  />
                  <div>
                    <p className="text-sm font-bold text-ink">{name}</p>
                    <p className="mt-0.5 text-[13px] text-ink-2">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </RuleSection>

          <RuleSection title="線索牌一覽">
            <div className="grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2">
              {[
                ['半壁江山', '謎底 ≥ 55？'],
                ['陰陽雙極', '謎底是奇數？'],
                ['三陽開泰', '謎底是 3 的倍數？'],
                ['五福臨門', '謎底是 5 的倍數？'],
                ['七星高照', '謎底是 7 的倍數？'],
                ['黃金質數', '謎底是質數？'],
                ['複製貼上', '十位數 = 個位數？'],
                ['步步高升', '個位數 > 十位數？'],
                ['數位加總', '各位數之和是奇數？'],
                ['尾數偵測', '個位數 > 5？'],
                ['十位偵測', '十位數 > 5？'],
                ['數位之積', '十位數 × 個位數 > 20？'],
                ['高低雷達', '謎底 > 上一次猜的？'],
                ['黃金交叉', '謎底與上次猜的相差 ≤ 10？'],
                ['完美平方', '謎底是完全平方數？'],
                ['幸運之星', '謎底含有數字 7？'],
              ].map(([name, desc]) => (
                <div
                  key={name}
                  className="flex items-baseline gap-2 py-0.5 text-[13px]"
                >
                  <span className="shrink-0 font-bold text-ink">{name}</span>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </RuleSection>

          <RuleSection title="評分標準">
            <div className="flex flex-col gap-2">
              {RULE_RATINGS.map(key => {
                const info = RATING_INFO[key];
                return (
                  <div key={key} className="flex items-center gap-3 text-sm">
                    <span className="w-20 shrink-0 text-ink-2">
                      {info.rounds}
                    </span>
                    <RatingBar level={info.level} className="w-20" />
                    <span className="font-bold text-ink">{info.label}</span>
                  </div>
                );
              })}
            </div>
          </RuleSection>
        </div>
      </BottomSheet>
    </div>
  );
}

function RuleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5 text-sm leading-relaxed text-ink-2">
      <h3 className="mb-2 text-[15px] font-extrabold text-primary-ink">
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * 底部抽屜：手機上規則與筆記都需要大面積內容，從底部滑出比置中 dialog 更好單手操作。
 * reduced-motion 時只淡入
 */
function BottomSheet({
  open,
  onClose,
  title,
  actions,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-ink/45"
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88vh] w-full max-w-2xl flex-col rounded-t-[28px] bg-surface shadow-[0_-8px_32px_rgba(16,36,33,0.16)]"
          >
            <div aria-hidden className="flex justify-center pt-2.5">
              <span className="h-[5px] w-10 rounded-full bg-line-strong" />
            </div>
            <div className="flex shrink-0 items-center gap-1 py-1.5 pr-2 pl-5">
              <h2 className="flex-1 text-xl font-extrabold text-ink">
                {title}
              </h2>
              {actions}
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-ink"
                onClick={onClose}
                aria-label="關閉"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
