import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Image from 'next/image';
import ActionArea from '@/components/areas/action-area';
import HandCardArea from '@/components/areas/hand-card-area';
import PlayerInfoArea from '@/components/areas/player-info-area';
import MainPlayArea from '@/components/areas/playing/main-play-area';
import HoverTip from '@/components/hover-tip';
import MainLayout from '@/components/layouts/main-layout';
import { NumberCard, Player } from '@/models/Player';
import { MAX_CARD_COUNT, Room } from '@/models/Room';
import { SelectedCard } from '@/models/SelectedCard';
import { Symbol } from '@/models/Symbol';
import { useAlertDialogStore } from '@/providers/alert-dialog-store-provider';

type MultiplePlayingAreaProps = {
  isGameOver: boolean;
  roomInfo: Room;
  checkAnswerCorrect: boolean | null;
  isAnimationFinished: boolean;
  onFinishedAnimations: () => void;
  updateScore: () => void;
  selectedCardSymbols: SelectedCard[];
  selectedCardNumbers: SelectedCard[];
  onSelectCardOrSymbol: ({
    symbol,
    number,
  }: {
    symbol?: Symbol;
    number?: NumberCard;
  }) => void;
  currentPlayer?: Player;
  discardCard: (cardId: string) => void;
  playCard: () => void;
  onReselect: () => void;
  onSort: () => void;
  drawCard: () => void;
};

const MultiplePlayingArea = ({
  isGameOver,
  roomInfo,
  checkAnswerCorrect,
  isAnimationFinished,
  onFinishedAnimations,
  updateScore,
  selectedCardSymbols,
  selectedCardNumbers,
  onSelectCardOrSymbol,
  currentPlayer,
  discardCard,
  playCard,
  onReselect,
  onSort,
  drawCard,
}: MultiplePlayingAreaProps) => {
  // 需要棄牌
  const [needDiscard, setNeedDiscard] = useState(false);
  const { onOpen, isConfirmed, onReset } = useAlertDialogStore(state => state);
  const handCard = currentPlayer?.handCard || [];

  const disabledActions =
    needDiscard || checkAnswerCorrect === true || !!isGameOver;

  console.log(currentPlayer);
  useEffect(() => {
    if (isConfirmed) {
      window.location.href = '/multiple-play';
      onReset();
    }
  }, [isConfirmed, onReset]);

  useEffect(() => {
    // 如果手牌超過8張須棄牌
    if (handCard.length > MAX_CARD_COUNT) {
      setTimeout(() => {
        toast.error('請點選 1 張牌棄掉');
        setNeedDiscard(true);
      }, 500);
    }
  }, [handCard.length]);

  return (
    <MainLayout>
      <div className="relative flex w-full basis-1/5">
        <div className="absolute right-5 top-5 flex gap-4">
          {/* 遊戲規則 */}
          <HoverTip content="遊戲規則">
            <Image
              src="/document.svg"
              alt="document"
              width={24}
              height={24}
              priority
            />
          </HoverTip>
          {/* 返回首頁 */}
          <HoverTip content="離開房間">
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
};

export default MultiplePlayingArea;
