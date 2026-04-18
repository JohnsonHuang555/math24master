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
import { StartGameModal } from '@/components/modals/start-game-modal';
import { Button } from '@/components/ui/button';
import useSinglePlay from '@/hooks/useSinglePlay';
import { cn } from '@/lib/utils';
import { Difficulty } from '@/models/Room';
import { useAlertDialogStore } from '@/providers/alert-dialog-store-provider';
import { useStatsStore } from '@/stores/stats-store';
import NormalPlayGame from '@/app/single-play/[mode]/normal-play-game';
import ChallengePlayGame from '@/app/single-play/[mode]/challenge-play-game';

type PlayMode = 'classic' | 'normal' | 'challenge';

const MODE_OPTIONS = [
  {
    value: 'classic' as const,
    label: '經典模式',
    description: '自選難度，目標挑戰最高分',
    color:
      'border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950',
    activeColor: 'bg-purple-500 text-white hover:bg-purple-600',
  },
  {
    value: 'normal' as const,
    label: '關卡模式',
    description: '總共十題，關關難過關關過',
    color:
      'border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950',
    activeColor: 'bg-blue-500 text-white hover:bg-blue-600',
  },
  {
    value: 'challenge' as const,
    label: '挑戰模式',
    description: '計時五分鐘，看看你能挑戰多少分',
    color:
      'border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950',
    activeColor: 'bg-orange-500 text-white hover:bg-orange-600',
  },
] as const;

export default function SinglePlayPage() {
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);
  const [isGameOverModalOpen, setIsGameOverModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(
    Difficulty.Normal,
  );
  const [activeMode, setActiveMode] = useState<PlayMode | null>(null);
  const [selectedMode, setSelectedMode] = useState<PlayMode>('classic');

  const router = useRouter();
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
    onBack,
    isLastRound,
  } = useSinglePlay(difficulty);

  const currentPlayer = roomInfo?.players[0];
  const handCard = currentPlayer?.handCard || [];

  const { onOpen, isConfirmed, onReset } = useAlertDialogStore(state => state);
  const { classicBestScore: bestScore, updateClassicBestScore: updateBestScore } = useStatsStore();

  const disabledActions = checkAnswerCorrect === true || !!isGameOver;

  useEffect(() => {
    if (isConfirmed) {
      setActiveMode(null);
      setDifficulty(null);
      onReset();
    }
  }, [isConfirmed, onReset]);

  useEffect(() => {
    if (roomInfo?.isGameOver) {
      const currentScore = roomInfo.players[0].score;
      updateBestScore(currentScore);
      setIsGameOverModalOpen(true);
    }
  }, [roomInfo?.isGameOver]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentScore = roomInfo?.players[0]?.score ?? 0;
  const isNewBestScore =
    isGameOver && currentScore > 0 && currentScore >= bestScore;

  const handleConfirm = () => {
    setActiveMode(selectedMode);
    if (selectedMode === 'classic') {
      setDifficulty(selectedDifficulty);
    }
    setIsModalOpen(false);
  };

  // 模式選擇畫面
  if (!activeMode) {
    return (
      <>
        <StartGameModal
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          selectedMode={selectedMode}
          selectedDifficulty={selectedDifficulty}
          onDifficultyChange={setSelectedDifficulty}
          onConfirm={handleConfirm}
        />
        <div className="flex h-full flex-col items-center justify-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-2xl font-bold">選擇模式</h1>
            <p className="text-sm text-muted-foreground">請選擇遊戲模式後開始</p>
          </div>
          <div className="flex w-full max-w-xs flex-col gap-3">
            {MODE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={cn(
                  'rounded-xl border-2 px-6 py-4 text-left transition-all',
                  opt.color,
                  selectedMode === opt.value && opt.activeColor,
                )}
                onClick={() => setSelectedMode(opt.value)}
              >
                <div className="text-lg font-bold">{opt.label}</div>
                <div
                  className={cn(
                    'text-sm',
                    selectedMode === opt.value
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
              回上一頁
            </Button>
            <Button onClick={() => setIsModalOpen(true)}>下一步</Button>
          </div>
        </div>
      </>
    );
  }

  // Normal 模式
  if (activeMode === 'normal') {
    return <NormalPlayGame onBack={() => setActiveMode(null)} autoStart />;
  }

  // Challenge 模式
  if (activeMode === 'challenge') {
    return <ChallengePlayGame onBack={() => setActiveMode(null)} autoStart />;
  }

  // Classic 模式
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
          {/* 返回上一頁 */}
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
          onBack={onBack}
          onSkip={onSkipHand}
          selectedCards={roomInfo?.selectedCards || []}
          isLastRound={isLastRound}
        />
      </div>
    </>
  );
}
