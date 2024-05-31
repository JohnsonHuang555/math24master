'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ActionArea from '@/components/areas/action-area';
import HandCardArea from '@/components/areas/hand-card-area';
import PlayerInfoArea from '@/components/areas/player-info-area';
import MainLayout from '@/components/layouts/main-layout';
import Symbols from '@/components/symbols';
import { Button } from '@/components/ui/button';
import useGame from '@/hooks/useGame';
import useSinglePlay from '@/hooks/useSinglePlay';
import { useAlertDialogStore } from '@/providers/alert-dialog-store-provider';

export default function SinglePlayPage() {
  const router = useRouter();
  const { roomInfo } = useSinglePlay();
  const currentPlayer = roomInfo?.players[0];

  const {
    handCards,
    selectedCards,
    onSelectCardOrSymbol,
    onReselect,
    showCurrentSelect,
    onSort,
  } = useGame({ initHandCards: currentPlayer?.handCard });
  const { onOpen, isConfirmed, onReset } = useAlertDialogStore(state => state);

  useEffect(() => {
    if (isConfirmed) {
      router.push('/');
      onReset();
    }
  }, [isConfirmed, onReset, router]);

  return (
    <MainLayout>
      <div className="relative flex w-full basis-1/5 bg-white">
        <div className="absolute right-5 top-5">
          {/* 返回首頁 */}
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              onOpen({
                title: '確定要離開嗎？',
                description: '當前進度將會消失',
              })
            }
          >
            <Image
              src="/leave.svg"
              alt="leave"
              width={24}
              height={24}
              priority
            />
          </Button>
        </div>
      </div>
      <div className="relative flex flex-1 flex-col items-center gap-8">
        <div className="mt-12 flex min-h-[150px] w-3/5 items-center justify-center gap-2 rounded-md border-2 border-dashed text-lg">
          {selectedCards.length ? (
            showCurrentSelect()
          ) : (
            <div className="text-gray-500">點擊手牌組合出答案為 24 的算式</div>
          )}
        </div>
        <div className="text-5xl">= 24</div>
        <div className="absolute bottom-3 flex gap-4">
          <Symbols onClick={symbol => onSelectCardOrSymbol(symbol)} />
        </div>
      </div>
      <div className="flex w-full basis-1/5 bg-white">
        <PlayerInfoArea
          remainCards={roomInfo?.deck.length}
          score={currentPlayer?.score}
        />
        <HandCardArea
          handCards={handCards}
          onSelect={card => onSelectCardOrSymbol(card)}
        />
        <ActionArea
          onSubmit={() => {}}
          onReselect={onReselect}
          onSort={onSort}
          onEndPhase={() => {}}
        />
      </div>
    </MainLayout>
  );
}
