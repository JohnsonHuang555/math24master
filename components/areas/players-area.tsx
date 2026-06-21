import { motion, useReducedMotion } from 'framer-motion';
import { Bot, Crown, UserMinus, UserRoundCheck, UserRoundX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Player } from '@/models/Player';

type PlayersAreaProps = {
  players?: Player[];
  currentPlayer?: Player;
  onReady: () => void;
  onStart: () => void;
  onRemovePlayer: (playerId: string) => void;
  onAddBot?: (difficulty: 'easy' | 'normal' | 'hard') => void;
  canAddBot?: boolean;
};

const AVATAR_COLORS = [
  'bg-teal-500',
  'bg-amber-500',
  'bg-rose-400',
  'bg-teal-400',
  'bg-amber-400',
  'bg-teal-600',
];

const BOT_LABELS: Record<string, string> = {
  easy: '簡單',
  normal: '普通',
  hard: '困難',
};

const PlayersArea = ({
  players = [],
  currentPlayer,
  onReady,
  onStart,
  onRemovePlayer,
  onAddBot,
  canAddBot,
}: PlayersAreaProps) => {
  const reduceMotion = useReducedMotion();
  const allPlayersReady = players.length > 1 && players.every(p => p.isReady);

  return (
    <div className="flex h-full flex-1 flex-col rounded-2xl border-2 border-zinc-200 bg-white/50 p-4 backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/30 max-sm:min-h-[270px]">
      {/* 標題 */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500 text-white">
          <UserRoundCheck className="h-4 w-4" />
        </div>
        <span className="font-display text-base font-black text-foreground">
          玩家 {players.length > 0 && `(${players.length})`}
        </span>
      </div>

      {/* 玩家列表 */}
      <div className="flex-1 space-y-2">
        {players.map((player, i) => (
          <motion.div
            key={player.id}
            initial={reduceMotion ? false : { opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-white/70 px-3 py-2.5 dark:border-zinc-700/50 dark:bg-zinc-800/40"
          >
            {/* 頭像 */}
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-display text-sm font-black text-white',
                AVATAR_COLORS[i % AVATAR_COLORS.length],
              )}
            >
              {player.name.charAt(0).toUpperCase()}
            </div>

            {/* 名稱 */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-bold text-foreground">
                  {player.name}
                </span>
              </div>
            </div>

            {/* 狀態圖示 */}
            <div className="flex items-center gap-1.5">
              {player.isMaster ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Crown className="h-4 w-4 text-amber-500" />
                </div>
              ) : (
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg',
                    player.isReady
                      ? 'bg-teal-100 dark:bg-teal-900/30'
                      : 'bg-zinc-100 dark:bg-zinc-700/50',
                  )}
                >
                  {player.isReady ? (
                    <UserRoundCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  ) : (
                    <UserRoundX className="h-4 w-4 text-zinc-400" />
                  )}
                </div>
              )}

              {/* 踢除按鈕（房主才看得到，不顯示自己的） */}
              {!player.isMaster && currentPlayer?.isMaster && (
                <button
                  onClick={() => onRemovePlayer(player.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:text-zinc-600 dark:hover:bg-rose-900/20 dark:hover:text-rose-400"
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* 加入電腦玩家 */}
      {canAddBot && onAddBot && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">加入電腦玩家</p>
          <div className="flex gap-1.5">
            {(['easy', 'normal', 'hard'] as const).map(d => (
              <button
                key={d}
                onClick={() => onAddBot(d)}
                className="flex-1 rounded-xl border border-zinc-200 bg-white/60 py-1.5 text-xs font-bold text-zinc-600 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400 dark:hover:border-teal-700 dark:hover:bg-teal-900/20 dark:hover:text-teal-400"
              >
                {BOT_LABELS[d]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 主要按鈕 */}
      <div className="mt-4">
        {currentPlayer?.isMaster ? (
          <Button
            className={cn(
              'h-11 w-full rounded-2xl font-bold transition-all',
              allPlayersReady
                ? 'bg-primary text-white shadow-[0_4px_0_0_hsl(175_84%_22%)] active:translate-y-1 active:shadow-none dark:shadow-[0_4px_0_0_hsl(173_66%_28%)]'
                : 'cursor-not-allowed bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600',
            )}
            onClick={onStart}
            disabled={!allPlayersReady}
          >
            開始遊戲
          </Button>
        ) : (
          <Button
            onClick={onReady}
            className={cn(
              'h-11 w-full rounded-2xl font-bold transition-all',
              currentPlayer?.isReady
                ? 'border-2 border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:border-teal-700 dark:bg-teal-900/20 dark:text-teal-400'
                : 'bg-primary text-white shadow-[0_4px_0_0_hsl(175_84%_22%)] active:translate-y-1 active:shadow-none dark:shadow-[0_4px_0_0_hsl(173_66%_28%)]',
            )}
          >
            {currentPlayer?.isReady ? '取消準備' : '準備遊戲'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default PlayersArea;
