'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import { Flame, Lock, PenLine } from 'lucide-react';
import { PlayerCard, PlayerStatus } from '@/components/game/player-card';
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

  // 分數滾動動畫
  const count = useMotionValue(player.score);
  const displayScore = useTransform(count, v => Math.round(v));
  useEffect(() => {
    if (reduceMotion) {
      count.set(player.score);
      return;
    }
    const controls = animate(count, player.score, {
      duration: 0.5,
      ease: 'easeOut',
    });
    return () => controls.stop();
  }, [player.score, count, reduceMotion]);

  // 分數變動：以正負號 pill 顯示，不靠綠/紅判斷加或扣
  const prevScoreRef = useRef(player.score);
  const [delta, setDelta] = useState<number | null>(null);
  useEffect(() => {
    const diff = player.score - prevScoreRef.current;
    prevScoreRef.current = player.score;
    if (diff === 0) return;
    setDelta(diff);
    const t = setTimeout(() => setDelta(null), reduceMotion ? 2500 : 1800);
    return () => clearTimeout(t);
  }, [player.score, reduceMotion]);

  const status: PlayerStatus | undefined = isCurrentAnswerer
    ? {
        kind: 'answering',
        label: '作答中',
        icon: <PenLine aria-hidden className="h-4 w-4" />,
      }
    : isLocked
      ? {
          kind: 'locked',
          label: '鎖定中',
          icon: <Lock aria-hidden className="h-4 w-4" />,
        }
      : undefined;

  return (
    <PlayerCard
      className="w-[240px] shrink-0"
      name={player.name}
      isSelf={isCurrentPlayer}
      selfLabel="（你）"
      isActive={isCurrentAnswerer}
      isDimmed={isLocked && !isCurrentAnswerer}
      status={status}
      data-testid="buzzer-player"
      data-player-name={player.name}
      data-score={player.score}
      meta={
        <span className="flex items-center gap-1.5">
          <span>
            <motion.span className="font-display font-bold text-ink tabular-nums">
              {displayScore}
            </motion.span>{' '}
            分
          </span>
          {streak > 0 && (
            <span className="inline-flex items-center gap-0.5 font-display font-bold text-amber-ink">
              <Flame aria-hidden className="h-3.5 w-3.5" />
              {streak}
            </span>
          )}
          <AnimatePresence>
            {delta !== null && (
              <motion.span
                key={`delta-${player.score}`}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                className={
                  delta > 0
                    ? 'rounded-full bg-primary-tint px-1.5 font-display font-extrabold text-primary-ink'
                    : 'rounded-full bg-danger-tint px-1.5 font-display font-extrabold text-danger-ink'
                }
              >
                {delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      }
    />
  );
};

export default BuzzerPlayerCard;
