'use client';

import { Star, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { RankMedal } from '@/components/leaderboard/rank-medal';
import { usePlayerName } from '@/hooks/usePlayerName';
import { cn } from '@/lib/utils';
import { Player } from '@/models/Player';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

type GameOverModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** 依分數由高到低排序的玩家列表 */
  players: Player[];
  currentPlayerId?: string;
  isSinglePlay?: boolean;
  isNewBestScore?: boolean;
  isPenaltyGameOver?: boolean;
  onPlayAgain: () => void;
  onGoHome: () => void;
  /** 多人模式：只顯示「回到房間頁」按鈕，不可點外部關閉 */
  isMultiplePlay?: boolean;
};

const RANK_KEYS = ['first', 'second', 'third'] as const;

export function GameOverModal({
  isOpen,
  onClose,
  players,
  currentPlayerId,
  isSinglePlay,
  isNewBestScore,
  isPenaltyGameOver,
  onPlayAgain,
  onGoHome,
  isMultiplePlay,
}: GameOverModalProps) {
  const t = useTranslations('Multiplayer.gameOver');
  const tPlayers = useTranslations('Multiplayer.players');
  const playerDisplayName = usePlayerName();
  return (
    <Dialog
      open={isOpen}
      onOpenChange={isMultiplePlay ? () => {} : v => !v && onClose()}
    >
      <DialogContent
        className="sm:max-w-sm"
        hideClose={isMultiplePlay}
        onPointerDownOutside={
          isMultiplePlay ? e => e.preventDefault() : undefined
        }
        onEscapeKeyDown={isMultiplePlay ? e => e.preventDefault() : undefined}
      >
        <DialogHeader className="items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-tint text-amber-ink">
            <Trophy aria-hidden className="h-7 w-7" />
          </span>
          <DialogTitle className="pr-0 text-2xl">
            {isPenaltyGameOver ? t('penaltyTitle') : t('title')}
          </DialogTitle>
          {isPenaltyGameOver && (
            <DialogDescription>{t('penaltyDescription')}</DialogDescription>
          )}
        </DialogHeader>

        {isSinglePlay && players[0] && (
          <div className="flex flex-col items-center gap-2 py-2">
            <span className="text-sm font-semibold text-ink-2">
              {t('totalScore')}
            </span>
            <span className="font-display text-6xl leading-none font-extrabold text-ink">
              {players[0].score}
            </span>
            {isNewBestScore && (
              <span className="inline-flex h-7 items-center gap-1 rounded-full bg-amber px-2.5 text-[13px] font-bold text-on-amber">
                <Star aria-hidden className="h-4 w-4" />
                {t('newBest')}
              </span>
            )}
          </div>
        )}

        {!isSinglePlay && players.length > 0 && (
          <ol className="flex max-h-[300px] flex-col gap-2 overflow-y-auto">
            {players.map((player, index) => {
              const isSelf = player.id === currentPlayerId;
              return (
                <li
                  key={player.id}
                  className={cn(
                    'flex min-h-14 items-center gap-3 rounded-2xl border px-3 py-2',
                    isSelf
                      ? 'border-primary bg-primary-tint'
                      : 'border-line bg-surface',
                  )}
                >
                  <RankMedal rank={index + 1} size={32} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-[15px] font-bold text-ink">
                        {playerDisplayName(player.name)}
                      </span>
                      {isSelf && (
                        <span className="shrink-0 rounded-full bg-primary-ink px-[7px] py-0.5 text-[11px] font-extrabold text-white">
                          {tPlayers('youBadge')}
                        </span>
                      )}
                    </span>
                    {RANK_KEYS[index] && (
                      <span className="text-xs text-ink-2">
                        {t(`ranks.${RANK_KEYS[index]}`)}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm text-ink-2">
                    {t.rich('score', {
                      score: player.score,
                      b: chunks => (
                        <b className="font-display text-xl font-extrabold text-ink">
                          {chunks}
                        </b>
                      ),
                    })}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <div className="flex gap-2.5 pt-1">
          {isMultiplePlay ? (
            <Button variant="tactile" className="flex-1" onClick={onGoHome}>
              {t('backToRoom')}
            </Button>
          ) : (
            <>
              <Button
                variant="tactileOutline"
                className="flex-1"
                onClick={onGoHome}
              >
                {t('home')}
              </Button>
              <Button
                variant="tactile"
                className="flex-1"
                onClick={onPlayAgain}
              >
                {t('playAgain')}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
