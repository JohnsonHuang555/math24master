import { Fragment } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Player } from '@/models/Player';

type PlayersAreaProps = {
  players?: Player[];
  currentPlayer?: Player;
  onReady: () => void;
  onStart: () => void;
};

const PlayersArea = ({
  players = [],
  currentPlayer,
  onReady,
  onStart,
}: PlayersAreaProps) => {
  // 檢查所有玩家是否已準備遊戲
  const allPlayersReady =
    players.length > 1 && players.every(player => player.isReady);

  return (
    <Card className="flex h-full flex-1 flex-col gap-3 p-4">
      {/* Players */}
      {players.map((player, index) => (
        <Fragment key={player.id}>
          <div className="flex justify-between">
            <div className="flex flex-col">
              <div className="text-base">{player.name}</div>
              <div className="text-xs">分數: {player.score}</div>
            </div>
            {player.isMaster ? (
              <Image
                src="/crown.svg"
                alt="crown"
                width={30}
                height={30}
                priority
              />
            ) : player.isReady ? (
              <Image
                src="/ready.svg"
                alt="ready"
                width={32}
                height={32}
                priority
              />
            ) : (
              <Image
                src="/not-ready.svg"
                alt="not-ready"
                width={32}
                height={32}
                priority
              />
            )}
          </div>
          {index !== players.length - 1 && <hr />}
        </Fragment>
      ))}
      {currentPlayer?.isMaster ? (
        <Button
          className="mt-auto"
          onClick={onStart}
          disabled={!allPlayersReady}
        >
          開始遊戲
        </Button>
      ) : (
        <Button className="mt-auto" onClick={onReady}>
          {currentPlayer?.isReady ? '取消準備' : '準備遊戲'}
        </Button>
      )}
    </Card>
  );
};

export default PlayersArea;
