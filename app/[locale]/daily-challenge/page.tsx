'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ChevronLeft,
  CircleX,
  Clock,
  Copy,
  Delete,
  Flame,
  Globe,
  RotateCcw,
} from 'lucide-react';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';
import { ACTION_BUTTON_CLASS } from '@/components/areas/puzzle-play-area';
import { BackToHomeButton } from '@/components/back-to-home-button';
import { SolutionsPanel } from '@/components/daily/solutions-panel';
import { ExpressionBar } from '@/components/game/expression-bar';
import { GameDesktopBar } from '@/components/game/game-hud';
import { LeaveGameDialog } from '@/components/game/leave-game-dialog';
import { NumberCard } from '@/components/game/number-card';
import Symbols from '@/components/symbols';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { useGameKeyboard } from '@/hooks/useGameKeyboard';
import { Link, useRouter } from '@/i18n/navigation';
import { unlockAchievement } from '@/lib/achievement-manager';
import {
  type FormulaItem,
  type Solution,
  calculateDailyScore,
  evaluateFormula,
  findAllSolutions,
  getDailyPuzzles,
  getDailyRecord,
  getDailyStatus,
  getTodayDateString,
  saveDailyRecord,
} from '@/lib/daily-seed';
import { msUntilNextTaipeiDay } from '@/lib/date';
import { playSound } from '@/lib/sound-manager';
import { cn } from '@/lib/utils';
import { SelectedCard } from '@/models/SelectedCard';
import { Symbol } from '@/models/Symbol';
import { useAchievementStore } from '@/stores/achievement-store';
import { useStatsStore } from '@/stores/stats-store';

const TOTAL_ROUNDS = 3;

type GameState = 'idle' | 'playing' | 'completed';

/** 每日挑戰日是台灣日期（YYYY-MM-DD），以 UTC 解析避免玩家時區把日期往前推一天 */
function formatDailyDate(
  today: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
) {
  if (!today) return '';
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: 'UTC',
  }).format(new Date(`${today}T00:00:00Z`));
}

