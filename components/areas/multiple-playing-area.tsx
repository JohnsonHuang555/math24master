import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Image from 'next/image';
import ActionArea from '@/components/areas/action-area';
import HandCardArea from '@/components/areas/hand-card-area';
import PlayerInfoArea from '@/components/areas/player-info-area';
import HoverTip from '@/components/hover-tip';
import MainLayout from '@/components/layouts/main-layout';
import { HintModal } from '@/components/modals/hint-modal';
import { RuleModal } from '@/components/modals/rule-modal';
import { MAX_CARD_COUNT } from '@/models/Room';
import { useMultiplePlay } from '@/providers/multiple-play-provider';
import MainPlayArea from './main-play-area';

type MultiplePlayingAreaProps = {
  showCloseGamePlayingBtn: boolean;
  onCloseScreen: () => void;
};

const MultiplePlayingArea = ({
  showCloseGamePlayingBtn,
  onCloseScreen,
}: MultiplePlayingAreaProps) => {
  const {
    roomInfo,
    checkAnswerCorrect,
    isAnimationFinished,
    onFinishedAnimations,
    updateScore,
    selectedCardSymbols,
    selectedCardNumbers,
    onSelectCardOrSymbol,
    discardCard,
    playCard,
    onReselect,
    onSort,
    drawCard,
    currentPlayer,
    isYourTurn,
    onBack,
    isLastRound,
  } = useMultiplePlay();

  const otherPlayers = roomInfo?.players.filter(
    p => p.id !== currentPlayer?.id,
  );

  // 需要棄牌
  const [needDiscard, setNeedDiscard] = useState(false);
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);
  const [isOpenHintModal, setIsOpenHintModal] = useState(false);

  const handCard = currentPlayer?.handCard || [];

  // const disabledActions =
  //   needDiscard ||
  //   checkAnswerCorrect === true ||
  //   !!roomInfo?.isGameOver ||
  //   !isYourTurn;

  const disabledActions = needDiscard || !!roomInfo?.isGameOver;

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
    if (isYourTurn) {
      toast.info('你的回合');
    }
  }, [isYourTurn]);

  return (
    <MainLayout>
      <RuleModal isOpen={isOpenRuleModal} onOpenChange={setIsOpenRuleModal} />
      <HintModal isOpen={isOpenHintModal} onOpenChange={setIsOpenHintModal} />
      <div className="relative flex w-full basis-1/5 items-center justify-center">
        {/* 對手玩家 */}
        {otherPlayers?.map(player => (
          <div
            key={player.id}
            className="flex flex-1 flex-col items-center justify-center"
          >
            <>
              <div className="mb-2 flex items-center">
                <div className="mr-4 text-3xl font-semibold max-md:text-xl md:text-2xl">
                  {player.name}
                </div>
                {player.playerOrder === roomInfo?.currentOrder && (
                  <HoverTip content="該玩家的回合" notPointer>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-sm text-white">
                      C
                    </span>
                  </HoverTip>
                )}
                {player.isLastRoundPlayer && (
                  <HoverTip content="最後輪到的玩家" notPointer>
                    <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-sm text-white">
                      L
                    </span>
                  </HoverTip>
                )}
              </div>
              <div className="flex gap-5">
                <HoverTip content="持牌數" notPointer>
                  <div className="flex items-center">
                    <div className="relative max-lg:h-6 max-lg:w-6 lg:h-7 lg:w-7">
                      <Image
                        src="/player-card.svg"
                        alt="player-card"
                        fill
                        priority
                      />
                    </div>
                    <div className="ml-2 text-xl max-md:text-lg md:text-lg">
                      {player.handCard.length}
                    </div>
                  </div>
                </HoverTip>
                <div className="text-xl max-md:text-lg md:text-lg">
                  得分: {player.score}
                </div>
              </div>
            </>
          </div>
        ))}
        <div className="absolute right-5 top-5 flex gap-5">
          {/* 小提示 */}
          <HoverTip content="提示">
            <Image
              src="/question.svg"
              alt="question"
              width={24}
              height={24}
              priority
              onClick={() => setIsOpenHintModal(true)}
            />
          </HoverTip>
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
          <HoverTip content="離開房間">
            <Image
              src="/leave.svg"
              alt="leave"
              width={28}
              height={28}
              priority
              onClick={() => (window.location.href = '/multiple-play')}
            />
          </HoverTip>
          {/* 返回首頁 */}
          {showCloseGamePlayingBtn && (
            <HoverTip content="回到房間">
              <Image
                src="/close.svg"
                alt="close"
                width={24}
                height={24}
                priority
                onClick={onCloseScreen}
              />
            </HoverTip>
          )}
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
          isSinglePlay={false}
          disabledActions={disabledActions}
          onSubmit={playCard}
          onReselect={onReselect}
          onSort={onSort}
          onEndPhase={() => {
            onReselect();
            drawCard();
          }}
          onBack={onBack}
          isLastRound={isLastRound}
        />
      </div>
    </MainLayout>
  );
};

export default MultiplePlayingArea;
