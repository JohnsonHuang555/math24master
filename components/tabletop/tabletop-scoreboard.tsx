'use client';

import { Bot, FastForward, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabletopLogEntry } from '@/hooks/useTabletopPlay';
import { cn } from '@/lib/utils';
import { TABLETOP_TURNS_PER_SEAT, TabletopGameState } from '@/models/Tabletop';

type TabletopScoreboardProps = {
  game: TabletopGameState;
  thinkingSeat: number | null;
  log: TabletopLogEntry[];
  onSkipAnimation: () => void;
};

export function TabletopScoreboard({
  game,
  thinkingSeat,
  log,
  onSkipAnimation,
}: TabletopScoreboardProps) {
  const round = Math.min(
    Math.floor(game.turnsTaken / game.seats.length) + 1,
    TABLETOP_TURNS_PER_SEAT,
  );
  const isBotTurn = game.status === 'playing' && game.currentSeat !== 0;

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="font-display text-sm font-bold text-muted-foreground">
          第 {round} / {TABLETOP_TURNS_PER_SEAT} 回合
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
              <div className="h-4 text-[10px] font-bold text-teal-700 dark:text-teal-400">
                {thinkingSeat === i ? '思考中' : isCurrent ? '出牌中' : ''}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 rounded-2xl bg-white/50 px-3 py-2 text-xs backdrop-blur-sm dark:bg-zinc-900/30">
        <ul className="min-w-0 flex-1 space-y-0.5" aria-live="polite">
          {log.length === 0 ? (
            <li className="text-muted-foreground">
              輪到你了，完成一組牌組或抽牌
            </li>
          ) : (
            log.slice(0, 3).map((entry, i) => (
              <li
                key={entry.id}
                className={cn(
                  'truncate',
                  i === 0 ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <span className="font-bold">{entry.seatName}</span> {entry.text}
                {entry.score !== null && (
                  <span className="ml-1 font-display font-bold text-amber-700 dark:text-amber-400">
                    +{entry.score}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
        {isBotTurn && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 gap-1 px-2 text-xs font-bold text-muted-foreground"
            onClick={onSkipAnimation}
          >
            <FastForward className="h-3.5 w-3.5" />
            略過動畫
          </Button>
        )}
      </div>
    </div>
  );
}
