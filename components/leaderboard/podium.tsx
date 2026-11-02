'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { type LeaderboardMode, type LeaderboardRow } from '@/lib/leaderboard';
import { cn } from '@/lib/utils';
import { PlayerAvatar } from './player-avatar';
import { RankMedal, isMedalRank } from './rank-medal';
import { useLeaderboardLabels } from './use-leaderboard-labels';

// 依「位置」決定台座高度（中間最高），獎牌則依實際名次（並列時可能兩個金牌）
const SLOTS = [
  { index: 1, pedestal: 'h-[70px] lg:h-20', avatar: 48, medal: 34 },
  { index: 0, pedestal: 'h-[100px] lg:h-28', avatar: 56, medal: 40 },
  { index: 2, pedestal: 'h-[52px] lg:h-[60px]', avatar: 48, medal: 34 },
];

type PodiumProps = {
  rows: LeaderboardRow[];
  mode: LeaderboardMode;
  myId?: string;
  className?: string;
};

export function Podium({ rows, mode, myId, className }: PodiumProps) {
  const reduceMotion = useReducedMotion();
  const t = useTranslations('Leaderboard');
  const { record } = useLeaderboardLabels();

  return (
    <section
      aria-label={t('top3')}
      className={cn('flex items-end justify-center gap-2 lg:gap-4', className)}
    >
      {SLOTS.map(({ index, pedestal, avatar, medal }, i) => {
        const row = rows[index];
        if (!row) return <div key={index} className="w-[104px] lg:w-[150px]" />;
        const rank = isMedalRank(row.rank) ? row.rank : 3;
        const isFirst = index === 0;
        const isMe = row.userId === myId;
        return (
          <motion.div
            key={row.userId}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.28,
              delay: reduceMotion ? 0 : i * 0.06,
              ease: [0.2, 0, 0, 1],
            }}
            data-testid="podium-slot"
            className={cn(
              'flex min-w-0 flex-col items-center gap-1.5 lg:gap-2',
              isFirst ? 'w-28 lg:w-40' : 'w-[104px] lg:w-[150px]',
            )}
          >
            <PlayerAvatar
              name={row.displayName}
              photoURL={row.photoURL}
              size={avatar}
              isMe={isMe}
              className={cn(isFirst && 'shadow-[0_0_0_3px_#F5C04A]')}
            />
            <span className="flex w-full min-w-0 items-center justify-center gap-1">
              <span className="truncate text-[13px] font-bold lg:text-sm">
                {row.displayName}
              </span>
              {isMe && <MeBadge label={t('me')} />}
            </span>
            <span
              className={cn(
                'font-display font-extrabold text-ink tabular-nums',
                isFirst
                  ? 'text-[22px] lg:text-[26px]'
                  : 'text-lg lg:text-[22px]',
              )}
            >
              {record(mode, row)}
            </span>
            <div
              className={cn(
                'flex w-full justify-center rounded-t-[14px] border border-b-0 pt-2.5 lg:pt-3',
                pedestal,
                isFirst
                  ? 'border-primary bg-primary-tint'
                  : 'border-line bg-surface',
              )}
            >
              <RankMedal rank={rank} size={medal} />
            </div>
          </motion.div>
        );
      })}
    </section>
  );
}

export function MeBadge({ label }: { label: string }) {
  return (
    <span className="shrink-0 rounded-full bg-primary-ink px-[7px] py-0.5 text-[11px] font-extrabold text-white">
      {label}
    </span>
  );
}