export default function DailyChallengePage() {
  const locale = useLocale();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const incrementDailyChallenge = useStatsStore(s => s.incrementDailyChallenge);
  const [today, setToday] = useState('');
  const [puzzles, setPuzzles] = useState<number[][]>([]);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [currentRound, setCurrentRound] = useState(0);
  const [formula, setFormula] = useState<FormulaItem[]>([]);
  const [usedCardIndices, setUsedCardIndices] = useState<Set<number>>(
    new Set(),
  );
  const [score, setScore] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [solutionsPerPuzzle, setSolutionsPerPuzzle] = useState<Solution[][]>(
    [],
  );
  const [userFormulas, setUserFormulas] = useState<string[]>([]);
  // 答錯的原因；改動算式後清掉
  const [wrongMessage, setWrongMessage] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const isSubmitting = useRef(false);
  const scoreSumRef = useRef(0);

  useEffect(() => {
    const currentDay = getTodayDateString();
    setToday(currentDay);
    const dailyPuzzles = getDailyPuzzles(TOTAL_ROUNDS);
    setPuzzles(dailyPuzzles);

    const existing = getDailyRecord(currentDay);
    if (existing?.done) {
      setGameState('completed');
      setScore(existing.score);
      setStreak(existing.streak);
      // defer solution computation to avoid blocking paint
      setTimeout(
        () => setSolutionsPerPuzzle(dailyPuzzles.map(p => findAllSolutions(p))),
        0,
      );
    } else {
      // 開始畫面顯示目前的連續天數（昨天有完成才算）
      setStreak(getDailyStatus(currentDay).streak);
    }
  }, []);

  const cards = puzzles[currentRound] ?? [];
  const isPlaying = gameState === 'playing';

  const updateFormula = (next: FormulaItem[]) => {
    setFormula(next);
    setWrongMessage(null);
  };

  const startGame = () => {
    setCurrentRound(0);
    updateFormula([]);
    setUsedCardIndices(new Set());
    scoreSumRef.current = 0;
    setUserFormulas([]);
    setGameState('playing');
  };

  const handleAddNumber = (index: number) => {
    if (!isPlaying) return;
    if (usedCardIndices.has(index)) {
      updateFormula(
        formula.filter(f => !(f.type === 'number' && f.cardIndex === index)),
      );
      setUsedCardIndices(prev => {
        const s = new Set(prev);
        s.delete(index);
        return s;
      });
    } else {
      playSound('select');
      updateFormula([
        ...formula,
        { type: 'number', value: cards[index], cardIndex: index },
      ]);
      setUsedCardIndices(prev => new Set([...prev, index]));
    }
  };

  const handleAddSymbol = (value: string) => {
    if (!isPlaying) return;
    playSound('select');
    updateFormula([...formula, { type: 'symbol', value }]);
  };

  const handleBack = () => {
    if (!isPlaying || formula.length === 0) return;
    const last = formula[formula.length - 1];
    updateFormula(formula.slice(0, -1));
    if (last.type === 'number') {
      setUsedCardIndices(prev => {
        const s = new Set(prev);
        s.delete(last.cardIndex);
        return s;
      });
    }
  };

  const handleClear = () => {
    if (!isPlaying) return;
    updateFormula([]);
    setUsedCardIndices(new Set());
  };

  const applyPenalty = (message: string) => {
    playSound('wrong');
    setWrongMessage(message);
  };

  const formulaDisplay = formula
    .map(f => {
      if (f.type === 'number') return f.value;
      if (f.value === '*') return '×';
      if (f.value === '/') return '÷';
      return f.value;
    })
    .join(' ');

  const handleSubmit = () => {
    if (!isPlaying || isSubmitting.current) return;
    isSubmitting.current = true;

    if (usedCardIndices.size !== 4) {
      toast.error('必須使用全部 4 張牌');
      isSubmitting.current = false;
      return;
    }

    const value = evaluateFormula(formula);
    if (value === null) {
      applyPenalty('算式有誤');
      isSubmitting.current = false;
      return;
    }

    if (Math.abs(value - 24) >= 1e-6) {
      applyPenalty(`結果是 ${Math.round(value * 100) / 100}，不等於 24`);
      isSubmitting.current = false;
      return;
    }

    // 本題答對
    scoreSumRef.current += calculateDailyScore(formula);
    setUserFormulas(prev => [...prev, formulaDisplay]);
    playSound('correct');

    const nextRound = currentRound + 1;
    if (nextRound < TOTAL_ROUNDS) {
      toast.success(`第 ${currentRound + 1} 題完成！`);
      setCurrentRound(nextRound);
      updateFormula([]);
      setUsedCardIndices(new Set());
      isSubmitting.current = false;
      return;
    }

    // 全部完成
    const { streak: s } = saveDailyRecord(today, scoreSumRef.current, formula);
    setScore(scoreSumRef.current);
    setStreak(s);
    setGameState('completed');
    unlockAchievement('daily_done');
    incrementDailyChallenge();
    useAchievementStore.getState().updateDailyStreak(s);
    if (s >= 7) unlockAchievement('daily_streak_7');
    setTimeout(
      () => setSolutionsPerPuzzle(puzzles.map(p => findAllSolutions(p))),
      0,
    );
  };

  // 只取數字（zh 的 day 格式會帶「日」字）
  const dayOfMonth = today ? Number(today.slice(8, 10)) : '';
  const shortDate = formatDailyDate(today, locale, {
    month: 'numeric',
    day: 'numeric',
  });

  const sharePreviewText =
    `24點大師 每日挑戰 ${shortDate}\n` +
    `本日 ${score ?? 0} 分 · 連續 ${streak} 天\n` +
    `math24master.com`;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(sharePreviewText);
      toast.success('已複製到剪貼簿！');
    } catch {
      toast.error('無法自動複製，請手動複製上方文字', { duration: Infinity });
    }
  };

  useGameKeyboard(gameState === 'playing', {
    onDigit: index => {
      if (index < cards.length) handleAddNumber(index);
    },
    onSymbol: symbol => handleAddSymbol(symbol),
    onBackspace: handleBack,
    onEnter: handleSubmit,
    onEscape: () => setShowLeaveConfirm(true),
  });

  // ── 開始畫面 ──
  if (gameState === 'idle') {
    return (
      <div className="mx-auto flex h-full w-full max-w-md flex-col px-4 pt-2 pb-6">
        <header className="flex items-center">
          <BackToHomeButton />
        </header>
        <main className="flex flex-1 flex-col items-center justify-center gap-3.5 py-6 text-center">
          <div
            aria-hidden
            className="w-24 overflow-hidden rounded-[18px] border-2 border-line-strong bg-surface shadow-[0_5px_0_0_var(--line-strong)]"
          >
            <div className="flex h-6 items-center justify-center bg-primary text-xs font-extrabold text-primary-foreground">
              {formatDailyDate(today, locale, { month: 'short' })}
            </div>
            <div className="font-display text-[44px] leading-[64px] font-extrabold text-ink">
              {dayOfMonth}
            </div>
          </div>
          <h1 className="mt-2.5 text-[32px] font-black text-ink">每日挑戰</h1>
          <p className="text-[15px] leading-relaxed text-ink-2">
            每天 {TOTAL_ROUNDS} 題，累積你的連續挑戰紀錄
          </p>
          {streak > 0 && (
            <span className="inline-flex h-8 items-center gap-[5px] rounded-full bg-amber-tint px-3 text-sm font-bold text-amber-ink">
              <Flame aria-hidden className="h-4 w-4" />
              連續 {streak} 天
            </span>
          )}
        </main>
        <div className="flex flex-col gap-3">
          <p className="flex items-center justify-center gap-1.5 text-[13px] text-ink-2">
            <Globe aria-hidden className="h-4 w-4" />
            全球同題 · 台灣時間 00:00 換題
          </p>
          <Button variant="tactile" className="w-full" onClick={startGame}>
            開始挑戰
          </Button>
        </div>
      </div>
    );
  }

  // ── 結算畫面 ──
  if (gameState === 'completed') {
    return (
      <div className="flex h-full flex-col overflow-y-auto">
        <GameDesktopBar
          className="hidden lg:flex"
          title={`每日挑戰 · ${shortDate}`}
          exitLabel="首頁"
          onExit={() => router.push('/')}
          center={<NextPuzzleCountdown />}
        />
        {/* 手機一欄；桌機左邊成績與分享、右邊各題解法 */}
        <div className="mx-auto flex w-full max-w-md flex-col gap-3.5 px-4 pt-2 pb-8 lg:grid lg:max-w-[1200px] lg:grid-cols-[440px_minmax(0,1fr)] lg:items-start lg:gap-6 lg:px-10 lg:py-7">
          <div className="flex flex-col gap-3.5 lg:rounded-[22px] lg:border lg:border-line lg:bg-surface lg:p-6">
            <header className="-mx-2 flex items-center gap-1 lg:hidden">
              <BackToHomeButton />
              <span className="text-sm font-bold text-ink-2">
                每日挑戰 · {shortDate}
              </span>
            </header>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-1.5 pt-2.5 lg:gap-3.5 lg:pt-2"
            >
              <span className="text-[15px] font-bold text-ink-2">
                本日總分 · 共 {TOTAL_ROUNDS} 題
              </span>
              <span className="font-display text-[88px] leading-[0.95] font-extrabold text-ink tabular-nums lg:text-[104px]">
                {score ?? 0}
              </span>
              <span className="inline-flex h-8 items-center gap-[5px] rounded-full bg-amber px-3 text-sm font-bold text-on-amber lg:h-[34px] lg:text-[15px]">
                <Flame aria-hidden className="h-4 w-4" />
                連續 {streak} 天
              </span>
            </motion.div>

            {/* 分享預覽 */}
            <pre className="rounded-2xl border border-dashed border-line-strong bg-sunken px-4 py-3.5 font-mono text-sm leading-[1.7] whitespace-pre-wrap text-ink lg:mt-2.5">
              {sharePreviewText}
            </pre>
            <Button
              variant="tactileOutline"
              className="h-12 gap-2 text-[15px] lg:h-[52px]"
              onClick={handleShare}
              aria-label="複製分享文字到剪貼簿"
            >
              <Copy aria-hidden className="h-[18px] w-[18px]" />
              複製分享
            </Button>

            <div className="lg:hidden">
              <NextPuzzleCountdown />
            </div>

            <div className="flex gap-2.5 lg:mt-2 lg:gap-3">
              <Button variant="tactileOutline" className="flex-1 px-3" asChild>
                <Link href="/multiple-play">挑戰朋友</Link>
              </Button>
              <Button variant="tactile" className="flex-[1.2] px-3" asChild>
                <Link href="/single-play">繼續練習</Link>
              </Button>
            </div>
          </div>

          {/* 各題解法 */}
          {solutionsPerPuzzle.length > 0 && (
            <section className="mt-3 flex flex-col gap-3.5 lg:mt-0 lg:rounded-[22px] lg:border lg:border-line lg:bg-surface lg:p-6">
              <h2 className="text-xl font-extrabold text-ink">各題解法</h2>
              <div className="overflow-hidden rounded-[18px] border border-line bg-surface">
                {solutionsPerPuzzle.map((solutions, i) => (
                  <SolutionsPanel
                    key={i}
                    round={i + 1}
                    numbers={puzzles[i] ?? []}
                    solutions={solutions}
                    userFormula={userFormulas[i] ?? ''}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  // ── 遊戲中 ──
  const tokens: SelectedCard[] = formula.map(f =>
    f.type === 'number'
      ? { number: { id: String(f.cardIndex), value: f.value } }
      : { symbol: f.value as Symbol },
  );
  const numberOrder = new Map(
    formula
      .filter(f => f.type === 'number')
      .map((f, i) => [f.type === 'number' ? f.cardIndex : -1, i + 1] as const),
  );
  const isComplete = usedCardIndices.size === 4;
  const liveResult = formula.length > 0 ? evaluateFormula(formula) : null;
  const roundedResult =
    liveResult === null ? null : Math.round(liveResult * 1e9) / 1e9;
  const isReady =
    isComplete && roundedResult !== null && Math.abs(roundedResult - 24) < 1e-9;

  return (
    <div className="flex h-full flex-col">
      <GameDesktopBar
        className="hidden lg:flex"
        title={`每日挑戰 · 第 ${currentRound + 1} / ${TOTAL_ROUNDS} 題`}
        onExit={() => setShowLeaveConfirm(true)}
        escHint
      />
      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col px-3 pt-2.5 pb-6 sm:px-4 lg:max-w-[640px] lg:justify-center lg:gap-6 lg:p-6">
        <LeaveGameDialog
          open={showLeaveConfirm}
          onOpenChange={setShowLeaveConfirm}
          onLeave={() => router.push('/')}
        />
        <header className="flex items-center gap-1 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 text-ink"
            onClick={() => setShowLeaveConfirm(true)}
            aria-label="離開"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-1 flex-col gap-1.5 px-1.5">
            <span className="text-[13px] font-bold text-ink-2">
              每日挑戰 · 第{' '}
              <span className="font-display text-[15px] text-ink">
                {currentRound + 1}
              </span>{' '}
              / {TOTAL_ROUNDS} 題
            </span>
            <div aria-hidden className="flex gap-1.5">
              {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 flex-1 rounded-full',
                    i < currentRound
                      ? 'bg-primary'
                      : i === currentRound
                        ? 'bg-primary/45'
                        : 'bg-line',
                  )}
                />
              ))}
            </div>
          </div>
          <span className="w-11" />
        </header>

        <div className="flex flex-1 items-start justify-center py-4 lg:flex-none lg:py-0">
          {wrongMessage && (
            <motion.div
              key={wrongMessage}
              role="alert"
              initial={reduceMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex w-full items-center gap-3 rounded-2xl border-2 border-danger bg-danger-tint px-4 py-3.5"
            >
              <CircleX
                aria-hidden
                className="h-6 w-6 shrink-0 text-danger-ink"
              />
              <div className="flex flex-1 flex-col gap-0.5">
                <strong className="text-base text-danger-ink">
                  {wrongMessage}
                </strong>
                <span className="text-[13px] text-ink">修改算式後再出牌</span>
              </div>
            </motion.div>
          )}
        </div>

        <div className="flex w-full flex-col gap-3 lg:items-center lg:gap-6">
          <div className="flex justify-center gap-2 pt-2 lg:gap-4 lg:pt-3">
            {cards.map((card, index) => {
              const order = numberOrder.get(index);
              return (
                <NumberCard
                  key={`${currentRound}-${index}`}
                  value={card}
                  state={order !== undefined ? 'selected' : 'idle'}
                  order={order}
                  shortcut={String(index + 1)}
                  onClick={() => handleAddNumber(index)}
                  data-testid="daily-card"
                  data-selected={order !== undefined}
                />
              );
            })}
          </div>

          <ExpressionBar
            tokens={tokens}
            result={roundedResult}
            isFinal={isComplete}
            placeholder="組合你的算式"
          />

          <div className="flex justify-center gap-2">
            <Symbols
              showShortcuts
              onClick={symbol => handleAddSymbol(symbol)}
            />
          </div>

          <div className="flex w-full gap-2 lg:gap-3">
            <Button
              variant="outline"
              className={ACTION_BUTTON_CLASS}
              disabled={formula.length === 0}
              onClick={handleClear}
              aria-label="清除"
            >
              <RotateCcw className="h-5 w-5" />
              <span className="hidden lg:inline">清除</span>
            </Button>
            <Button
              variant="outline"
              className={ACTION_BUTTON_CLASS}
              disabled={formula.length === 0}
              onClick={handleBack}
              aria-label="倒退"
            >
              <Delete className="h-5 w-5" />
              <span className="hidden lg:inline">倒退</span>
              <Kbd>⌫</Kbd>
            </Button>
            <Button
              variant="tactile"
              className={cn(
                'min-w-0 flex-1 gap-2 lg:h-[60px] lg:rounded-2xl',
                isReady &&
                  'shadow-[0_5px_0_0_var(--primary-edge),0_0_0_4px_var(--primary-tint)]',
              )}
              disabled={formula.length === 0}
              onClick={handleSubmit}
            >
              出牌
              <Kbd>Enter</Kbd>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 距離台灣時間 00:00 換題的倒數，每秒更新 */
function NextPuzzleCountdown() {
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setMs(msUntilNextTaipeiDay());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (ms === null) return null;
  const total = Math.floor(ms / 1000);
  const hh = String(Math.floor(total / 3600)).padStart(2, '0');
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');

  return (
    <p className="flex items-center justify-center gap-2 text-[13px] text-ink-2">
      <Clock aria-hidden className="h-4 w-4" />
      下一組題目
      <span className="font-display text-[15px] font-extrabold text-ink tabular-nums">
        {hh}:{mm}:{ss}
      </span>
      後
    </p>
  );
}
