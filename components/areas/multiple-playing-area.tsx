import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Image from 'next/image';
import ActionArea from '@/components/areas/action-area';
import HandCardArea from '@/components/areas/hand-card-area';
import PlayerInfoArea from '@/components/areas/player-info-area';
import HoverTip from '@/components/hover-tip';
import MainLayout from '@/components/layouts/main-layout';
import { RuleModal } from '@/components/modals/rule-modal';
import { MAX_CARD_COUNT } from '@/models/Room';
import { useMultiplePlay } from '@/providers/multiple-play-provider';
import MainPlayArea from './main-play-area';

type MultiplePlayingAreaProps = {
  // showCloseGamePlayingBtn: boolean;
  // onCloseScreen: () => void;
};

const MultiplePlayingArea = (
  {
    // showCloseGamePlayingBtn,
    // onCloseScreen,
  }: MultiplePlayingAreaProps,
) => {
  const {
    roomInfo,
    checkAnswerCorrect,
    isAnimationFinished,
    onFinishedAnimations,
    updateScore,
    selectedCardSymbols,
    selectedCardNumbers,
    onSelectCardOrSymbol,
    onDiscardCard,
    onPlayCard,
    onReselect,
    onSort,
    onDrawCard,
    currentPlayer,
    isYourTurn,
    onBack,
    isLastRound,
    countdown,
  } = useMultiplePlay();

  const otherPlayers = roomInfo?.players.filter(
    p => p.id !== currentPlayer?.id,
  );

  // 需要棄牌
  const [needDiscard, setNeedDiscard] = useState(false);
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);

  const handCard = currentPlayer?.handCard || [];

  // const disabledActions =
  //   needDiscard ||
  //   checkAnswerCorrect === true ||
  //   !!roomInfo?.isGameOver ||
  //   !isYourTurn;

  const disabledActions = needDiscard || !!roomInfo?.isGameOver || !isYourTurn;

  useEffect(() => {
    // 如果手牌超過8張須棄牌
    if (handCard.length > MAX_CARD_COUNT) {
      setTimeout(() => {
        toast.error('請點選 1 張牌丟棄');
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
      <div className="relative flex w-full basis-1/5 items-center justify-center">
        {/* 對手玩家 */}
        {otherPlayers?.map(player => (
          <div
            key={player.id}
            className="flex flex-1 flex-col items-center justify-center"
          >
            <>
              <div className="mb-2 flex items-center">
                <div className="mr-4 text-3xl font-semibold max-md:text-xl max-sm:mr-2 md:text-2xl">
                  {player.name}
                </div>
                {player.playerOrder === roomInfo?.currentOrder && (
                  <HoverTip content="該玩家的回合" notPointer>
                    <span className="flex h-5 w-9 items-center justify-center rounded-full bg-primary text-sm text-white max-sm:text-xs">
                      換他
                    </span>
                  </HoverTip>
                )}
                {player.isLastRoundPlayer && (
                  <HoverTip content="最後輪到的玩家" notPointer>
                    <span className="ml-2 flex h-5 w-9 items-center justify-center rounded-full bg-red-600 text-sm text-white max-sm:text-xs">
                      最後
                    </span>
                  </HoverTip>
                )}
              </div>
              <div className="flex gap-5 max-sm:gap-2">
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
        {countdown && (
          <div className="absolute left-5 top-5 flex items-center gap-2">
            {/* 剩餘時間 */}
            <HoverTip content="回合剩餘時間">
              <div className="relative h-7 w-7 max-sm:h-6 max-sm:w-6">
                <Image src="/timer.svg" alt="timer" fill priority />
              </div>
            </HoverTip>
            <div className="text-lg">{countdown}</div>
          </div>
        )}
        <div className="absolute right-5 top-5 flex gap-5">
          {/* 遊戲規則 */}
          <HoverTip content="遊戲規則">
            <div className="relative h-6 w-6 max-sm:h-5 max-sm:w-5">
              <Image
                src="/document.svg"
                alt="document"
                fill
                priority
                onClick={() => setIsOpenRuleModal(true)}
              />
            </div>
          </HoverTip>
          {/* 返回首頁 */}
          <HoverTip content="離開房間">
            <div className="relative h-7 w-7 max-sm:h-6 max-sm:w-6">
              <Image
                src="/leave.svg"
                alt="leave"
                fill
                priority
                onClick={() => (window.location.href = '/multiple-play')}
              />
            </div>
          </HoverTip>
          {/* 返回首頁 */}
          {/* {showCloseGamePlayingBtn && (
            <HoverTip content="回到房間">
              <div className="relative h-6 w-6 max-sm:h-5 max-sm:w-5">
                <Image
                  src="/close.svg"
                  alt="close"
                  width={24}
                  height={24}
                  priority
                  onClick={() => onCloseScreen()}
                />
              </div>
            </HoverTip>
          )} */}
        </div>
      </div>
      <div className="relative flex flex-1 flex-col items-center gap-8 max-sm:gap-2">
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
          isYourTurn={isYourTurn}
        />
        <HandCardArea
          selectedCards={roomInfo?.selectedCards || []}
          handCard={handCard}
          needDiscard={needDiscard}
          onSelect={number => onSelectCardOrSymbol({ number })}
          onDiscard={id => {
            setNeedDiscard(false);
            onDiscardCard(id);
          }}
        />
        <ActionArea
          isSinglePlay={false}
          disabledActions={disabledActions}
          onSubmit={onPlayCard}
          onReselect={onReselect}
          onSort={onSort}
          onEndPhase={() => {
            onReselect();
            onDrawCard();
          }}
          onBack={onBack}
          isLastRound={isLastRound}
        />
      </div>
    </MainLayout>
  );
};

export default MultiplePlayingArea;
