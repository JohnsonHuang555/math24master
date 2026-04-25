'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PuzzlePlayArea } from '@/components/areas/puzzle-play-area';
import { Button } from '@/components/ui/button';
import { useLeaderboardSubmit } from '@/hooks/useLeaderboardSubmit';
import { useNormalPlay } from '@/hooks/useNormalPlay';
import { cn, formatTime } from '@/lib/utils';

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
    penaltyCount,
    records,
    startGame,
    selectCard,
    removeCard,
    clearSelection,
    submitAnswer,
    skipPuzzle,
    quitGame,
  } = useNormalPlay();

  const [penaltyMsg, setPenaltyMsg] = useState<string | null>(null);
  const prevPenaltyRef = useRef(0);

  useLeaderboardSubmit(
    'normal',
    status === 'finished' ? { seconds, totalScore } : null,
    status === 'finished',
  );

  useEffect(() => {
    if (autoStart) startGame();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (penaltyCount > prevPenaltyRef.current) {
      prevPenaltyRef.current = penaltyCount;
      setPenaltyMsg('+10s');
      const id = setTimeout(() => setPenaltyMsg(null), 900);
      return () => clearTimeout(id);
    }
  }, [penaltyCount]);

  // 開始畫面
  if (status === 'idle') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold">關卡模式</h1>
          <p className="text-muted-foreground">10 題全部答對，計時結束</p>
          <p className="text-sm text-muted-foreground">
            答錯或跳過 +10 秒懲罰・符號越難分數越高
          </p>
        </div>
        {records.length > 0 && (
          <div className="w-full max-w-xs rounded-xl border p-4">
            <p className="mb-2 text-sm font-semibold text-muted-foreground">
              最近紀錄
            </p>
            <div className="flex flex-col gap-1">
              {records.slice(0, 3).map((r, i) => (
                <div key={i} className="flex justify-between text-sm">
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

  const isFlashing = !!penaltyMsg;

  // 遊戲中
  return (
    <PuzzlePlayArea
      currentNumbers={currentNumbers}
      selectedCards={selectedCards}
      onSelectCard={selectCard}
      onRemoveCard={removeCard}
      onClearSelection={clearSelection}
      onSubmit={submitAnswer}
      onSkip={skipPuzzle}
      onBack={() => {
        quitGame();
        onBack();
      }}
      showSkipButton={false}
      theme="blue"
    >
      {/* 計時器主視覺 */}
      <div className="flex flex-col items-center gap-0.5">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'text-5xl font-bold tabular-nums transition-colors duration-150',
              isFlashing || penaltyCount >= 2
                ? 'text-red-500'
                : 'text-blue-600 dark:text-blue-400',
            )}
          >
            {formatTime(seconds)}
          </span>
          <AnimatePresence>
            {penaltyMsg && (
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="text-sm font-bold text-red-500"
              >
                {penaltyMsg}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>第 {currentRound + 1}/{totalRounds} 題</span>
          <span>·</span>
          <span>{totalScore} 分</span>
        </div>
      </div>
    </PuzzlePlayArea>
  );
}
