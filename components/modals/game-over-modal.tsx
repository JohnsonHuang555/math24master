'use client';

import { Bot, Star, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { RankMedal } from '@/components/leaderboard/rank-medal';
import { usePlayerName } from '@/hooks/usePlayerName';
import { cn } from '@/lib/utils';
import { RankedPlayer } from '@/models/RoomView';
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
  players: RankedPlayer[];
  currentPlayerId?: string;
  isSinglePlay?: boolean;
  isNewBestScore?: boolean;
  isPenaltyGameOver?: boolean;
  onPlayAgain: () => void;
  onGoHome: () => void;
  /** 多人模式：顯示勝利者、自己的名次、「再玩一場」與「回大廳」，不可點外部關閉 */
  isMultiplePlay?: boolean;
  /** 多人模式的勝利者 id；沒有時以排序第一位為勝利者 */
  winnerId?: string;
  /** 再玩一場會怎麼做：快速配對重新配對對手，私人房間回到房間準備下一局 */
  rematchSource?: 'quick_match' | 'private_room';
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
  winnerId,
  rematchSource,
}: GameOverModalProps) {
  const t = useTranslations('Multiplayer.gameOver');
  const tPlayers = useTranslations('Multiplayer.players');
  const tBot = useTranslations('Multiplayer.bot');
  const playerDisplayName = usePlayerName();
  const winner = players.find(p => p.id === winnerId) ?? players[0];
  const selfIndex = players.findIndex(p => p.id === currentPlayerId);
  const isSelfWinner = !!winner && winner.id === currentPlayerId;
  // 多人結算的標題：自己贏了，或誰贏了（殘局結算沿用原本的標題）
  const multiplayerTitle =
    isMultiplePlay && !isPenaltyGameOver && winner
      ? isSelfWinner
        ? t('youWon')
        : t('winner', { name: playerDisplayName(winner.name) })
      : null;
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
          <DialogTitle className="pr-0 text-2xl" data-testid="game-over-title">
            {multiplayerTitle ??
              (isPenaltyGameOver ? t('penaltyTitle') : t('title'))}
          </DialogTitle>
          {isPenaltyGameOver && (
            <DialogDescription>{t('penaltyDescription')}</DialogDescription>
          )}
          {isMultiplePlay && selfIndex >= 0 && (
            <DialogDescription
              className="text-[15px] font-semibold text-ink-2"
              data-testid="game-over-self-rank"
            >
              {t('yourRank', { rank: selfIndex + 1, total: players.length })}
            </DialogDescription>
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
                  data-testid="game-over-player"
                  data-player-kind={player.isBot ? 'bot' : 'human'}
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
                      {player.isBot && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line-strong bg-sunken px-[7px] py-0.5 text-[11px] font-bold text-ink-2">
                          <Bot aria-hidden className="h-3 w-3" />
                          {tBot('name')}
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
            <>
              <Button
                variant="tactileOutline"
                className="flex-1"
                onClick={onGoHome}
              >
                {t('backToLobby')}
              </Button>
              <Button
                variant="tactile"
                className="flex-1"
                onClick={onPlayAgain}
              >
                {t('rematch')}
              </Button>
            </>
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
        {isMultiplePlay && rematchSource && (
          <p className="-mt-1 text-center text-[13px] text-ink-2">
            {t(`rematchHint.${rematchSource}`)}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
