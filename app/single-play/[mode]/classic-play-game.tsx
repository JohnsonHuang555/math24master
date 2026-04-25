'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Image from 'next/image';
import ActionArea from '@/components/areas/action-area';
import HandCardArea from '@/components/areas/hand-card-area';
import MainPlayArea from '@/components/areas/main-play-area';
import PlayerInfoArea from '@/components/areas/player-info-area';
import HoverTip from '@/components/hover-tip';
import { RuleModal } from '@/components/modals/rule-modal';
import { Button } from '@/components/ui/button';
import { useLeaderboardSubmit } from '@/hooks/useLeaderboardSubmit';
import useSinglePlay from '@/hooks/useSinglePlay';
import { Difficulty } from '@/models/Room';
import { useAlertDialogStore } from '@/providers/alert-dialog-store-provider';
import { useStatsStore } from '@/stores/stats-store';

type ClassicStatus = 'idle' | 'playing' | 'finished';

interface ClassicPlayGameProps {
  onBack: () => void;
  autoStart?: boolean;
}

export default function ClassicPlayGame({ onBack, autoStart }: ClassicPlayGameProps) {
  const [status, setStatus] = useState<ClassicStatus>('idle');
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);

  const {
    roomInfo,
    onPlayCard,
    onSkipHand,
    onSelectCardOrSymbol,
    onReselect,
    checkAnswerCorrect,
    isSymbolScoreAnimationFinished,
    selectedCardSymbols,
    selectedCardNumbers,
    onUpdateScore,
    isGameOver,
    onFinishedSymbolScoreAnimation,
    onBack: onBackCard,
    isLastRound,
  } = useSinglePlay(difficulty);

  const currentPlayer = roomInfo?.players[0];
  const handCard = currentPlayer?.handCard || [];
  const currentScore = roomInfo?.players[0]?.score ?? 0;

  const { onOpen, isConfirmed, onReset } = useAlertDialogStore(state => state);
  const { classicBestScore: bestScore, updateClassicBestScore: updateBestScore } = useStatsStore();

  const disabledActions = checkAnswerCorrect === true || !!isGameOver;

  const startGame = () => {
    setDifficulty(Difficulty.Hard);
    setStatus('playing');
  };

  useEffect(() => {
    if (autoStart) startGame();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isConfirmed) {
      onReset();
      window.location.reload();
    }
  }, [isConfirmed, onReset]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (roomInfo?.isGameOver) {
      updateBestScore(currentScore);
      setStatus('finished');
    }
  }, [roomInfo?.isGameOver]); // eslint-disable-line react-hooks/exhaustive-deps

  const isNewBestScore = status === 'finished' && currentScore > 0 && currentScore >= bestScore;

  useLeaderboardSubmit(
    'classic',
    isGameOver ? { score: currentScore } : null,
    !!isGameOver,
  );

  // 開始畫面
  if (status === 'idle') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold">經典模式</h1>
          <p className="text-muted-foreground">牌值 1–13・累積最高分</p>
          <p className="text-sm text-muted-foreground">
            答對得分・跳過換牌・牌組用完遊戲結束
          </p>
        </div>
        {bestScore > 0 && (
          <div className="w-full max-w-xs rounded-xl border p-4 text-center">
            <p className="text-sm font-semibold text-muted-foreground">個人最高</p>
            <p className="text-2xl font-bold">{bestScore} 分</p>
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
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-bold">遊戲結束</h1>
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-5xl font-bold">{currentScore} 分</p>
          <p className="text-muted-foreground">最終得分</p>
          {isNewBestScore && (
            <p className="text-sm font-semibold text-amber-500">🏆 新紀錄！</p>
          )}
        </div>
        {!isNewBestScore && bestScore > 0 && (
          <div className="text-sm text-muted-foreground">
            個人最高：{bestScore} 分
          </div>
        )}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onBack()}>
            返回選單
          </Button>
          <Button onClick={() => window.location.reload()}>再來一局</Button>
        </div>
      </div>
    );
  }

  // 遊戲中
  return (
    <>
      <RuleModal isOpen={isOpenRuleModal} onOpenChange={setIsOpenRuleModal} />
      <div className="relative flex w-full basis-1/5">
        <div className="absolute right-5 top-5 flex gap-5">
          {isGameOver && (
            <HoverTip content="再來一局">
              <Image
                src="/replay.svg"
                alt="replay"
                width={30}
                height={30}
                priority
                onClick={() => window.location.reload()}
              />
            </HoverTip>
          )}
          <HoverTip content="遊戲規則">
            <Image
              src="/document.svg"
              alt="document"
              width={24}
              height={24}
              priority
              onClick={() => setIsOpenRuleModal(true)}
            />
          </HoverTip>
          <HoverTip content="回上一頁">
            <Image
              src="/leave.svg"
              alt="leave"
              width={28}
              height={28}
              priority
              onClick={() =>
                onOpen({
                  title: '回上一頁',
                  description: isGameOver
                    ? '離開遊戲回到首頁'
                    : '離開遊戲後，當前進度將會消失，確定要離開嗎？',
                })
              }
            />
          </HoverTip>
        </div>
      </div>
      <div className="relative flex flex-1 flex-col items-center gap-8 max-sm:gap-2">
        <MainPlayArea
          checkAnswerCorrect={checkAnswerCorrect}
          selectedCards={roomInfo?.selectedCards}
          isSymbolScoreAnimationFinished={isSymbolScoreAnimationFinished}
          onFinishedSymbolScoreAnimation={onFinishedSymbolScoreAnimation}
          onUpdateScore={onUpdateScore}
          selectedCardSymbols={selectedCardSymbols}
          selectedCardNumbers={selectedCardNumbers}
          onSelectSymbol={symbol => onSelectCardOrSymbol({ symbol })}
        />
      </div>
      <div className="relative flex w-full basis-1/5">
        <PlayerInfoArea
          isSinglePlay={true}
          bestScore={bestScore}
          isLastRoundPlayer={currentPlayer?.isLastRoundPlayer}
          remainCards={roomInfo?.deck.length}
          score={currentPlayer?.score}
        />
        <HandCardArea
          selectedCards={roomInfo?.selectedCards || []}
          handCard={handCard}
          onSelect={number => onSelectCardOrSymbol({ number })}
        />
        <ActionArea
          disabledActions={disabledActions}
          onSubmit={() => {
            const selectedNumberCount =
              roomInfo?.selectedCards.filter(c => c.number).length ?? 0;
            if (selectedNumberCount !== handCard.length) {
              toast.error(`必須使用全部 ${handCard.length} 張手牌`);
              return;
            }
            onPlayCard();
          }}
          onReselect={onReselect}
          onBack={onBackCard}
          onSkip={onSkipHand}
          selectedCards={roomInfo?.selectedCards || []}
          isLastRound={isLastRound}
        />
      </div>
    </>
  );
}
