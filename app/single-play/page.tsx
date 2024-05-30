'use client';

import { useEffect, useState } from 'react';
import ActionArea from '@/components/areas/action-area';
import HandCardArea from '@/components/areas/hand-card-area';
import PlayerInfoArea from '@/components/areas/player-info-area';
import useSinglePlay from '@/hooks/useSinglePlay';

export default function SinglePlayPage() {
  const [currentSelect, setCurrentSelect] = useState<any>([]);
  // const [rooms, setRooms] = useState<any>();
  const {} = useSinglePlay();

  // useEffect(() => {
  //   if (socket) {
  //     console.log('ssss')
  //     socket.emit('new', 11111);
  //   }
  // }, [socket]);

  // const getCurrentRooms = async () => {
  //   const r = await getRooms();
  //   console.log(r)
  // }

  return (
    <main className="flex h-full flex-col">
      <div className="flex w-full basis-1/5 bg-white">1</div>
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <div className="flex aspect-[12.59/5] w-2/5 items-center justify-center rounded-md border border-dashed text-gray-500">
          點擊手牌組合出合理的算式
        </div>
        <div className="text-5xl">= ?</div>
      </div>
      <div className="flex w-full basis-1/5 bg-white">
        <PlayerInfoArea currentSelect={currentSelect} />
        <HandCardArea handCards={[]} onSelect={() => {}} />
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
