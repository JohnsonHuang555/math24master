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
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { BackToHomeButton } from '@/components/back-to-home-button';
import { GameDesktopBar } from '@/components/game/game-hud';
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
import { Link, useRouter } from '@/i18n/navigation';
import {
  type ClueCard,
  type GuessRating,
  LINE_CLUE_CARDS,
  isLineClueCard,
} from '@/lib/guess-number';
import { cn } from '@/lib/utils';

/** 五格評級條的格數；評級文字在 messages 的 GuessNumber.ratings */
const RATING_LEVEL: Record<GuessRating, number> = {
  lucky: 5,
  genius: 4,
  steady: 3,
  close: 2,
  keepGoing: 1,
  miss: 0,
};

const MAX_ROUNDS = 10;

/** 線索牌的顯示文字：名稱、完整問句（動態牌帶入上次猜的數字）、歷史紀錄用的短句 */
function useCardText() {
  const t = useTranslations('GuessNumber.cards');
  // key 由卡片 id 組出；三種語系的 key 一致由 i18n/messages.test.ts 把關
  const tr = t as unknown as (
    key: string,
    values?: Record<string, string | number>,
  ) => string;
  return {
    name: (card: ClueCard) => tr(`${card.id}.name`),
    text: (card: ClueCard, lastGuess: number | null) => {
      if (!isLineClueCard(card)) return tr(`${card.id}.description`);
      if (!card.isDynamic) return tr(`${card.id}.question`);
      return lastGuess === null
        ? tr(`${card.id}.questionNoGuess`)
        : tr(`${card.id}.question`, { n: lastGuess });
    },
    short: (cardId: string, lastGuess?: number) =>
      tr(`${cardId}.short`, { n: lastGuess ?? 'N' }),
    rule: (cardId: string) => tr(`${cardId}.rule`),
  };
}

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
  const t = useTranslations('GuessNumber');
  const cardText = useCardText();
  const isSpecial = !isLineClueCard(card);
  const displayText = cardText.text(card, lastGuess);
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
          {t('special')}
        </span>
      )}
      <span className="text-base leading-tight font-extrabold">
        {cardText.name(card)}
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
  const t = useTranslations('GuessNumber');
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-1.5 text-[11px] font-extrabold',
        result === 'yes'
          ? 'bg-primary-ink text-white'
          : 'border border-line-strong bg-sunken text-ink',
      )}
    >
      {t(result)}
    </span>
  );
}

