'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Symbols from '@/components/symbols';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNormalPlay } from '@/hooks/useNormalPlay';
import { fadeVariants } from '@/lib/animation-variants';
import { SelectedCard } from '@/models/SelectedCard';
import { Symbol } from '@/models/Symbol';

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function cardLabel(card: SelectedCard): string {
  if (card.number) return String(card.number.value);
  switch (card.symbol) {
    case Symbol.Times:
      return '×';
    case Symbol.Divide:
      return '÷';
    default:
      return card.symbol ?? '';
  }
}

interface NormalPlayGameProps {
  onBack: () => void;
  autoStart?: boolean;
}

export default function NormalPlayGame({ onBack, autoStart }: NormalPlayGameProps) {
  const {
    status,
    currentRound,
    totalRounds,
    currentNumbers,
    selectedCards,
    totalScore,
    seconds,
    errorMessage,
    records,
    startGame,
    selectCard,
    removeCard,
    clearSelection,
    submitAnswer,
    quitGame,
  } = useNormalPlay();

  useEffect(() => {
    if (autoStart) startGame();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 開始畫面
  if (status === 'idle') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold">關卡模式</h1>
          <p className="text-muted-foreground">10 題全部答對，計時結束</p>
          <p className="text-sm text-muted-foreground">
            答錯 +10 秒懲罰・符號越難分數越高
          </p>
        </div>
        {records.length > 0 && (
          <div className="w-full max-w-xs rounded-xl border p-4">
            <p className="mb-2 text-sm font-semibold text-muted-foreground">
              最近紀錄
            </p>
            <div className="flex flex-col gap-1">
              {records.slice(0, 3).map((r, i) => (
                <div
                  key={i}
                  className="flex justify-between text-sm"
                >
                  <span>{formatTime(r.totalSeconds)}</span>
                  <span className="text-muted-foreground">{r.totalScore} 分</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onBack()}>
            返回
          </Button>
          <Button onClick={startGame}>開始遊戲</Button>
        </div>
      </div>
    );
  }

  // 結束畫面
  if (status === 'finished') {
    const latest = records[0];
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-bold">完成！</h1>
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-5xl font-bold">{formatTime(seconds)}</p>
          <p className="text-muted-foreground">總用時</p>
          <p className="mt-2 text-2xl font-semibold">{totalScore} 分</p>
        </div>
        {records.length > 1 && latest && (
          <div className="w-full max-w-xs rounded-xl border p-4">
            <p className="mb-2 text-sm font-semibold text-muted-foreground">
              歷史最佳
            </p>
            {records.slice(0, 3).map((r, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{formatTime(r.totalSeconds)}</span>
                <span className="text-muted-foreground">{r.totalScore} 分</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onBack()}>
            返回選單
          </Button>
          <Button onClick={startGame}>再來一次</Button>
        </div>
      </div>
    );
  }

  // 遊戲中
  const selectedNumberIds = new Set(
    selectedCards.filter(c => c.number).map(c => c.number!.id),
  );

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-4 px-2">
      {/* 標頭 */}
      <div className="flex w-full max-w-md items-center justify-between rounded-xl border px-4 py-2 text-sm font-semibold">
        <span>
          第 {currentRound + 1}/{totalRounds} 題
        </span>
        <span
          className={seconds > 120 ? 'text-red-500' : 'text-foreground'}
        >
          ⏱ {formatTime(seconds)}
        </span>
        <span>{totalScore} 分</span>
      </div>

      {/* 數字牌 */}
      <div className="flex gap-4">
        {currentNumbers.map(card => {
          const isSelected = selectedNumberIds.has(card.id);
          return (
            <motion.div
              key={card.id}
              variants={fadeVariants}
              initial="hidden"
              animate="show"
              whileHover={{ scale: isSelected ? 1 : 1.08 }}
              whileTap={{ scale: 1 }}
            >
              <Card
                onClick={() => {
                  if (!isSelected) selectCard({ number: card });
                }}
                className={`flex aspect-[5/7] min-w-[70px] cursor-pointer items-center justify-center text-3xl font-bold transition-all md:min-w-[85px] ${
                  isSelected
                    ? 'bg-slate-400 text-slate-200 cursor-not-allowed opacity-60'
                    : 'bg-slate-200 hover:bg-slate-300'
                }`}
              >
                {card.value}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* 已選卡牌列 */}
      <div className="flex min-h-[52px] w-full max-w-md flex-wrap items-center gap-2 rounded-xl border p-2">
        {selectedCards.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            點選數字和符號組成算式...
          </span>
        ) : (
          selectedCards.map((card, i) => (
            <motion.button
              key={i}
              variants={fadeVariants}
              initial="hidden"
              animate="show"
              onClick={() => removeCard(i)}
              className="rounded-md bg-slate-200 px-3 py-1 text-sm font-semibold hover:bg-red-100 hover:text-red-600 transition-colors"
              title="點擊移除"
            >
              {cardLabel(card)}
            </motion.button>
          ))
        )}
      </div>

      {/* 符號列 */}
      <div className="flex gap-3">
        <Symbols onClick={symbol => selectCard({ symbol })} />
      </div>

      {/* 錯誤訊息 */}
      {errorMessage && (
        <p className="text-sm font-medium text-red-500">{errorMessage}</p>
      )}

      {/* 操作按鈕 */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => {
            quitGame();
            onBack();
          }}
        >
          回上一頁
        </Button>
        <Button variant="secondary" onClick={clearSelection}>
          清除
        </Button>
        <Button onClick={submitAnswer}>確認</Button>
      </div>
    </div>
  );
}
