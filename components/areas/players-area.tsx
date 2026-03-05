import { Fragment } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Player } from '@/models/Player';
import HoverTip from '../hover-tip';

type PlayersAreaProps = {
  players?: Player[];
  currentPlayer?: Player;
  onReady: () => void;
  onStart: () => void;
  onRemovePlayer: (playerId: string) => void;
  onAddBot?: (difficulty: 'easy' | 'normal' | 'hard') => void;
  canAddBot?: boolean;
};

const PlayersArea = ({
  players = [],
  currentPlayer,
  onReady,
  onStart,
  onRemovePlayer,
  onAddBot,
  canAddBot,
}: PlayersAreaProps) => {
  // 檢查所有玩家是否已準備遊戲
  const allPlayersReady =
    players.length > 1 && players.every(player => player.isReady);

  const getMember = (isReady: boolean) => {
    return (
      <div className="flex gap-2">
        <HoverTip content="準備狀態" notPointer>
          {isReady ? (
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
        </HoverTip>
      </div>
    );
  };

  return (
    <Card className="flex h-full flex-1 flex-col gap-3 p-4 max-sm:min-h-[270px]">
      {/* Players */}
      {players.map(player => (
        <div key={player.id}>
          <div className="flex justify-between">
            <div className="flex">
              <div className="mr-4 text-xl max-sm:text-lg">{player.name}</div>
              {player.isBot && (
                <span className="mr-2 self-center rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">
                  BOT
                </span>
              )}
              {!player.isMaster && currentPlayer?.isMaster && (
                <HoverTip content="踢除玩家">
                  <Image
                    src="/remove-player.svg"
                    alt="ready"
                    width={24}
                    height={24}
                    priority
                    onClick={() => onRemovePlayer(player.id)}
                  />
                </HoverTip>
              )}
            </div>
            {player.isMaster ? (
              <HoverTip content="房主" notPointer>
                <Image
                  src="/crown.svg"
                  alt="crown"
                  width={30}
                  height={30}
                  priority
                />
              </HoverTip>
            ) : (
              getMember(player.isReady)
            )}
          </div>
          <hr className="mt-2" />
        </div>
      ))}
      {canAddBot && onAddBot && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">加入電腦玩家</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => onAddBot('easy')}>
              簡單
            </Button>
            <Button size="sm" variant="outline" onClick={() => onAddBot('normal')}>
              普通
            </Button>
            <Button size="sm" variant="outline" onClick={() => onAddBot('hard')}>
              困難
            </Button>
          </div>
        </div>
      )}
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
