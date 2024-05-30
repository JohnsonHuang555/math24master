'use client';

import { useState } from 'react';
import Image from 'next/image';
import ActionArea from '@/components/areas/action-area';
import HandCardArea from '@/components/areas/hand-card-area';
import PlayerInfoArea from '@/components/areas/player-info-area';
import Symbols from '@/components/symbols';
import { Button } from '@/components/ui/button';
import useSinglePlay from '@/hooks/useSinglePlay';

export default function SinglePlayPage() {
  const [currentSelect, setCurrentSelect] = useState<any>([]);
  const { roomInfo } = useSinglePlay();

  return (
    <main className="flex h-full flex-col">
      <div className="relative flex w-full basis-1/5 bg-white">
        {/* 返回首頁 */}
        <Button
          variant="outline"
          size="icon"
          className="absolute right-4 top-4"
        >
          <Image
            onClick={() => {}}
            src="/leave.svg"
            alt="leave"
            width={24}
            height={24}
            priority
          />
        </Button>
      </div>
      <div className="relative flex flex-1 flex-col items-center gap-8">
        <div className="mt-12 flex min-h-[150px] w-3/5 items-center justify-center rounded-md border-2 border-dashed text-lg text-gray-500">
          點擊手牌組合出合理的算式
        </div>
        <div className="text-5xl">= ?</div>
        <div className="absolute bottom-3 flex gap-4">
          <Symbols onClick={() => {}} />
        </div>
      </div>
      <div className="flex w-full basis-1/5 bg-white">
        <PlayerInfoArea
          remainCards={roomInfo?.deck.length}
          score={roomInfo?.players[0].score}
        />
        <HandCardArea
          handCards={roomInfo?.players[0].handCard || []}
          onSelect={card => console.log(card)}
        />
        <ActionArea
          onSubmit={() => {}}
          onReselect={() => {}}
          onSort={() => {}}
          onEndPhase={() => {}}
        />
      </div>
    </main>
  );
}
