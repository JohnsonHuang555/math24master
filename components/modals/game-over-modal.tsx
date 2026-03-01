'use client';

import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Player } from '@/models/Player';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

type GameOverModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** 依分數由高到低排序的玩家列表 */
  players: Player[];
  currentPlayerId?: string;
  isSinglePlay?: boolean;
  isNewBestScore?: boolean;
  onPlayAgain: () => void;
  onGoHome: () => void;
};

const RANK_COLORS = [
  'text-yellow-400',
  'text-slate-400',
  'text-orange-400',
] as const;

const RANK_LABELS = ['冠軍', '亞軍', '季軍'] as const;

export function GameOverModal({
  isOpen,
  onClose,
  players,
  currentPlayerId,
  isSinglePlay,
  isNewBestScore,
  onPlayAgain,
  onGoHome,
}: GameOverModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-2xl">
            <Trophy className="h-6 w-6 text-yellow-400" />
            遊戲結束
          </DialogTitle>
        </DialogHeader>

        {isSinglePlay && players[0] && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="text-6xl font-bold text-primary">
              {players[0].score}
            </div>
            <div className="text-sm text-muted-foreground">總得分</div>
            {isNewBestScore && (
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                新最高分紀錄！
              </span>
            )}
          </div>
        )}

        {!isSinglePlay && players.length > 0 && (
          <div className="flex flex-col gap-2 py-2">
            {players.map((player, index) => (
              <div
                key={player.id}
                className={cn(
                  'flex items-center justify-between rounded-lg px-4 py-3',
                  player.id === currentPlayerId
                    ? 'bg-primary/10 ring-1 ring-primary/30'
                    : 'bg-muted/50',
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'w-5 text-center font-bold',
                      RANK_COLORS[index] ?? 'text-muted-foreground',
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="font-medium">{player.name}</span>
                  {RANK_LABELS[index] && (
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                      {RANK_LABELS[index]}
                    </span>
                  )}
                  {player.id === currentPlayerId && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      你
                    </span>
                  )}
                </div>
                <span className="text-lg font-bold">{player.score} 分</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onGoHome}>
            回首頁
          </Button>
          <Button className="flex-1" onClick={onPlayAgain}>
            再來一局
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