function HistoryChips({ history }: { history: HistoryEntry[] }) {
  const t = useTranslations('GuessNumber');
  const cardText = useCardText();
  if (history.length === 0) return null;
  return (
    <div
      aria-label={t('history')}
      className="flex scrollbar-none gap-1.5 overflow-x-auto px-4 py-1 lg:flex-col lg:overflow-visible lg:px-0"
    >
      {history.map((e, i) => {
        const chip =
          'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[13px] font-semibold text-ink lg:h-auto lg:min-h-11 lg:rounded-xl lg:border-0 lg:bg-sunken lg:py-2';
        if (e.type === 'clue') {
          return (
            <span key={i} className={chip}>
              <span className="text-ink-2">{e.round}</span>
              {cardText.short(e.cardId, e.lastGuess)}
              <YesNoPill result={e.result} />
            </span>
          );
        }
        if (e.type === 'peek') {
          return (
            <span key={i} className={chip}>
              <ScanEye aria-hidden className="h-4 w-4 text-amber-ink" />
              {cardText.name({ id: 'peek' })}
            </span>
          );
        }
        return (
          <span key={i} className={chip}>
            <span className="font-display text-sm font-bold">
              {t('guessChip', { n: e.number })}
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
  const t = useTranslations('GuessNumber');
  const tCommon = useTranslations('Common');
  const tHud = useTranslations('GameUI.hud');
  const cardText = useCardText();
  const reduceMotion = useReducedMotion();
  const router = useRouter();

  const prevRoundCountRef = useRef(0);
  const prevClueResultRef = useRef<'yes' | 'no' | null>(null);
  const dragModeRef = useRef<boolean | null>(null);
  const draggedSetRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (roundCount > prevRoundCountRef.current && !gameOver) {
      toast.error(t('wrongGuess'), { duration: 2000 });
    }
    prevRoundCountRef.current = roundCount;
  }, [roundCount, gameOver, t]);

  useEffect(() => {
    if (clueResult !== null && prevClueResultRef.current === null) {
      toast.success(t('clueGained'), { duration: 2500 });
    }
    prevClueResultRef.current = clueResult;
  }, [clueResult, t]);

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
        <p className="text-ink-2">{t('loading')}</p>
      </div>
    );
  }

  // ── 結算畫面 ──
  if (gameOver && rating) {
    return (
      <div className="mx-auto flex h-full w-full max-w-md flex-col gap-3.5 px-4 pt-4 pb-6">
        <div className="flex flex-1 flex-col items-center justify-center gap-2.5 text-center">
          <span className="text-base font-bold text-ink-2">
            {t('result.answerWas')}
          </span>
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
            {isWin ? t('result.win') : t('result.lose')}
          </h2>
          <span className="text-[15px] text-ink-2">
            {t.rich('result.rounds', {
              count: roundCount,
              b: chunks => (
                <b className="font-display text-xl font-extrabold text-ink">
                  {chunks}
                </b>
              ),
            })}
          </span>
          <RatingBar level={RATING_LEVEL[rating]} className="mt-2 w-[220px]" />
          <span className="text-sm font-bold text-ink">
            {t(`ratings.${rating}.label`)} · {t(`ratings.${rating}.rounds`)}
          </span>
        </div>
        <div className="flex gap-2.5">
          <Button variant="tactileOutline" className="flex-1 px-3" asChild>
            <Link href="/">{t('result.backHome')}</Link>
          </Button>
          <Button
            variant="tactile"
            className="flex-[1.3] px-3"
            onClick={handleRestart}
          >
            {t('result.playAgain')}
          </Button>
        </div>
      </div>
    );
  }

  const isGuessing =
    peekActive || (selectedCard !== null && selectedCard.id !== 'peek');
  const hint = peekActive
    ? t('hint.peekActive')
    : selectedCard !== null && selectedCard.id !== 'peek'
      ? t('hint.cardSelected')
      : redrawnThisRound
        ? t('hint.redrawn')
        : t('hint.pickCard');

  return (
    <div className="flex h-full flex-col">
      <GameDesktopBar
        className="hidden lg:flex"
        title={t('title')}
        exitLabel={tCommon('home')}
        onExit={() => router.push('/')}
        center={
          <span className="text-sm font-bold text-ink-2">
            {t.rich('round', {
              round: roundCount + 1,
              total: MAX_ROUNDS,
              n: chunks => (
                <span className="font-display text-lg text-ink">{chunks}</span>
              ),
            })}
          </span>
        }
        onOpenRules={() => setRulesOpen(true)}
      />
      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col lg:grid lg:max-w-none lg:grid-cols-[280px_minmax(0,1fr)_330px] lg:gap-5 lg:px-6 lg:py-5">
        {/* 標題列（手機） */}
        <header className="flex items-center gap-0.5 px-2 pt-2 lg:hidden">
          <BackToHomeButton />
          <h1 className="flex-1 pl-1 text-[17px] font-extrabold text-ink">
            {t('title')}
          </h1>
          <Button
            variant="ghost"
            className="h-11 gap-1.5 px-2.5 text-sm font-bold text-ink"
            onClick={() => setNotesOpen(true)}
          >
            <NotebookPen className="h-5 w-5" />
            {t('notes')}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 text-ink"
            onClick={() => setRulesOpen(true)}
            aria-label={tHud('rules')}
          >
            <BookOpen className="h-5 w-5" />
          </Button>
        </header>

        <div className="flex flex-col lg:min-h-0 lg:gap-3 lg:overflow-y-auto lg:rounded-[20px] lg:border lg:border-line lg:bg-surface lg:p-4">
          {/* 謎題展示區：透視中、線索結果、特殊牌提示、預設 */}
          <div className="px-4 pt-2.5 lg:px-0 lg:pt-0">
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
                    {t('peeking', { count: remaining.length })}
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
                      {t('legend.remaining')}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-3.5 w-3.5 rounded bg-sunken" />
                      {t('legend.excluded')}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-3.5 w-3.5 rounded border-2 border-amber" />
                      {t('legend.guessed')}
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
                    {t(clueResult)}
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span
                      className={cn(
                        'text-[13px] font-bold',
                        clueResult === 'yes'
                          ? 'text-primary-ink'
                          : 'text-ink-2',
                      )}
                    >
                      {cardText.name(selectedCard)}
                    </span>
                    <span className="text-[17px] leading-snug font-bold text-ink">
                      {isLineClueCard(selectedCard)
                        ? cardText.text(selectedCard, lastGuess)
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
                      {cardText.name({ id: peekActive ? 'peek' : 'redraw' })}
                    </span>
                    <span className="text-base font-bold text-ink">
                      {peekActive
                        ? t('specialStatus.peek')
                        : t('specialStatus.redraw')}
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
                      {t('secretRange')}
                    </span>
                    <span className="text-[15px] font-bold text-ink">
                      {t.rich('remainingCount', {
                        count: remaining.length,
                        n: chunks => (
                          <span className="font-display text-2xl font-extrabold">
                            {chunks}
                          </span>
                        ),
                      })}
                    </span>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 進度 */}
          <div className="flex flex-col gap-1.5 px-4 pt-3.5 pb-2 lg:px-0 lg:pt-1">
            <div className="flex justify-between text-[13px] font-bold text-ink-2">
              <span className="flex items-center gap-1">
                {roundCount >= 7 && (
                  <TriangleAlert
                    aria-hidden
                    className="h-4 w-4 text-amber-ink"
                  />
                )}
                {t.rich('round', {
                  round: roundCount + 1,
                  total: MAX_ROUNDS,
                  n: chunks => (
                    <span className="font-display text-[15px] text-ink">
                      {chunks}
                    </span>
                  ),
                })}
              </span>
              <span>
                {t.rich('excluded', {
                  count: 90 - remaining.length,
                  n: chunks => (
                    <span className="font-display text-[15px] text-ink">
                      {chunks}
                    </span>
                  ),
                })}
              </span>
            </div>
            <ProgressBar roundCount={roundCount} />
          </div>

          {/* 歷史：手機為橫向 chip 列，桌機為直向清單 */}
          <HistoryChips history={history} />
        </div>

        {/* 底部操作區：選牌或輸入猜測 */}
        <div className="mt-auto flex flex-col gap-3 pt-4 pb-6 lg:mt-0 lg:items-center lg:justify-center lg:gap-5 lg:rounded-[20px] lg:border lg:border-line lg:bg-surface lg:p-6">
          <span className="px-4 text-sm font-bold text-ink-2 lg:text-[15px]">
            {hint}
          </span>

          {!isGuessing && !isRoundGuessed && (
            <div className="flex scrollbar-none gap-2.5 overflow-x-auto px-4 pt-2.5 pb-1.5 lg:max-w-full lg:flex-wrap lg:justify-center lg:gap-3 lg:overflow-visible">
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
            <div className="flex flex-col gap-3 px-4 lg:w-full lg:max-w-[420px]">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="guess-input"
                  className="text-sm font-bold text-ink"
                >
                  {t('yourGuess')}
                </label>
                <input
                  id="guess-input"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder={t('guessPlaceholder')}
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
                    {t('alreadyGuessed', { n: parsedGuess })}
                  </span>
                )}
              </div>
              <Button
                variant="tactile"
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                {t('submit')}
              </Button>
            </div>
          )}

          {isRoundGuessed && !gameOver && (
            <div className="px-4 lg:w-full lg:max-w-[420px]">
              <Button
                variant="tactile"
                className="w-full"
                onClick={handleNextRound}
              >
                {t('nextRound')}
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
              <AlertDialogTitle>{t('confirm.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingCard &&
                  t('confirm.description', {
                    name: cardText.name(pendingCard),
                    text: cardText.text(pendingCard, lastGuess),
                  })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmCard}>
                {t('confirm.action')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 筆記抽屜 */}
        <BottomSheet
          inline
          open={notesOpen}
          onClose={() => {
            setNotesOpen(false);
            setDragSelectMode(false);
          }}
          title={t('notes')}
          actions={
            <button
              type="button"
              onClick={() => setNotesMarked(new Set())}
              className="h-11 rounded-xl px-2.5 text-sm font-bold text-danger-ink hover:bg-danger-tint"
            >
              {t('notesPanel.clearAll')}
            </button>
          }
        >
          <div className="shrink-0 px-4 pt-2">
            <div
              role="radiogroup"
              aria-label={t('notesPanel.markMode')}
              className="flex gap-1 rounded-[14px] border border-line bg-sunken p-1"
            >
              {[
                { value: false, label: t('notesPanel.tap') },
                { value: true, label: t('notesPanel.drag') },
              ].map(option => (
                <button
                  key={option.label}
                  type="button"
                  role="radio"
                  aria-checked={dragSelectMode === option.value}
                  onClick={() => {
                    if (dragSelectMode !== option.value)
                      handleToggleDragSelect();
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
                {t('legend.possible')}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3.5 w-3.5 rounded bg-sunken" />
                {t('legend.ruledOut')}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3.5 w-3.5 rounded border-2 border-amber" />
                {t('legend.guessed')}
              </span>
              <span className="ml-auto flex overflow-hidden rounded-lg border border-line lg:hidden">
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
                    {t('notesPanel.columns', { count: col })}
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
                  ? 'grid-cols-5 sm:grid-cols-10 lg:grid-cols-5'
                  : 'grid-cols-6 sm:grid-cols-10 lg:grid-cols-5',
                dragSelectMode && 'touch-none',
              )}
              onPointerDown={handleNotesPointerDown}
              onPointerMove={
                dragSelectMode ? handleNotesPointerMove : undefined
              }
              onPointerUp={dragSelectMode ? handleNotesPointerUp : undefined}
              onPointerCancel={
                dragSelectMode ? handleNotesPointerUp : undefined
              }
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
      </div>

      {/* 規則抽屜 */}
      <BottomSheet
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        title={t('rules.title')}
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-2 pb-8">
          <RuleSection title={t('rules.goal')}>
            <p>
              {t.rich('rules.goalText', {
                b: chunks => <b className="text-ink">{chunks}</b>,
              })}
            </p>
          </RuleSection>

          <RuleSection title={t('rules.flow')}>
            <ol className="flex flex-col gap-1.5">
              {[t('rules.step1'), t('rules.step2'), t('rules.step3')].map(
                (step, i) => (
                  <li key={step} className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-tint font-display text-xs font-extrabold text-primary-ink">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ),
              )}
            </ol>
          </RuleSection>

          <RuleSection title={t('rules.special')}>
            <div className="flex flex-col gap-2">
              {[
                {
                  Icon: ScanEye,
                  name: cardText.name({ id: 'peek' }),
                  desc: cardText.rule('peek'),
                },
                {
                  Icon: Shuffle,
                  name: cardText.name({ id: 'redraw' }),
                  desc: cardText.rule('redraw'),
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

          <RuleSection title={t('rules.cardList')}>
            <div className="grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2">
              {LINE_CLUE_CARDS.map(card => [
                cardText.name(card),
                cardText.rule(card.id),
              ]).map(([name, desc]) => (
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

          <RuleSection title={t('rules.rating')}>
            <div className="flex flex-col gap-2">
              {RULE_RATINGS.map(key => (
                <div key={key} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 text-ink-2">
                    {t(`ratings.${key}.rounds`)}
                  </span>
                  <RatingBar level={RATING_LEVEL[key]} className="w-20" />
                  <span className="font-bold text-ink">
                    {t(`ratings.${key}.label`)}
                  </span>
                </div>
              ))}
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
  inline,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  actions?: React.ReactNode;
  /** 桌機（lg 以上）把內容直接放在版面裡，不用打開抽屜 */
  inline?: boolean;
  children: React.ReactNode;
}) {
  const tCommon = useTranslations('Common');
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {inline && (
        <aside
          aria-label={title}
          className="hidden min-h-0 flex-col rounded-[20px] border border-line bg-surface lg:flex"
        >
          <div className="flex shrink-0 items-center gap-1 pt-2 pr-2 pl-4">
            <h2 className="flex-1 text-base font-extrabold text-ink">
              {title}
            </h2>
            {actions}
          </div>
          {children}
        </aside>
      )}
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
                  aria-label={tCommon('close')}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
