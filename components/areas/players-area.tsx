import { Fragment } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Player } from '@/models/Player';

type PlayersAreaProps = {
  players: Player[];
  onReady: () => void;
  onStart: () => void;
};

const PlayersArea = ({ players = [], onReady, onStart }: PlayersAreaProps) => {
  // 檢查所有玩家是否已準備遊戲
  const allPlayersReady = players.every(player => player.isReady);

  return (
    <Card className="flex h-full flex-1 flex-col gap-3 p-4">
      {/* Players */}
      {players.map(player => (
        <Fragment key={player.id}>
          <div className="flex justify-between">
            <div className="flex flex-col">
              <div className="text-lg">Johnson</div>
              <div className="text-sm">分數: 100</div>
            </div>
            <Image
              src="/crown.svg"
              alt="crown"
              width={30}
              height={30}
              priority
            />
          </div>
          <hr />
        </Fragment>
      ))}

      {/* <div className="flex justify-between">
        <div className="flex flex-col">
          <div className="text-lg">Johnson</div>
          <div className="text-sm">分數: 100</div>
        </div>
        <Image src="/ready.svg" alt="ready" width={32} height={32} priority />
      </div>
      <hr /> */}
      <Button className="mt-auto" onClick={onStart} disabled={!allPlayersReady}>
        開始遊戲
      </Button>
      <Button className="mt-auto" onClick={onReady}>
        準備遊戲
      </Button>
    </Card>
  );
};

export default PlayersArea;
