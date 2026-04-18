'use client';

import { useEffect } from 'react';
import { PuzzlePlayArea } from '@/components/areas/puzzle-play-area';
import { Button } from '@/components/ui/button';
import { useChallengePlay } from '@/hooks/useChallengePlay';
import { formatTime } from '@/lib/utils';

interface ChallengePlayGameProps {
  onBack: () => void;
  autoStart?: boolean;
}

export default function ChallengePlayGame({ onBack, autoStart }: ChallengePlayGameProps) {
  const {
    status,
    finishReason,
    stage,
    totalScore,
    currentNumbers,
    selectedCards,
    seconds,
    best,
    startGame,
    selectCard,
    removeCard,
    clearSelection,
    submitAnswer,
    skipPuzzle,
    quitGame,
    endGameEarly,
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
            跳過 -15 秒・撐越多關越好
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
        <h1 className="text-3xl font-bold">
          {finishReason === 'early' ? '提前結算！' : '時間到！'}
        </h1>
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
  const isLowTime = seconds <= 60;

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
      showSkipButton={true}
    >
      <div className="flex w-full max-w-md items-center justify-between rounded-xl border px-4 py-2 text-sm font-semibold">
        <span>第 {stage} 關</span>
        <span className={isLowTime ? 'text-red-500 animate-pulse' : ''}>
          ⏱ {formatTime(seconds)}
        </span>
        <span>{totalScore} 分</span>
      </div>
      {seconds > 30 && stage >= 3 && (
        <Button
          variant="outline"
          className="w-full max-w-md text-muted-foreground"
          onClick={endGameEarly}
        >
          提前結算
        </Button>
      )}
    </PuzzlePlayArea>
  );
}
