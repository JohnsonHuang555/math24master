import { useTranslations } from 'next-intl';
import { type LeaderboardMode, type LeaderboardRow } from '@/lib/leaderboard';
import { cn } from '@/lib/utils';
import { PlayerAvatar } from './player-avatar';
import { MeBadge } from './podium';
import { RankMedal } from './rank-medal';
import { useLeaderboardLabels } from './use-leaderboard-labels';

type RankingListProps = {
  rows: LeaderboardRow[];
  mode: LeaderboardMode;
  myId?: string;
  className?: string;
};

/** 第 4 名之後的名次列表：一張卡片內以細線分隔，暱稱超長以省略號截斷 */
export function RankingList({ rows, mode, myId, className }: RankingListProps) {
  const t = useTranslations('Leaderboard');
  const { record } = useLeaderboardLabels();

  return (
    <ol className={cn('flex flex-col bg-surface', className)}>
      {rows.map(row => {
        const isMe = row.userId === myId;
        return (
          <li
            key={row.userId}
            data-testid="ranking-row"
            data-me={isMe || undefined}
            className={cn(
              'grid min-h-14 grid-cols-[32px_36px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-3 py-2.5 last:border-b-0 lg:grid-cols-[64px_36px_minmax(0,1fr)_140px] lg:px-5',
              isMe && 'bg-primary-tint',
            )}
          >
            <RankMedal rank={row.rank} />
            <PlayerAvatar
              name={row.displayName}
              photoURL={row.photoURL}
              size={36}
              isMe={isMe}
            />
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-[15px] font-bold">
                {row.displayName}
              </span>
              {isMe && <MeBadge label={t('me')} />}
            </span>
            <span className="text-right font-display text-xl font-extrabold text-ink tabular-nums">
              {record(mode, row)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
