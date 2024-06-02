'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ActionArea from '@/components/areas/action-area';
import HandCardArea from '@/components/areas/hand-card-area';
import PlayerInfoArea from '@/components/areas/player-info-area';
import HoverTip from '@/components/hover-tip';
import MainLayout from '@/components/layouts/main-layout';
import Symbols from '@/components/symbols';
import useGame from '@/hooks/useGame';
import useSinglePlay from '@/hooks/useSinglePlay';
import { useAlertDialogStore } from '@/providers/alert-dialog-store-provider';

export default function SinglePlayPage() {
  const router = useRouter();
  const { roomInfo, onSort } = useSinglePlay();
  const currentPlayer = roomInfo?.players[0];

  const { selectedCards, onSelectCardOrSymbol, onReselect, showCurrentSelect } =
    useGame();
  const { onOpen, isConfirmed, onReset } = useAlertDialogStore(state => state);

  console.log(selectedCards);

  useEffect(() => {
    if (isConfirmed) {
      router.push('/');
      onReset();
    }
  }, [isConfirmed, onReset, router]);

  return (
    <MainLayout>
      <div className="relative flex w-full basis-1/5 bg-white">
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
                  description: '當前進度將會消失',
                })
              }
            />
          </HoverTip>
        </div>
      </div>
      <div className="relative flex flex-1 flex-col items-center gap-8">
        <div className="mt-12 flex min-h-[150px] min-w-[60%] items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 text-lg">
          {selectedCards.length ? (
            showCurrentSelect()
          ) : (
            <div className="text-gray-500">點擊手牌組合出答案為 24 的算式</div>
          )}
        </div>
        <div className="text-5xl">= 24</div>
        <div className="absolute bottom-3 flex gap-4">
          <Symbols onClick={symbol => onSelectCardOrSymbol({ symbol })} />
        </div>
      </div>
      <div className="flex w-full basis-1/5 bg-white">
        <PlayerInfoArea
          remainCards={roomInfo?.deck.length}
          score={currentPlayer?.score}
        />
        <HandCardArea
          selectedCards={selectedCards}
          handCards={currentPlayer?.handCard || []}
          onSelect={number => onSelectCardOrSymbol({ number })}
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
