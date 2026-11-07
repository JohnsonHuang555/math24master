'use client';

import {
  Calculator,
  Layers,
  LayoutGrid,
  LucideIcon,
  Shapes,
  Timer,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BOARDS, type Board, type BoardLevel } from '@/lib/leaderboard';
import { cn } from '@/lib/utils';
import { useLeaderboardLabels } from './use-leaderboard-labels';

const BOARD_ICON: Record<string, LucideIcon> = {
  classic: Layers,
  challenge: Timer,
  match: LayoutGrid,
  quickmath: Calculator,
  tabletop: Shapes,
};

type ModeTabsProps = {
  board: Board;
  onChange: (boardId: string) => void;
  /** 手機為橫向 chip 列（可捲動），桌機為左側直式選單 */
  orientation: 'horizontal' | 'vertical';
  className?: string;
};

/** 第一層：遊戲模式 */
export function ModeTabs({
  board,
  onChange,
  orientation,
  className,
}: ModeTabsProps) {
  const t = useTranslations('Leaderboard');
  const { boardLabel } = useLeaderboardLabels();

  if (orientation === 'vertical') {
    return (
      <div
        role="tablist"
        aria-label={t('gameMode')}
        aria-orientation="vertical"
        className={cn('flex flex-col gap-1.5', className)}
      >
        {BOARDS.map(b => {
          const active = b.id === board.id;
          const Icon = BOARD_ICON[b.id] ?? Layers;
          return (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(b.id)}
              className={cn(
                'flex h-[52px] items-center gap-3 rounded-[14px] px-3.5 text-[15px] font-bold text-ink transition-colors',
                active
                  ? 'border-[1.5px] border-primary-ink bg-surface'
                  : 'border-[1.5px] border-transparent hover:bg-surface/70',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]',
                  active
                    ? 'bg-primary-tint text-primary-ink'
                    : 'bg-sunken text-ink-2',
                )}
              >
                <Icon aria-hidden className="h-[18px] w-[18px]" />
              </span>
              {boardLabel(b)}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <div
        role="tablist"
        aria-label={t('gameMode')}
        className="flex [scrollbar-width:none] gap-2 overflow-x-auto px-4"
      >
        {BOARDS.map(b => {
          const active = b.id === board.id;
          return (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(b.id)}
              className={cn(
                'inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-sm font-bold whitespace-nowrap transition-colors',
                active
                  ? 'border-primary-ink bg-primary-ink text-white'
                  : 'border-line-strong bg-surface text-ink hover:bg-sunken',
              )}
            >
              {boardLabel(b)}
            </button>
          );
        })}
      </div>
      {/* 右側漸層提示還有 chip 可以滑出來 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-9 bg-linear-to-r from-transparent to-[#f3faf8]"
      />
    </div>
  );
}

type LevelSegmentProps = {
  board: Board;
  level: BoardLevel;
  onChange: (boardId: string, levelId?: string) => void;
  className?: string;
};

/** 第二層：只有多難度的模式才出現的 segmented control */
export function LevelSegment({
  board,
  level,
  onChange,
  className,
}: LevelSegmentProps) {
  const t = useTranslations('Leaderboard');
  const { levelLabel } = useLeaderboardLabels();

  if (board.levels.length < 2) return null;

  return (
    <div
      role="tablist"
      aria-label={t('level')}
      className={cn(
        'flex gap-1 rounded-[14px] border border-line bg-sunken p-1',
        className,
      )}
    >
      {board.levels.map(l => {
        const active = l.id === level.id;
        return (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(board.id, l.id)}
            className={cn(
              'h-10 flex-1 rounded-[10px] px-4 text-sm font-bold whitespace-nowrap transition-colors',
              active
                ? 'bg-surface text-ink shadow-[0_1px_0_0_var(--line-strong),0_0_0_1px_var(--line-strong)]'
                : 'text-ink-2 hover:text-ink',
            )}
          >
            {levelLabel(board, l)}
          </button>
        );
      })}
    </div>
  );
}
