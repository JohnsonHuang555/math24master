'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Medal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type LeaderboardMode, type LeaderboardRow } from '@/lib/leaderboard';
import { cn } from '@/lib/utils';
import { PlayerAvatar } from './player-avatar';
import { MEDAL_COLOR, isMedalRank } from './rank-medal';
import { useLeaderboardLabels } from './use-leaderboard-labels';

// 依「位置」決定台座高度（中間最高），獎牌顏色則依實際名次（並列時可能兩個金牌）
const SLOTS = [
  { index: 1, pedestal: 'h-14', avatar: 48 },
  { index: 0, pedestal: 'h-20', avatar: 64 },
  { index: 2, pedestal: 'h-10', avatar: 48 },
];

const PEDESTAL_COLOR: Record<1 | 2 | 3, string> = {
  1: 'border-amber-300 bg-amber-100 dark:border-amber-700 dark:bg-amber-900/30',
  2: 'border-zinc-300 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800',
  3: 'border-amber-700/50 bg-amber-700/10 dark:border-amber-800 dark:bg-amber-950/40',
};

type PodiumProps = {
  rows: LeaderboardRow[];
  mode: LeaderboardMode;
  myId?: string;
};

export function Podium({ rows, mode, myId }: PodiumProps) {
  const reduceMotion = useReducedMotion();
  const t = useTranslations('Leaderboard');
  const { record } = useLeaderboardLabels();

  return (
    <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
      {SLOTS.map(({ index, pedestal, avatar }, i) => {
        const row = rows[index];
        if (!row) return <div key={index} />;
        const rank = isMedalRank(row.rank) ? row.rank : 3;
        const isMe = row.userId === myId;
        return (
          <motion.div
            key={row.userId}
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: reduceMotion ? 0 : i * 0.09,
              ease: [0.16, 1, 0.3, 1],
            }}
            data-testid="podium-slot"
            className="flex min-w-0 flex-col items-center"
          >
            <div className="relative">
              <PlayerAvatar
                name={row.displayName}
                photoURL={row.photoURL}
                size={avatar}
                className={cn(
                  'border-2 border-white dark:border-zinc-900',
                  isMe && 'ring-2 ring-primary ring-offset-2',
                )}
              />
              <span className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm dark:bg-zinc-900">
                <Medal
                  aria-label={t('rank', { rank: row.rank })}
                  className={cn('h-4 w-4', MEDAL_COLOR[rank])}
                />
              </span>
            </div>
            <div className="mt-2 flex w-full min-w-0 items-center justify-center gap-1">
              <span className="truncate text-sm font-bold">
                {row.displayName}
              </span>
              {isMe && (
                <span className="shrink-0 rounded-md bg-teal-100 px-1 py-px text-[10px] font-bold text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                  {t('me')}
                </span>
              )}
            </div>
            <div className="font-display text-base font-black text-foreground">
              {record(mode, row)}
            </div>
            <div
              className={cn(
                'mt-2 flex w-full items-start justify-center rounded-t-2xl border-2 border-b-0 pt-1 font-display text-xl font-black text-foreground/70',
                pedestal,
                PEDESTAL_COLOR[rank],
              )}
            >
              {row.rank}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
