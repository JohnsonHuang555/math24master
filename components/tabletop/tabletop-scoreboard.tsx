'use client';

import { Bot, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSeatName } from '@/components/tabletop/use-seat-name';
import { cn } from '@/lib/utils';
import { TabletopGameState } from '@/models/Tabletop';

type TabletopScoreboardProps = {
  game: TabletopGameState;
  thinkingSeat: number | null;
};

/**
 * 三位玩家的分數與手牌數。手機上三格並排只放「N 分 · N 張」，
 * 桌機側欄改成一人一列，多顯示目前狀態
 */
export function TabletopScoreboard({
  game,
  thinkingSeat,
}: TabletopScoreboardProps) {
  const t = useTranslations('Tabletop');
  const seatName = useSeatName();
  return (
    <section
      aria-label={t('scoreboard')}
      className="grid grid-cols-3 gap-1.5 lg:grid-cols-1 lg:gap-2.5"
    >
      {game.seats.map((seat, i) => {
        const isCurrent = game.status === 'playing' && game.currentSeat === i;
        const isThinking = thinkingSeat === i;
        const Icon = seat.isBot ? Bot : User;
        const status = isThinking
          ? t('seatStatus.thinking')
          : isCurrent
            ? seat.isBot
              ? t('seatStatus.playing')
              : t('seatStatus.yourTurn')
            : t('seatStatus.waiting');
        return (
          <div
            key={seat.id}
            aria-current={isCurrent ? 'true' : undefined}
            className={cn(
              'flex min-w-0 flex-col gap-0.5 rounded-xl border px-2.5 py-1.5 lg:flex-row lg:items-center lg:gap-3 lg:rounded-2xl lg:px-3 lg:py-2.5',
              isCurrent
                ? seat.isBot
                  ? 'border-2 border-amber bg-amber-tint'
                  : 'border-2 border-primary bg-primary-tint'
                : 'border-line bg-surface',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'hidden h-10 w-10 shrink-0 items-center justify-center rounded-full lg:flex',
                seat.isBot
                  ? 'bg-sunken text-ink-2'
                  : 'bg-primary text-primary-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-center gap-1 truncate text-[13px] font-bold text-ink lg:text-[15px]">
                <Icon aria-hidden className="h-3.5 w-3.5 shrink-0 lg:hidden" />
                {seatName(seat)}
              </span>
              <span
                className={cn(
                  'text-xs',
                  // 手機只在輪到電腦時顯示狀態，其他時候顯示分數與張數
                  isCurrent && seat.isBot
                    ? 'font-bold text-amber-ink'
                    : 'hidden lg:inline',
                  isCurrent && !seat.isBot && 'font-bold text-primary-ink',
                  !isCurrent && 'text-ink-2',
                )}
              >
                {status}
              </span>
              <span
                className={cn(
                  'text-xs text-ink-2 lg:hidden',
                  isCurrent && seat.isBot && 'hidden',
                )}
              >
                {t.rich('seatSummary', {
                  score: seat.score,
                  count: seat.hand.length,
                  b: chunks => (
                    <b className="font-display text-base font-extrabold text-ink">
                      {chunks}
                    </b>
                  ),
                })}
              </span>
            </span>
            <span className="hidden flex-col items-end lg:flex">
              <span className="font-display text-2xl leading-none font-extrabold text-ink tabular-nums">
                {seat.score}
              </span>
              <span className="text-xs text-ink-2">
                {t('seatHand', { count: seat.hand.length })}
              </span>
            </span>
          </div>
        );
      })}
    </section>
  );
}
