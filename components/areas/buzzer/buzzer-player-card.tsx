'use client';

import { motion } from 'framer-motion';
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
  const isLocked = playerState?.isLocked ?? false;
  const streak = playerState?.streak ?? 0;

  const getBorderClass = () => {
    if (isCurrentAnswerer) return 'border-green-500';
    if (isLocked) return 'border-red-500';
    return 'border-gray-200';
  };

  return (
    <motion.div
      animate={
        isCurrentAnswerer
          ? { borderColor: ['#22c55e', '#86efac', '#22c55e'] }
          : {}
      }
      transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
      className={`relative flex min-w-[120px] flex-col items-center gap-1 rounded-xl border-4 bg-white px-4 py-3 shadow-md ${getBorderClass()}`}
    >
      {isCurrentAnswerer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="absolute -top-3 rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold text-white"
        >
          作答中
        </motion.div>
      )}

      {isLocked && !isCurrentAnswerer && (
        <div className="absolute -top-3 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
          鎖定中
        </div>
      )}

      <span className="text-sm font-semibold text-gray-700">
        {player.name}
        {isCurrentPlayer && (
          <span className="ml-1 text-xs text-[#E9A368]">(你)</span>
        )}
      </span>

      <span className="text-3xl font-extrabold text-gray-900">
        {player.score}
      </span>

      {streak > 0 && (
        <div className="flex items-center gap-1 text-sm font-bold text-orange-500">
          <span>🔥</span>
          <span>{streak}</span>
        </div>
      )}
    </motion.div>
  );
};

export default BuzzerPlayerCard;
