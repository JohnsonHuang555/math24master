'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Image from 'next/image';
import Link from 'next/link';
import { unlockAchievement } from '@/lib/achievement-manager';
import { playSound } from '@/lib/sound-manager';
import {
  DailyChallengeRecord,
  FormulaItem,
  calculateDailyScore,
  evaluateFormula,
  getDailyCards,
  getDailyChallengeRecord,
  getTodayDateString,
  saveDailyChallengeRecord,
} from '@/lib/daily-seed';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const SYMBOLS = [
  { label: '+', value: '+' },
  { label: '-', value: '-' },
  { label: '×', value: '*' },
  { label: '÷', value: '/' },
  { label: '(', value: '(' },
  { label: ')', value: ')' },
] as const;

export default function DailyChallengePage() {
  const [cards, setCards] = useState<number[]>([]);
  const [formula, setFormula] = useState<FormulaItem[]>([]);
  const [usedCardIndices, setUsedCardIndices] = useState<Set<number>>(
    new Set(),
  );
  const [record, setRecord] = useState<DailyChallengeRecord | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  useEffect(() => {
    const dailyCards = getDailyCards();
    setCards(dailyCards);

    const existing = getDailyChallengeRecord();
    if (existing?.done) {
      setRecord(existing);
      setIsCompleted(true);
      setFinalScore(existing.score);
    }
  }, []);

  const handleAddNumber = (index: number) => {
    if (isCompleted) return;
    if (usedCardIndices.has(index)) {
      // 取消選取：從公式中移除該牌
      const newFormula = formula.filter(
        f => !(f.type === 'number' && f.cardIndex === index),
      );
      setFormula(newFormula);
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
    const newFormula = formula.slice(0, -1);
    setFormula(newFormula);
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
    if (isCompleted) return;

    if (usedCardIndices.size !== 4) {
      toast.error('必須使用全部 4 張牌');
      return;
    }

    const value = evaluateFormula(formula);
    if (value === null) {
      toast.error('算式有誤');
      playSound('wrong');
      return;
    }

    if (Math.abs(value - 24) < 1e-6) {
      const score = calculateDailyScore(formula);
      saveDailyChallengeRecord(score);
      setFinalScore(score);
      setIsCompleted(true);
      playSound('correct');
      toast.success(`正確！得 ${score} 分`);
      unlockAchievement('daily_done');
    } else {
      playSound('wrong');
      toast.error(`結果是 ${Math.round(value * 100) / 100}，不等於 24`);
    }
  };

  /** 顯示公式字串（便於閱讀） */
  const formulaDisplay = formula
    .map(f => {
      if (f.type === 'number') return f.value;
      if (f.value === '*') return '×';
      if (f.value === '/') return '÷';
      return f.value;
    })
    .join(' ');

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-4">
      {/* 標題區 */}
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-2xl font-bold">每日挑戰</h1>
        <p className="text-sm text-muted-foreground">{getTodayDateString()}</p>
      </div>

      {/* 結算狀態 */}
      {isCompleted && (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 shadow-sm">
          <div className="text-sm text-muted-foreground">今日挑戰完成！</div>
          <div className="text-5xl font-bold text-primary">{finalScore}</div>
          <div className="text-sm text-muted-foreground">得分</div>
          {record && (
            <div className="text-xs text-muted-foreground">
              挑戰日期：{record.date}
            </div>
          )}
        </div>
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
                ? 'border-primary bg-primary text-primary-foreground scale-95'
                : 'border-border bg-card hover:border-primary hover:scale-105',
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
      <Link href="/" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        回首頁
      </Link>
    </div>
  );
}
