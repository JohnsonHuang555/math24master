'use client';

import { Bot, FastForward, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TabletopGameState } from '@/models/Tabletop';

type TabletopScoreboardProps = {
  game: TabletopGameState;
  thinkingSeat: number | null;
  onSkipAnimation: () => void;
};

export function TabletopScoreboard({
  game,
  thinkingSeat,
  onSkipAnimation,
}: TabletopScoreboardProps) {
  const round = Math.floor(game.turnsTaken / game.seats.length) + 1;
  const isBotTurn = game.status === 'playing' && game.currentSeat !== 0;

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="font-display text-sm font-bold text-muted-foreground">
          {game.finalRoundTurnsLeft !== undefined
            ? '最後一圈'
            : `第 ${round} 圈`}
        </span>
        <span className="text-xs text-muted-foreground">
          牌庫剩 {game.deck.length} 張
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {game.seats.map((seat, i) => {
          const isCurrent = game.status === 'playing' && game.currentSeat === i;
          const Icon = seat.isBot ? Bot : User;
          return (
            <div
              key={seat.id}
              className={cn(
                'rounded-2xl border-2 px-2 py-1.5 text-center transition-colors',
                isCurrent
                  ? 'border-primary bg-teal-50 dark:bg-teal-900/20'
                  : 'border-zinc-200 bg-white/80 dark:border-zinc-700 dark:bg-zinc-900/60',
              )}
            >
              <div className="flex items-center justify-center gap-1 text-xs font-bold text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {seat.name}
              </div>
              <div className="font-display text-xl font-black text-foreground tabular-nums">
                {seat.score}
              </div>
              <div className="text-[10px] font-bold text-muted-foreground">
                手牌 {seat.hand.length} 張
              </div>
              <div className="h-4 text-[10px] font-bold text-teal-700 dark:text-teal-400">
                {thinkingSeat === i ? '思考中' : isCurrent ? '出牌中' : ''}
              </div>
            </div>
          );
        })}
      </div>

      {isBotTurn && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs font-bold text-muted-foreground"
            onClick={onSkipAnimation}
          >
            <FastForward className="h-3.5 w-3.5" />
            略過動畫
          </Button>
        </div>
      )}
    </div>
  );
}
