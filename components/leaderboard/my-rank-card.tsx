'use client';

import Link from 'next/link';
import { Play } from 'lucide-react';
import type { MyRankState } from '@/hooks/useMyRank';
import {
  type LeaderboardMode,
  findBoardByMode,
  formatRecord,
} from '@/lib/leaderboard';
import { cn } from '@/lib/utils';
import { LoginButtons } from './login-buttons';
import { PlayerAvatar } from './player-avatar';

type MyRankCardProps = {
  mode: LeaderboardMode;
  state: MyRankState;
  badge?: React.ReactNode;
  className?: string;
};

export function MyRankCard({ mode, state, badge, className }: MyRankCardProps) {
  const { board } = findBoardByMode(mode);

  return (
    <div
      data-testid="my-rank"
      className={cn(
        'rounded-2xl border-2 border-teal-200 bg-teal-50 px-4 py-3 dark:border-teal-800 dark:bg-teal-900/20',
        className,
      )}
    >
      {state.status === 'loading' && (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-full bg-teal-100 dark:bg-teal-900/50" />
          <div className="h-4 w-32 animate-pulse rounded-md bg-teal-100 dark:bg-teal-900/50" />
        </div>
      )}

      {state.status === 'anonymous' && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-teal-800 dark:text-teal-300">
            登入後即可上榜
          </p>
          <LoginButtons className="sm:w-64" />
        </div>
      )}

      {(state.status === 'none' || state.status === 'error') && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-teal-800 dark:text-teal-300">
            {state.status === 'none' ? '尚無紀錄' : '名次載入失敗'}
          </p>
          <Link
            href={board.playHref}
            className="flex shrink-0 items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:brightness-110"
          >
            <Play className="h-3.5 w-3.5" />
            開始遊戲
          </Link>
        </div>
      )}

      {state.status === 'ranked' && (
        <div className="flex items-center gap-3">
          <PlayerAvatar
            name={state.row.displayName}
            photoURL={state.row.photoURL}
            size={36}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs text-teal-700 dark:text-teal-400">
              我的名次
              {badge}
            </div>
            <div className="font-display text-xl leading-tight font-black text-foreground">
              第 {state.row.rank} 名
            </div>
          </div>
          <div className="shrink-0 font-display text-lg font-bold tabular-nums">
            {formatRecord(mode, state.row)}
          </div>
        </div>
      )}
    </div>
  );
}
