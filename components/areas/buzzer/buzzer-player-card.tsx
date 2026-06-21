'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { Player } from '@/models/Player';
import { BuzzerPlayerState } from '@/models/Room';

type BuzzerPlayerCardProps = {
  player: Player;
  playerState: BuzzerPlayerState | undefined;
  isCurrentAnswerer: boolean;
  isCurrentPlayer: boolean;
};

const BuzzerPlayerCard = ({
  player,
  playerState,
  isCurrentAnswerer,
  isCurrentPlayer,
}: BuzzerPlayerCardProps) => {
  const reduceMotion = useReducedMotion();
  const isLocked = playerState?.isLocked ?? false;
  const streak = playerState?.streak ?? 0;

  const getCardClass = () => {
    if (isCurrentAnswerer)
      return 'border-primary bg-primary/5 dark:bg-primary/10';
    if (isLocked)
      return 'border-rose-400 bg-rose-50 dark:border-rose-600 dark:bg-rose-950/20';
    return 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800';
  };

  return (
    <motion.div
      animate={
        isCurrentAnswerer && !reduceMotion
          ? {
              boxShadow: [
                '0 0 0 0 rgba(13,148,136,0)',
                '0 0 0 4px rgba(13,148,136,0.22)',
                '0 0 0 0 rgba(13,148,136,0)',
              ],
            }
          : { boxShadow: '0 5px 0 0 rgba(0,0,0,0.06)' }
      }
      transition={
        isCurrentAnswerer
          ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
          : {}
      }
      className={`relative flex min-w-[80px] flex-col items-center gap-1 rounded-2xl border-2 px-3 py-2.5 shadow-[0_5px_0_0_rgba(0,0,0,0.06)] md:min-w-[100px] md:gap-1.5 md:px-4 md:py-3 ${getCardClass()}`}
    >
      {/* 作答中 badge */}
      {isCurrentAnswerer && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-3.5 rounded-full bg-primary px-2.5 py-0.5 font-display text-xs font-black text-white shadow-sm"
        >
          作答中
        </motion.div>
      )}

      {/* 鎖定中 badge */}
      {isLocked && !isCurrentAnswerer && (
        <div className="absolute -top-3.5 rounded-full bg-rose-500 px-2.5 py-0.5 font-display text-xs font-black text-white shadow-sm">
          鎖定中
        </div>
      )}

      {/* 名稱 */}
      <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
        {player.name}
        {isCurrentPlayer && (
          <span className="ml-1 text-xs text-primary">（你）</span>
        )}
      </span>

      {/* 分數 */}
      <span
        className={`font-display text-3xl font-black md:text-4xl ${
          isCurrentAnswerer
            ? 'text-primary'
            : 'text-zinc-900 dark:text-zinc-100'
        }`}
      >
        {player.score}
      </span>

      {/* 連勝 */}
      {streak > 0 && (
        <div className="flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 font-display text-xs font-black text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
          <Flame className="h-3 w-3" />
          {streak}
        </div>
      )}
    </motion.div>
  );
};

export default BuzzerPlayerCard;
