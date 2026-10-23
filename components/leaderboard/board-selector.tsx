'use client';

import { BOARDS, type Board, type BoardLevel } from '@/lib/leaderboard';
import { cn } from '@/lib/utils';

type BoardSelectorProps = {
  board: Board;
  level: BoardLevel;
  onChange: (boardId: string, levelId?: string) => void;
};

// 第一層：遊戲模式 chip 列（手機可橫向捲動）；第二層：只有多難度時才出現的 segmented control
export function BoardSelector({ board, level, onChange }: BoardSelectorProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        role="tablist"
        aria-label="遊戲模式"
        className="-mx-4 flex max-w-[calc(100%+2rem)] [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1"
      >
        {BOARDS.map(b => {
          const active = b.id === board.id;
          return (
            <button
              key={b.id}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(b.id)}
              className={cn(
                'shrink-0 rounded-full border-2 px-4 py-1.5 text-sm font-bold whitespace-nowrap transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-zinc-200 bg-white/80 text-muted-foreground hover:text-foreground dark:border-zinc-700 dark:bg-zinc-900/60',
              )}
            >
              {b.label}
            </button>
          );
        })}
      </div>

      {board.levels.length > 1 && (
        <div
          role="tablist"
          aria-label="難度"
          className="inline-flex rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-800"
        >
          {board.levels.map(l => {
            const active = l.id === level.id;
            return (
              <button
                key={l.id}
                role="tab"
                aria-selected={active}
                onClick={() => onChange(board.id, l.id)}
                className={cn(
                  'rounded-xl px-5 py-1 text-sm font-bold transition-colors',
                  active
                    ? 'bg-white text-foreground shadow-sm dark:bg-zinc-700'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {l.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
