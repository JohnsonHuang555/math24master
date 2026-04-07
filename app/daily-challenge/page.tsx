'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { SolutionsPanel } from '@/components/daily/solutions-panel';
import { Button } from '@/components/ui/button';
import { unlockAchievement } from '@/lib/achievement-manager';
import {
  type FormulaItem,
  type Solution,
  calculateDailyScore,
  evaluateFormula,
  findAllSolutions,
  getDailyCards,
  getDailyRecord,
  getTodayDateString,
  saveDailyRecord,
} from '@/lib/daily-seed';
import { playSound } from '@/lib/sound-manager';
import { cn } from '@/lib/utils';
import { useStatsStore } from '@/stores/stats-store';

const SYMBOLS = [
  { label: '+', value: '+' },
  { label: '-', value: '-' },
  { label: '×', value: '*' },
  { label: '÷', value: '/' },
  { label: '(', value: '(' },
  { label: ')', value: ')' },
] as const;

export default function DailyChallengePage() {
  const incrementDailyChallenge = useStatsStore(s => s.incrementDailyChallenge);
  const [today, setToday] = useState('');
  const [cards, setCards] = useState<number[]>([]);
  const [formula, setFormula] = useState<FormulaItem[]>([]);
  const [usedCardIndices, setUsedCardIndices] = useState<Set<number>>(
    new Set(),
  );
  const [isCompleted, setIsCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [allSolutions, setAllSolutions] = useState<Solution[]>([]);
  const isSubmitting = useRef(false);

  useEffect(() => {
    const currentDay = getTodayDateString();
    setToday(currentDay);
    const dailyCards = getDailyCards();
    setCards(dailyCards);

    const existing = getDailyRecord(currentDay);
    if (existing?.done) {
      setIsCompleted(true);
      setFinalScore(existing.score);
      setStreak(existing.streak);
      if (existing.formula?.length) setFormula(existing.formula);
      // defer solution computation to avoid blocking paint
      setTimeout(() => setAllSolutions(findAllSolutions(dailyCards)), 0);
    }
  }, []);

  const handleAddNumber = (index: number) => {
    if (isCompleted) return;
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
    if (isCompleted) return;
    playSound('select');
    setFormula(prev => [...prev, { type: 'symbol', value }]);
  };

  const handleBack = () => {
    if (isCompleted || formula.length === 0) return;
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
    if (isCompleted) return;
    setFormula([]);
    setUsedCardIndices(new Set());
  };

  const handleSubmit = () => {
    if (isCompleted || isSubmitting.current) return;
    isSubmitting.current = true;

    if (usedCardIndices.size !== 4) {
      toast.error('必須使用全部 4 張牌');
      isSubmitting.current = false;
      return;
    }

    const value = evaluateFormula(formula);
    if (value === null) {
      toast.error('算式有誤');
      playSound('wrong');
      isSubmitting.current = false;
      return;
    }

    if (Math.abs(value - 24) < 1e-6) {
      const score = calculateDailyScore(formula);
      const { streak: s } = saveDailyRecord(today, score, formula);
      setFinalScore(score);
      setStreak(s);
      setIsCompleted(true);
      playSound('correct');
      toast.success(`正確！得 ${score} 分`);
      unlockAchievement('daily_done');
      incrementDailyChallenge();
      setTimeout(() => setAllSolutions(findAllSolutions(cards)), 0);
    } else {
      playSound('wrong');
      isSubmitting.current = false;
      toast.error(`結果是 ${Math.round(value * 100) / 100}，不等於 24`);
    }
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
    streak === 1 ? '🔥 連續 1 天 — 好的開始！' : `🔥 連續 ${streak} 天`;

  const formulaLine = formulaDisplay || '（算式未記錄）';

  const sharePreviewText =
    `Math24 每日挑戰 ${today}\n` +
    `${streakText} | 得分：${finalScore} 分\n\n` +
    `算式：${formulaLine} = 24\n\n` +
    `🧮 #Math24Master math24master.com`;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(sharePreviewText);
      toast.success('已複製到剪貼簿！');
    } catch {
      toast.error('無法自動複製，請手動複製上方文字', { autoClose: false });
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-4">
      {/* 標題區 */}
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-2xl font-bold">每日挑戰</h1>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>

      {/* 結算畫面 */}
      {isCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex w-full max-w-sm flex-col items-center gap-4"
        >
          {/* 結算卡片 */}
          <div className="w-full rounded-xl border-2 border-foreground p-5 text-center">
            <div className="text-5xl font-black sm:text-6xl">{finalScore}</div>
            <div className="text-sm text-muted-foreground">分</div>
            <div className="mt-2 text-lg font-semibold">{formulaLine} = 24</div>
            <div className="mt-1 text-sm font-semibold">{streakText}</div>
          </div>

          {/* 分享預覽 */}
          <pre className="w-full whitespace-pre-wrap border-l-2 border-foreground pl-3 font-mono text-xs leading-relaxed text-muted-foreground">
            {sharePreviewText}
          </pre>

          {/* 複製分享按鈕 */}
          <Button
            className="w-full"
            onClick={handleShare}
            aria-label="複製分享文字到剪貼簿"
          >
            複製分享
          </Button>

          {/* 解法面板 */}
          <SolutionsPanel
            solutions={allSolutions}
            userFormula={formulaDisplay}
          />

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
      )}

      {/* 牌組顯示 */}
      <div className="flex gap-4">
        {cards.map((card, index) => (
          <button
            key={index}
            onClick={() => handleAddNumber(index)}
            disabled={isCompleted}
            className={cn(
              'flex h-16 w-12 items-center justify-center rounded-lg border-2 text-xl font-bold shadow transition-all',
              usedCardIndices.has(index)
                ? 'scale-95 border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card hover:scale-105 hover:border-primary',
              isCompleted && 'cursor-not-allowed opacity-60',
            )}
          >
            {card}
          </button>
        ))}
      </div>

      {/* 公式顯示框 */}
      <div className="flex h-12 w-full max-w-xs items-center justify-center rounded-lg border bg-muted/50 px-4 text-lg font-medium">
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
            className="h-12 w-16 text-lg"
            disabled={isCompleted}
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
          disabled={isCompleted || formula.length === 0}
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
          disabled={isCompleted || formula.length === 0}
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
          disabled={isCompleted || formula.length === 0}
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
