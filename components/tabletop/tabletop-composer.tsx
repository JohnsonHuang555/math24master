'use client';

import { Check, CircleAlert, Delete, X } from 'lucide-react';
import { TabletopTiles } from '@/components/tabletop/tabletop-tiles';
import { Button } from '@/components/ui/button';
import { ComposerPreview, ComposerSymbol } from '@/lib/tabletop-turn-draft';
import { TabletopTile } from '@/models/Tabletop';

const COMPOSER_SYMBOLS: {
  symbol: ComposerSymbol;
  label: string;
  name: string;
}[] = [
  { symbol: '+', label: '+', name: '加' },
  { symbol: '-', label: '−', name: '減' },
  { symbol: '*', label: '×', name: '乘' },
  { symbol: '/', label: '÷', name: '除' },
  { symbol: '(', label: '(', name: '左括號' },
  { symbol: ')', label: ')', name: '右括號' },
];

type TabletopComposerProps = {
  composer: TabletopTile[];
  preview: ComposerPreview | null;
  disabled: boolean;
  onAddSymbol: (symbol: ComposerSymbol) => void;
  onBackspace: () => void;
  onClear: () => void;
  onCommit: () => void;
};

export function TabletopComposer({
  composer,
  preview,
  disabled,
  onAddSymbol,
  onBackspace,
  onClear,
  onCommit,
}: TabletopComposerProps) {
  return (
    <section
      aria-label="組裝列"
      className="flex w-full flex-col gap-2 rounded-2xl border-2 border-zinc-200 bg-white px-3 py-2.5 shadow-[0_4px_0_0_rgba(0,0,0,0.05)] dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="flex min-h-11 items-center">
        {composer.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            點手牌或散牌，加上符號組成算式
          </span>
        ) : (
          <TabletopTiles tiles={composer} />
        )}
      </div>

      <div className="flex min-h-5 items-center justify-between gap-2 text-sm">
        {preview?.validation.valid ? (
          <>
            <span className="flex items-center gap-1 font-bold text-teal-700 dark:text-teal-400">
              <Check className="h-4 w-4" />
              等於 24
            </span>
            <span className="font-display font-bold text-amber-700 dark:text-amber-400">
              預估 {preview.score} 分
            </span>
          </>
        ) : preview && !preview.validation.valid ? (
          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
            <CircleAlert className="h-4 w-4 shrink-0" />
            {preview.validation.reason}
          </span>
        ) : null}
      </div>

      {/* 共用的 Symbols 每顆 52px，6 顆在手機寬度會折成兩行，這裡改用較小的單行按鈕 */}
      <div className="grid grid-cols-6 gap-1.5">
        {COMPOSER_SYMBOLS.map(({ symbol, label, name }) => (
          <button
            key={symbol}
            type="button"
            aria-label={name}
            data-testid={`symbol-${symbol}`}
            disabled={disabled}
            onClick={() => onAddSymbol(symbol)}
            className="flex h-10 items-center justify-center rounded-xl border-2 border-zinc-200 bg-white font-display text-xl font-bold text-zinc-700 shadow-[0_3px_0_0_rgba(0,0,0,0.06)] transition-colors hover:border-primary/40 active:translate-y-0.5 active:shadow-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          variant="tactileOutline"
          size="icon"
          className="h-11 w-11 shrink-0"
          aria-label="退格"
          disabled={disabled || composer.length === 0}
          onClick={onBackspace}
        >
          <Delete className="h-4 w-4" />
        </Button>
        <Button
          variant="tactileOutline"
          size="icon"
          className="h-11 w-11 shrink-0"
          aria-label="清空組裝列"
          disabled={disabled || composer.length === 0}
          onClick={onClear}
        >
          <X className="h-4 w-4" />
        </Button>
        <Button
          variant="tactileOutline"
          className="h-11 flex-1"
          disabled={disabled || !preview?.validation.valid}
          onClick={onCommit}
        >
          放上桌面
        </Button>
      </div>
    </section>
  );
}
