'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ActionArea from '@/components/areas/action-area';
import HandCardArea from '@/components/areas/hand-card-area';
import MainPlayArea from '@/components/areas/main-play-area';
import PlayerInfoArea from '@/components/areas/player-info-area';
import HoverTip from '@/components/hover-tip';
import { GameOverModal } from '@/components/modals/game-over-modal';
import { RuleModal } from '@/components/modals/rule-modal';
import { Button } from '@/components/ui/button';
import useSinglePlay from '@/hooks/useSinglePlay';
import { cn } from '@/lib/utils';
import { Difficulty } from '@/models/Room';
import { useAlertDialogStore } from '@/providers/alert-dialog-store-provider';

const DIFFICULTY_OPTIONS = [
  {
    value: Difficulty.Easy,
    label: '簡單',
    description: '牌值 1-6',
    color: 'border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950',
    activeColor: 'bg-green-500 text-white hover:bg-green-600',
  },
  {
    value: Difficulty.Normal,
    label: '普通',
    description: '牌值 1-10',
    color: 'border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950',
    activeColor: 'bg-blue-500 text-white hover:bg-blue-600',
  },
  {
    value: Difficulty.Hard,
    label: '困難',
    description: '牌值 1-13',
    color: 'border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950',
    activeColor: 'bg-red-500 text-white hover:bg-red-600',
  },
] as const;

export default function SinglePlayPage() {
  const [bestScore, setBestScore] = useState<number>();
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);
  const [isGameOverModalOpen, setIsGameOverModalOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(
    Difficulty.Normal,
  );

  const router = useRouter();
  const {
    roomInfo,
    onPlayCard,
    onDrawCard,
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
    onBack,
    isLastRound,
  } = useSinglePlay(difficulty);

  const currentPlayer = roomInfo?.players[0];
  const handCard = currentPlayer?.handCard || [];

  const { onOpen, isConfirmed, onReset } = useAlertDialogStore(state => state);

  const disabledActions = checkAnswerCorrect === true || !!isGameOver;

  useEffect(() => {
    if (isConfirmed) {
      router.push('/');
      onReset();
    }
  }, [isConfirmed, onReset, router]);

  useEffect(() => {
    if (roomInfo?.isGameOver) {
      const currentScore = roomInfo.players[0].score;
      if (!bestScore || bestScore < currentScore) {
        localStorage.setItem('bestScore', String(currentScore));
        setBestScore(currentScore);
      }
      setIsGameOverModalOpen(true);
    }
  }, [roomInfo?.isGameOver]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const score = localStorage.getItem('bestScore');
    if (score) {
      setBestScore(Number(score));
    }
  }, []);

  const currentScore = roomInfo?.players[0]?.score ?? 0;
  const isNewBestScore =
    isGameOver && (!bestScore || currentScore >= bestScore);

  // 難度選擇畫面
  if (!difficulty) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-bold">選擇難度</h1>
          <p className="text-sm text-muted-foreground">請選擇遊戲難度後開始</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {DIFFICULTY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={cn(
                'rounded-xl border-2 px-6 py-4 text-left transition-all',
                opt.color,
                selectedDifficulty === opt.value && opt.activeColor,
              )}
              onClick={() => setSelectedDifficulty(opt.value)}
            >
              <div className="font-bold text-lg">{opt.label}</div>
              <div
                className={cn(
                  'text-sm',
                  selectedDifficulty === opt.value
                    ? 'text-white/80'
                    : 'text-muted-foreground',
                )}
              >
                {opt.description}
              </div>
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push('/')}>
            返回首頁
          </Button>
          <Button onClick={() => setDifficulty(selectedDifficulty)}>
            開始遊戲
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <RuleModal isOpen={isOpenRuleModal} onOpenChange={setIsOpenRuleModal} />
      <GameOverModal
        isOpen={isGameOverModalOpen}
        onClose={() => setIsGameOverModalOpen(false)}
        players={roomInfo?.players ?? []}
        isSinglePlay
        isNewBestScore={isNewBestScore}
        onPlayAgain={() => window.location.reload()}
        onGoHome={() => router.push('/')}
      />
      <div className="relative flex w-full basis-1/5">
        <div className="absolute right-5 top-5 flex gap-5">
          {/* 再來一局 */}
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
          {/* 遊戲規則 */}
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
          {/* 返回首頁 */}
          <HoverTip content="回首頁">
            <Image
              src="/leave.svg"
              alt="leave"
              width={28}
              height={28}
              priority
              onClick={() =>
                onOpen({
                  title: '回到首頁',
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
          onBack={onBack}
          onSkip={onSkipHand}
          selectedCards={roomInfo?.selectedCards || []}
          isLastRound={isLastRound}
        />
      </div>
    </>
  );
}
