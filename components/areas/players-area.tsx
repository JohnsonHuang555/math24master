import { motion, useReducedMotion } from 'framer-motion';
import { Bot, CircleCheck, Crown, Info, UserMinus } from 'lucide-react';
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

const BOT_LABELS: Record<string, string> = {
  easy: '簡單',
  normal: '普通',
  hard: '困難',
};

const PILL_CLASS =
  'inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[13px] font-bold';

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

  return (
    <section
      aria-label="玩家"
      className="flex h-full flex-1 flex-col md:rounded-[20px] md:border md:border-line md:bg-surface md:p-4"
    >
      <h2 className="mb-3 hidden text-base font-extrabold text-ink md:block">
        玩家（{players.length}）
      </h2>

      <ul className="flex flex-1 flex-col gap-2">
        {players.map((player, i) => {
          const isSelf = player.id === currentPlayer?.id;
          return (
            <motion.li
              key={player.id}
              initial={reduceMotion ? false : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.3,
                delay: i * 0.06,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={cn(
                'flex min-h-16 items-center gap-3 rounded-2xl border px-3 py-2',
                isSelf
                  ? 'border-primary bg-primary-tint'
                  : 'border-line bg-surface',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-extrabold',
                  player.isBot
                    ? 'bg-sunken text-ink-2'
                    : isSelf
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-sunken text-ink',
                )}
              >
                {player.isBot ? (
                  <Bot className="h-5 w-5" />
                ) : (
                  player.name.charAt(0).toUpperCase()
                )}
              </span>

              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1 text-[15px] font-bold text-ink">
                  <span className="truncate">{player.name}</span>
                  {isSelf && (
                    <span className="shrink-0 font-semibold text-primary-ink">
                      （你）
                    </span>
                  )}
                  {player.isMaster && (
                    <Crown
                      aria-hidden
                      className="h-4 w-4 shrink-0 text-amber-ink"
                    />
                  )}
                </span>
                {(player.isMaster || player.isBot) && (
                  <span className="text-xs text-ink-2">
                    {player.isMaster ? '房主' : '電腦玩家'}
                  </span>
                )}
              </span>

              {player.isBot ? (
                <span
                  className={cn(
                    PILL_CLASS,
                    'border border-line-strong bg-sunken text-ink',
                  )}
                >
                  {BOT_LABELS[player.botDifficulty ?? 'normal']}
                </span>
              ) : (
                !player.isMaster &&
                (player.isReady ? (
                  <span
                    className={cn(
                      PILL_CLASS,
                      'bg-primary-tint text-primary-ink',
                    )}
                  >
                    <CircleCheck aria-hidden className="h-4 w-4" />
                    已準備
                  </span>
                ) : (
                  <span
                    className={cn(
                      PILL_CLASS,
                      'border border-line-strong bg-sunken text-ink-2',
                    )}
                  >
                    未準備
                  </span>
                ))
              )}

              {/* 踢除按鈕（房主才看得到，不顯示自己的） */}
              {!player.isMaster && currentPlayer?.isMaster && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemovePlayer(player.id)}
                  aria-label={`踢除 ${player.name}`}
                  className="h-11 w-11 shrink-0 text-ink-2 hover:bg-danger-tint hover:text-danger-ink"
                >
                  <UserMinus className="h-5 w-5" />
                </Button>
              )}
            </motion.li>
          );
        })}
      </ul>

      {canAddBot && onAddBot && (
        <div className="mt-3 flex flex-col gap-1.5 rounded-2xl border-[1.5px] border-dashed border-line-strong p-3">
          <span className="flex items-center gap-1.5 text-sm font-bold text-primary-ink">
            <Bot aria-hidden className="h-4 w-4" />
            加入電腦玩家
          </span>
          <div className="flex gap-1.5">
            {(['easy', 'normal', 'hard'] as const).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => onAddBot(d)}
                className="h-11 flex-1 rounded-xl border border-line-strong bg-surface text-sm font-bold text-ink transition-colors hover:border-primary hover:bg-primary-tint"
              >
                {BOT_LABELS[d]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 手機版的主要按鈕固定在畫面底部（見房間頁），這裡只在桌機顯示 */}
      {
        <div className="mt-4 hidden md:block">
          <WaitingRoomAction
            players={players}
            currentPlayer={currentPlayer}
            onReady={onReady}
            onStart={onStart}
          />
        </div>
      }
    </section>
  );
};

/** 等待大廳的主要按鈕：房主「開始遊戲」，其他人「準備遊戲 / 取消準備」，上方附狀態說明 */
export function WaitingRoomAction({
  players = [],
  currentPlayer,
  onReady,
  onStart,
  notice,
}: {
  players?: Player[];
  currentPlayer?: Player;
  onReady: () => void;
  onStart: () => void;
  /** 優先顯示的狀態（例如開始倒數） */
  notice?: React.ReactNode;
}) {
  const allPlayersReady = players.length > 1 && players.every(p => p.isReady);
  const notReadyCount = players.filter(p => !p.isReady).length;
  const hint =
    notice ??
    (currentPlayer?.isMaster
      ? players.length < 2
        ? '等待其他玩家加入'
        : !allPlayersReady
          ? `尚有 ${notReadyCount} 位玩家未準備`
          : null
      : currentPlayer?.isReady
        ? '等待房主開始遊戲'
        : null);

  return (
    <div className="flex flex-col gap-2.5">
      {hint && (
        <p
          role="status"
          className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-2"
        >
          <Info aria-hidden className="h-4 w-4 shrink-0" />
          {hint}
        </p>
      )}
      {currentPlayer?.isMaster ? (
        <Button
          variant="tactile"
          className="w-full"
          onClick={onStart}
          disabled={!allPlayersReady}
        >
          開始遊戲
        </Button>
      ) : currentPlayer?.isReady ? (
        <Button variant="tactileOutline" className="w-full" onClick={onReady}>
          取消準備
        </Button>
      ) : (
        <Button variant="tactile" className="w-full" onClick={onReady}>
          準備遊戲
        </Button>
      )}
    </div>
  );
}

export default PlayersArea;
