'use client';

import { useEffect, useState } from 'react';
import ActionArea from '@/components/areas/action-area';
import HandCardArea from '@/components/areas/hand-card-area';
import PlayerInfoArea from '@/components/areas/player-info-area';
import Symbols from '@/components/symbols';
import useSinglePlay from '@/hooks/useSinglePlay';

export default function SinglePlayPage() {
  const [currentSelect, setCurrentSelect] = useState<any>([]);
  const { roomInfo } = useSinglePlay();

  return (
    <main className="flex h-full flex-col">
      <div className="flex w-full basis-1/5 bg-white">1</div>
      <div className="relative flex flex-1 flex-col items-center justify-center gap-8">
        <div className="flex aspect-[15.59/5] w-3/5 items-center justify-center rounded-md border-2 border-dashed text-lg text-gray-500">
          點擊手牌組合出合理的算式
        </div>
        <div className="mb-5 text-5xl">= ?</div>
        <div className="absolute bottom-3 flex gap-4">
          <Symbols onClick={() => {}} />
        </div>
      </div>
      <div className="flex w-full basis-1/5 bg-white">
        <PlayerInfoArea currentSelect={currentSelect} />
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
