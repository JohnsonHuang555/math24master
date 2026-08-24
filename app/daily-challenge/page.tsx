'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { toast } from 'sonner';
import { SolutionsPanel } from '@/components/daily/solutions-panel';
import { Button } from '@/components/ui/button';
import { unlockAchievement } from '@/lib/achievement-manager';
import {
  type FormulaItem,
  type Solution,
  calculateDailyScore,
  evaluateFormula,
  findAllSolutions,
  getDailyPuzzles,
  getDailyRecord,
  getTodayDateString,
  saveDailyRecord,
} from '@/lib/daily-seed';
import { playSound } from '@/lib/sound-manager';
import { cn } from '@/lib/utils';
import { useAchievementStore } from '@/stores/achievement-store';
import { useStatsStore } from '@/stores/stats-store';

const TOTAL_ROUNDS = 3;

const SYMBOLS = [
  { label: '+', value: '+' },
  { label: '-', value: '-' },
  { label: '×', value: '*' },
  { label: '÷', value: '/' },
  { label: '(', value: '(' },
  { label: ')', value: ')' },
] as const;

type GameState = 'idle' | 'playing' | 'completed';

export default function DailyChallengePage() {
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
    }
  }, []);

  const cards = puzzles[currentRound] ?? [];
  const isPlaying = gameState === 'playing';

  const startGame = () => {
    setCurrentRound(0);
    setFormula([]);
    setUsedCardIndices(new Set());
    scoreSumRef.current = 0;
    setUserFormulas([]);
    setGameState('playing');
  };

  const handleAddNumber = (index: number) => {
    if (!isPlaying) return;
    if (usedCardIndices.has(index)) {
      setFormula(
        formula.filter(f => !(f.type === 'number' && f.cardIndex === index)),
      );
      setUsedCardIndices(prev => {
        const s = new Set(prev);
        s.delete(index);
        return s;
      });
    } else {
      playSound('select');
      setFormula(prev => [
        ...prev,
        { type: 'number', value: cards[index], cardIndex: index },
      ]);
      setUsedCardIndices(prev => new Set([...prev, index]));
    }
  };

  const handleAddSymbol = (value: string) => {
    if (!isPlaying) return;
    playSound('select');
    setFormula(prev => [...prev, { type: 'symbol', value }]);
  };

  const handleBack = () => {
    if (!isPlaying || formula.length === 0) return;
    const last = formula[formula.length - 1];
    setFormula(formula.slice(0, -1));
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
    setFormula([]);
    setUsedCardIndices(new Set());
  };

  const applyPenalty = (message: string) => {
    playSound('wrong');
    toast.error(message);
  };

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
      setFormula([]);
      setUsedCardIndices(new Set());
      isSubmitting.current = false;
      return;
    }

    // 全部完成
    const { streak: s } = saveDailyRecord(today, scoreSumRef.current, formula);
    setScore(scoreSumRef.current);
    setStreak(s);
    setGameState('completed');
    toast.success(`完成！本日總分 ${scoreSumRef.current} 分`);
    unlockAchievement('daily_done');
    incrementDailyChallenge();
    useAchievementStore.getState().updateDailyStreak(s);
    if (s >= 7) unlockAchievement('daily_streak_7');
    setTimeout(
      () => setSolutionsPerPuzzle(puzzles.map(p => findAllSolutions(p))),
      0,
    );
  };

  const formulaDisplay = formula
    .map(f => {
      if (f.type === 'number') return f.value;
      if (f.value === '*') return '×';
      if (f.value === '/') return '÷';
      return f.value;
    })
    .join(' ');

  const streakText =
    streak === 1 ? '🔥 連續 1 天，好的開始！' : `🔥 連續 ${streak} 天`;

  const scoreLine = score !== null ? `本日總分：${score} 分` : '已完成';

  const sharePreviewText =
    `Math24 每日挑戰 ${today}\n` +
    `${streakText} | ${scoreLine}\n\n` +
    `🧮 #Math24Master math24master.com`;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(sharePreviewText);
      toast.success('已複製到剪貼簿！');
    } catch {
      toast.error('無法自動複製，請手動複製上方文字', { duration: Infinity });
    }
  };

  // ── 開始畫面 ──
  if (gameState === 'idle') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 p-4">
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-2xl font-bold">每日挑戰</h1>
          <p className="text-sm text-muted-foreground">{today}</p>
        </div>
        <div className="flex flex-col items-center gap-1 text-center text-sm text-muted-foreground">
          <p>每天 {TOTAL_ROUNDS} 題，累積你的連續挑戰紀錄</p>
          <p className="text-xs">每天 00:00（台灣時間）更新題目</p>
        </div>
        <Button variant="tactile" className="gap-1.5" onClick={startGame}>
          <Play className="h-4 w-4" />
          開始挑戰
        </Button>
        <Link
          href="/"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          回首頁
        </Link>
      </div>
    );
  }

  // ── 結算畫面 ──
  if (gameState === 'completed') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto p-4">
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-2xl font-bold">每日挑戰</h1>
          <p className="text-sm text-muted-foreground">{today}</p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex w-full max-w-sm flex-col items-center gap-4"
        >
          {/* 結算卡片 */}
          <div className="w-full rounded-2xl border-2 border-zinc-200 bg-white p-5 text-center shadow-[0_4px_0_0_rgba(0,0,0,0.05)] dark:border-zinc-700 dark:bg-zinc-900">
            <div className="font-display text-5xl font-black text-primary sm:text-6xl">
              {score !== null ? score : '完成'}
            </div>
            <div className="text-sm text-muted-foreground">
              本日總分（共 {TOTAL_ROUNDS} 題）
            </div>
            <div className="mt-2 text-sm font-semibold">{streakText}</div>
          </div>

          {/* 分享預覽 */}
          <pre className="w-full whitespace-pre-wrap border-l-2 border-foreground pl-3 font-mono text-xs leading-relaxed text-muted-foreground">
            {sharePreviewText}
          </pre>

          <Button
            variant="tactile"
            className="w-full"
            onClick={handleShare}
            aria-label="複製分享文字到剪貼簿"
          >
            複製分享
          </Button>

          {/* 各題解法面板 */}
          {solutionsPerPuzzle.map((solutions, i) => (
            <div key={i} className="flex w-full flex-col gap-1">
              <p className="text-xs font-semibold text-muted-foreground">
                第 {i + 1} 題（{puzzles[i]?.join('、')}）
              </p>
              <SolutionsPanel
                solutions={solutions}
                userFormula={userFormulas[i] ?? ''}
              />
            </div>
          ))}

          {/* CTA */}
          <div className="flex w-full gap-3">
            <Link href="/single-play" className="flex-1">
              <Button variant="outline" className="w-full">
                繼續練習
              </Button>
            </Link>
            <Link href="/multiple-play" className="flex-1">
              <Button variant="outline" className="w-full">
                挑戰朋友
              </Button>
            </Link>
          </div>
        </motion.div>
        <Link
          href="/"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          回首頁
        </Link>
      </div>
    );
  }

  // ── 遊戲中 ──
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-4">
      {/* 標題區 + HUD */}
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-2xl font-bold">每日挑戰</h1>
        <p className="text-sm text-muted-foreground">{today}</p>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="font-display text-2xl font-bold text-foreground">
            第 <span className="text-primary">{currentRound + 1}</span> /{' '}
            {TOTAL_ROUNDS} 題
          </span>
        </div>
      </div>

      {/* 牌組顯示 */}
      <div className="flex gap-4">
        {cards.map((card, index) => (
          <button
            key={`${currentRound}-${index}`}
            onClick={() => handleAddNumber(index)}
            className={cn(
              'flex h-20 w-14 items-center justify-center rounded-2xl border-2 font-display text-2xl font-bold transition-all',
              usedCardIndices.has(index)
                ? 'scale-95 border-primary bg-primary text-primary-foreground shadow-[0_5px_0_0_hsl(175_84%_22%)]'
                : 'border-zinc-200 bg-white text-zinc-800 shadow-[0_5px_0_0_rgba(0,0,0,0.08)] hover:scale-105 hover:border-primary/50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100',
            )}
          >
            {card}
          </button>
        ))}
      </div>

      {/* 公式顯示框 */}
      <div className="flex h-12 w-full max-w-xs items-center justify-center rounded-2xl border-2 border-zinc-200 bg-white px-4 font-display text-lg font-medium shadow-[0_4px_0_0_rgba(0,0,0,0.05)] dark:border-zinc-700 dark:bg-zinc-900">
        {formulaDisplay || (
          <span className="text-sm text-muted-foreground">組合你的算式</span>
        )}
      </div>

      {/* 符號按鈕 */}
      <div className="grid grid-cols-3 gap-2">
        {SYMBOLS.map(({ label, value }) => (
          <Button
            key={value}
            variant="outline"
            className="h-12 w-16 rounded-2xl border-2 border-zinc-200 bg-white font-display text-lg shadow-[0_3px_0_0_rgba(0,0,0,0.06)] hover:border-primary/40 active:translate-y-0.5 active:shadow-none dark:border-zinc-700 dark:bg-zinc-800"
            onClick={() => handleAddSymbol(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* 操作按鈕 */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          disabled={formula.length === 0}
          onClick={handleBack}
        >
          <Image
            src="/backspace.svg"
            alt="backspace"
            width={18}
            height={18}
            priority
            className="mr-1"
          />
          倒退
        </Button>
        <Button
          variant="outline"
          disabled={formula.length === 0}
          onClick={handleClear}
        >
          <Image
            src="/reset.svg"
            alt="reset"
            width={20}
            height={20}
            priority
            className="mr-1"
          />
          清除
        </Button>
        <Button
          variant="tactile"
          disabled={formula.length === 0}
          onClick={handleSubmit}
        >
          <Image
            src="/card-play.svg"
            alt="submit"
            width={16}
            height={16}
            priority
            className="mr-1"
          />
          出牌
        </Button>
      </div>

      {/* 返回首頁 */}
      <Link
        href="/"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        回首頁
      </Link>
    </div>
  );
}
