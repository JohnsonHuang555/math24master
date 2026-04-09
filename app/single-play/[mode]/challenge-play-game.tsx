'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Symbols from '@/components/symbols';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useChallengePlay } from '@/hooks/useChallengePlay';
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

interface ChallengePlayGameProps {
  onBack: () => void;
  autoStart?: boolean;
}

export default function ChallengePlayGame({ onBack, autoStart }: ChallengePlayGameProps) {
  const {
    status,
    stage,
    totalScore,
    currentNumbers,
    selectedCards,
    seconds,
    errorMessage,
    best,
    startGame,
    selectCard,
    removeCard,
    clearSelection,
    submitAnswer,
    skipPuzzle,
    quitGame,
  } = useChallengePlay();

  useEffect(() => {
    if (autoStart) startGame();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 開始畫面
  if (status === 'idle') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold">挑戰模式</h1>
          <p className="text-muted-foreground">倒數 5 分鐘，答對加 1 分鐘</p>
          <p className="text-sm text-muted-foreground">
            跳過不加時・撐越多關越好
          </p>
        </div>
        {best && (
          <div className="w-full max-w-xs rounded-xl border p-4 text-center">
            <p className="text-sm font-semibold text-muted-foreground">
              個人最佳
            </p>
            <p className="text-2xl font-bold">第 {best.stage} 關</p>
            <p className="text-sm text-muted-foreground">{best.totalScore} 分</p>
          </div>
        )}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onBack()}>
            返回
          </Button>
          <Button onClick={startGame}>開始挑戰</Button>
        </div>
      </div>
    );
  }

  // 結束畫面
  if (status === 'finished') {
    const isNewBest = best && best.stage === stage;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-bold">時間到！</h1>
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-5xl font-bold">第 {stage} 關</p>
          <p className="text-muted-foreground">最終關卡</p>
          <p className="mt-2 text-2xl font-semibold">{totalScore} 分</p>
          {isNewBest && (
            <p className="text-sm font-semibold text-amber-500">🏆 新紀錄！</p>
          )}
        </div>
        {best && !isNewBest && (
          <div className="text-sm text-muted-foreground">
            個人最佳：第 {best.stage} 關（{best.totalScore} 分）
          </div>
        )}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onBack()}>
            返回選單
          </Button>
          <Button onClick={startGame}>再挑戰</Button>
        </div>
      </div>
    );
  }

  // 遊戲中
  const selectedNumberIds = new Set(
    selectedCards.filter(c => c.number).map(c => c.number!.id),
  );
  const isLowTime = seconds <= 60;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-4 px-2">
      {/* 標頭 */}
      <div className="flex w-full max-w-md items-center justify-between rounded-xl border px-4 py-2 text-sm font-semibold">
        <span>第 {stage} 關</span>
        <span className={isLowTime ? 'text-red-500 animate-pulse' : ''}>
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
        <Button variant="outline" onClick={skipPuzzle}>
          跳過
        </Button>
        <Button onClick={submitAnswer}>確認</Button>
      </div>
    </div>
  );
}
