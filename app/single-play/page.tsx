'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import ActionArea from '@/components/areas/action-area';
import HandCardArea from '@/components/areas/hand-card-area';
import PlayerInfoArea from '@/components/areas/player-info-area';
import HoverTip from '@/components/hover-tip';
import MainLayout from '@/components/layouts/main-layout';
import Symbols from '@/components/symbols';
import { toast } from '@/components/ui/use-toast';
import useSinglePlay from '@/hooks/useSinglePlay';
import { fadeVariants } from '@/lib/animation-variants';
import { MAX_CARD_COUNT } from '@/models/Room';
import { Symbol } from '@/models/Symbol';
import { useAlertDialogStore } from '@/providers/alert-dialog-store-provider';

export default function SinglePlayPage() {
  // 需要棄牌
  const [needDiscard, setNeedDiscard] = useState(false);

  const router = useRouter();
  const {
    roomInfo,
    onSort,
    playCard,
    drawCard,
    discardCard,
    selectedCards,
    onSelectCardOrSymbol,
    onReselect,
    showCurrentSelect,
    checkAnswerCorrect,
    isAnimationFinished,
    selectedCardSymbols,
    selectedCardNumbers,
    updateAndDraw,
  } = useSinglePlay();

  const currentPlayer = roomInfo?.players[0];
  const handCard = currentPlayer?.handCard || [];

  const { onOpen, isConfirmed, onReset } = useAlertDialogStore(state => state);

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
        toast({
          title: '請點選 1 張牌棄掉',
          className: 'bg-amber-300',
        });
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
          <HoverTip content="回首頁">
            <Image
              src="/leave.svg"
              alt="leave"
              width={28}
              height={28}
              priority
              onClick={() =>
                onOpen({
                  title: '確定要離開嗎？',
                  description: '離開遊戲後，當前進度將會消失，確定要離開嗎？',
                })
              }
            />
          </HoverTip>
        </div>
      </div>
      <div className="relative flex flex-1 flex-col items-center gap-8">
        <div className="mt-12 flex min-h-[150px] min-w-[60%] items-center justify-center gap-2 rounded-md border-2 border-dashed bg-white px-6 text-lg">
          <>
            {selectedCards.length ? (
              showCurrentSelect()
            ) : (
              <div className="text-gray-500">
                點擊手牌組合出答案為 24 的算式
              </div>
            )}
          </>
          {isAnimationFinished && (
            <motion.div
              variants={fadeVariants}
              initial="hide"
              animate="show"
              className="absolute -top-4 flex h-16 flex-col justify-center"
              onAnimationComplete={() => {
                setTimeout(() => {
                  updateAndDraw();
                }, 1500);
              }}
            >
              {selectedCardSymbols.filter(c => c.symbol === Symbol.Times)
                .length >= 2 && (
                <div className="text-sm">
                  符號 2 張乘{' '}
                  <span className="text-base font-semibold text-emerald-600">
                    +1
                  </span>
                </div>
              )}
              {selectedCardSymbols.filter(c => c.symbol === Symbol.Divide)
                .length >= 2 && (
                <div className="text-sm">
                  符號 2 張除{' '}
                  <span className="text-base font-semibold text-emerald-600">
                    +2
                  </span>
                </div>
              )}
              {selectedCardNumbers.length >= 4 && (
                <div className="text-sm">
                  數字 {selectedCardNumbers.length} 張{' '}
                  <span className="text-base font-semibold text-emerald-600">
                    +{selectedCardNumbers.length === 4 ? 1 : 2}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </div>
        <div className="text-5xl">= 24</div>
        <div className="absolute bottom-7 flex gap-4">
          <Symbols onClick={symbol => onSelectCardOrSymbol({ symbol })} />
        </div>
      </div>
      <div className="relative flex w-full basis-1/5">
        <PlayerInfoArea
          remainCards={roomInfo?.deck.length}
          score={currentPlayer?.score}
        />
        <HandCardArea
          selectedCards={selectedCards}
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
          disabledActions={needDiscard || checkAnswerCorrect === true}
          onSubmit={() => playCard(selectedCards)}
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
