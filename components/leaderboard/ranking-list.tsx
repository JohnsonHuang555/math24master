import { useTranslations } from 'next-intl';
import { type LeaderboardMode, type LeaderboardRow } from '@/lib/leaderboard';
import { cn } from '@/lib/utils';
import { PlayerAvatar } from './player-avatar';
import { RankMedal } from './rank-medal';
import { useLeaderboardLabels } from './use-leaderboard-labels';

type RankingListProps = {
  rows: LeaderboardRow[];
  mode: LeaderboardMode;
  myId?: string;
};

export function RankingList({ rows, mode, myId }: RankingListProps) {
  const t = useTranslations('Leaderboard');
  const { record } = useLeaderboardLabels();

  return (
    <ol className="flex flex-col gap-1.5">
      {rows.map(row => {
        const isMe = row.userId === myId;
        return (
          <li
            key={row.userId}
            data-testid="ranking-row"
            data-me={isMe || undefined}
            className={cn(
              'flex items-center gap-3 rounded-2xl border-2 px-3 py-2',
              isMe
                ? 'border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-900/20'
                : 'border-transparent bg-white/70 dark:bg-zinc-900/40',
            )}
          >
            <span className="flex w-7 shrink-0 justify-center">
              <RankMedal rank={row.rank} />
            </span>
            <PlayerAvatar
              name={row.displayName}
              photoURL={row.photoURL}
              size={28}
            />
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <span className={cn('truncate text-sm', isMe && 'font-bold')}>
                {row.displayName}
              </span>
              {isMe && (
                <span className="shrink-0 rounded-md bg-teal-100 px-1 py-px text-[10px] font-bold text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                  {t('me')}
                </span>
              )}
            </div>
            <span className="shrink-0 font-display text-base font-bold tabular-nums">
              {record(mode, row)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
