'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ActionArea from '@/components/areas/action-area';
import HandCardArea from '@/components/areas/hand-card-area';
import PlayerInfoArea from '@/components/areas/player-info-area';
import MainPlayArea from '@/components/areas/playing/main-play-area';
import HoverTip from '@/components/hover-tip';
import MainLayout from '@/components/layouts/main-layout';
import { RuleModal } from '@/components/modals/rule-modal';
import useSinglePlay from '@/hooks/useSinglePlay';
import { MAX_CARD_COUNT } from '@/models/Room';
import { useAlertDialogStore } from '@/providers/alert-dialog-store-provider';

export default function SinglePlayPage() {
  const [bestScore, setBestScore] = useState<number>();
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);

  // 需要棄牌
  const [needDiscard, setNeedDiscard] = useState(false);

  const router = useRouter();
  const {
    roomInfo,
    onSort,
    playCard,
    drawCard,
    discardCard,
    onSelectCardOrSymbol,
    onReselect,
    checkAnswerCorrect,
    isAnimationFinished,
    selectedCardSymbols,
    selectedCardNumbers,
    updateScore,
    isGameOver,
    onFinishedAnimations,
  } = useSinglePlay();

  const currentPlayer = roomInfo?.players[0];
  const handCard = currentPlayer?.handCard || [];

  const { onOpen, isConfirmed, onReset } = useAlertDialogStore(state => state);

  const disabledActions =
    needDiscard || checkAnswerCorrect === true || !!isGameOver;

  useEffect(() => {
    if (isConfirmed) {
      router.push('/');
      onReset();
    }
  }, [isConfirmed, onReset, router]);

  useEffect(() => {
    // 如果手牌超過8張須棄牌
    if (handCard.length > MAX_CARD_COUNT) {
      setTimeout(() => {
        toast.error('請點選 1 張牌棄掉');
        setNeedDiscard(true);
      }, 500);
    }
  }, [handCard.length]);

  useEffect(() => {
    if (roomInfo?.isGameOver && currentPlayer?.score) {
      if (!bestScore || bestScore < currentPlayer?.score) {
        localStorage.setItem('bestScore', String(currentPlayer?.score));
        setBestScore(currentPlayer.score);
      }
      toast.success(`遊戲結束，總分為 ${currentPlayer?.score}`, {
        autoClose: 5000,
      });
    }
  }, [bestScore, currentPlayer?.score, roomInfo?.isGameOver]);

  useEffect(() => {
    const score = localStorage.getItem('bestScore');
    if (score) {
      setBestScore(Number(score));
    }
  }, []);

  return (
    <MainLayout>
      <RuleModal isOpen={isOpenRuleModal} onOpenChange={setIsOpenRuleModal} />
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
      <div className="relative flex flex-1 flex-col items-center gap-8">
        <MainPlayArea
          checkAnswerCorrect={checkAnswerCorrect}
          selectedCards={roomInfo?.selectedCards}
          isAnimationFinished={isAnimationFinished}
          onFinishedAnimations={onFinishedAnimations}
          onUpdateScore={updateScore}
          selectedCardSymbols={selectedCardSymbols}
          selectedCardNumbers={selectedCardNumbers}
          onSelectSymbol={symbol => onSelectCardOrSymbol({ symbol })}
        />
      </div>
      <div className="relative flex w-full basis-1/5">
        <PlayerInfoArea
          bestScore={bestScore}
          isLastRoundPlayer={currentPlayer?.isLastRoundPlayer}
          remainCards={roomInfo?.deck.length}
          score={currentPlayer?.score}
        />
        <HandCardArea
          selectedCards={roomInfo?.selectedCards || []}
          handCard={handCard}
          needDiscard={needDiscard}
          onSelect={number => onSelectCardOrSymbol({ number })}
          onDiscard={id => {
            setNeedDiscard(false);
            discardCard(id);
          }}
        />
        <ActionArea
          isSinglePlay={true}
          disabledActions={disabledActions}
          onSubmit={playCard}
          onReselect={onReselect}
          onSort={onSort}
          onEndPhase={() => {
            onReselect();
            drawCard();
          }}
        />
      </div>
    </MainLayout>
  );
}
