'use client';

import { CircleAlert, Play, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MyRankState } from '@/hooks/useMyRank';
import { Link } from '@/i18n/navigation';
import { type LeaderboardMode, findBoardByMode } from '@/lib/leaderboard';
import { cn } from '@/lib/utils';
import { LoginButtons } from './login-buttons';
import { PlayerAvatar } from './player-avatar';
import { MeBadge } from './podium';
import { useLeaderboardLabels } from './use-leaderboard-labels';

type MyRankCardProps = {
  mode: LeaderboardMode;
  state: MyRankState;
  badge?: React.ReactNode;
  /** 放在窄欄（如桌機排行榜側欄）時，登入區塊固定上下排列 */
  stacked?: boolean;
  className?: string;
};

export function MyRankCard({
  mode,
  state,
  badge,
  stacked,
  className,
}: MyRankCardProps) {
  const { board } = findBoardByMode(mode);
  const t = useTranslations('Leaderboard');
  const tCommon = useTranslations('Common');
  const { record } = useLeaderboardLabels();

  const isRanked = state.status === 'ranked';

  return (
    <div
      data-testid="my-rank"
      className={cn(
        'rounded-2xl border px-3 py-2.5',
        isRanked
          ? 'border-[1.5px] border-primary bg-primary-tint'
          : 'border-line bg-surface',
        className,
      )}
    >
      {state.status === 'loading' && (
        <div className="flex items-center gap-3 py-1">
          <div className="h-9 w-9 animate-pulse rounded-full bg-sunken" />
          <div className="h-4 w-32 animate-pulse rounded-md bg-sunken" />
        </div>
      )}

      {state.status === 'anonymous' && (
        <div
          className={cn(
            'flex flex-col gap-3 py-1',
            !stacked && 'sm:flex-row sm:items-center sm:justify-between',
          )}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-line-strong bg-sunken text-ink-2">
              <UserRound aria-hidden className="h-5 w-5" />
            </span>
            <div className="flex flex-col gap-0.5">
              <strong className="text-[17px] text-ink">
                {t('loginToRank')}
              </strong>
              <span className="text-[13px] text-ink-2">{t('loginHint')}</span>
            </div>
          </div>
          <LoginButtons className={cn(!stacked && 'sm:w-72')} />
        </div>
      )}

      {(state.status === 'none' || state.status === 'error') && (
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[15px] font-bold text-ink">
            {state.status === 'error' && (
              <CircleAlert aria-hidden className="h-5 w-5 text-danger-ink" />
            )}
            {state.status === 'none' ? t('noRecord') : t('rankLoadFailed')}
          </p>
          <Link
            href={board.playHref}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3.5 text-sm font-bold text-ink hover:bg-sunken"
          >
            <Play aria-hidden className="h-4 w-4" />
            {tCommon('startGame')}
          </Link>
        </div>
      )}

      {state.status === 'ranked' && (
        <div className="grid grid-cols-[auto_36px_minmax(0,1fr)_auto] items-center gap-3">
          <span className="flex flex-col items-center gap-0.5 leading-none">
            <span className="text-[11px] font-bold text-primary-ink">
              {t('myRank')}
            </span>
            <span className="font-display text-lg font-extrabold whitespace-nowrap text-primary-ink tabular-nums">
              {t('rank', { rank: state.row.rank })}
            </span>
          </span>
          <PlayerAvatar
            name={state.row.displayName}
            photoURL={state.row.photoURL}
            size={36}
            isMe
          />
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[15px] font-bold text-ink">
              {state.row.displayName}
            </span>
            <MeBadge label={t('me')} />
            {badge}
          </span>
          <span className="font-display text-xl font-extrabold text-ink tabular-nums">
            {record(mode, state.row)}
          </span>
        </div>
      )}
    </div>
  );
}
