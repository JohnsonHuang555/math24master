'use client';

import { CircleAlert, CircleCheck, Delete, Eraser } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { TabletopTiles } from '@/components/tabletop/tabletop-tiles';
import { Button } from '@/components/ui/button';
import { useTabletopErrorText } from '@/i18n/tabletop-messages';
import { ComposerPreview, ComposerSymbol } from '@/lib/tabletop-turn-draft';
import { cn } from '@/lib/utils';
import { TabletopTile } from '@/models/Tabletop';

// name 對應 messages 的 GameUI.symbols，作為按鈕的 aria-label
const COMPOSER_SYMBOLS = [
  { symbol: '+', label: '+', name: 'plus' },
  { symbol: '-', label: '−', name: 'minus' },
  { symbol: '*', label: '×', name: 'times' },
  { symbol: '/', label: '÷', name: 'divide' },
  { symbol: '(', label: '(', name: 'leftParen' },
  { symbol: ')', label: ')', name: 'rightParen' },
] as const satisfies readonly {
  symbol: ComposerSymbol;
  label: string;
  name: string;
}[];

// 符號鍵：6 個符號加退格排成一行，手機 375px 也不會折行
const KEY_CLASS =
  'flex h-11 min-w-0 flex-1 items-center justify-center rounded-xl border border-line-strong bg-surface font-display text-[22px] font-bold text-ink transition-colors hover:bg-sunken active:translate-y-px disabled:opacity-45 lg:h-12 lg:w-12 lg:flex-none';

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
  const t = useTranslations('Tabletop');
  const tSymbols = useTranslations('GameUI.symbols');
  const tExpression = useTranslations('GameUI.expression');
  const errorText = useTabletopErrorText();
  const isValid = !!preview?.validation.valid;
  const reason =
    preview && !preview.validation.valid
      ? errorText(preview.validation.reason)
      : null;

  return (
    <section
      aria-label={t('composer.label')}
      className={cn(
        'flex w-full flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3 lg:rounded-[18px] lg:border lg:border-line lg:bg-surface lg:p-3',
        disabled && 'opacity-60',
      )}
    >
      <div
        className={cn(
          'flex min-h-[58px] w-full items-center gap-2 rounded-[14px] px-2.5 py-1.5 lg:min-h-[68px] lg:basis-full lg:px-3.5',
          // 組裝中的算式多半還不成立，框維持中性，只在下方用文字說明原因
          isValid
            ? 'border-2 border-primary bg-primary-tint'
            : 'border border-line bg-sunken',
        )}
      >
        {composer.length === 0 ? (
          <span className="text-sm text-ink-2">
            {t('composer.placeholder')}
          </span>
        ) : (
          <div className="min-w-0 flex-1">
            <TabletopTiles tiles={composer} />
          </div>
        )}
        {isValid && (
          <span
            aria-live="polite"
            className="ml-auto flex shrink-0 flex-col items-end leading-tight"
          >
            <span className="flex items-center gap-1 text-[13px] font-extrabold text-primary-ink">
              <CircleCheck aria-hidden className="h-4 w-4" />
              {tExpression('correct')}
            </span>
            <span className="text-xs text-ink-2">
              {t('composer.estimate', { score: preview!.score ?? 0 })}
            </span>
          </span>
        )}
      </div>

      {reason && (
        <p
          role="status"
          className="flex items-center gap-1.5 text-[13px] font-semibold text-danger-ink lg:basis-full"
        >
          <CircleAlert aria-hidden className="h-4 w-4 shrink-0" />
          {reason}
        </p>
      )}

      <div className="flex gap-1.5">
        {COMPOSER_SYMBOLS.map(({ symbol, label, name }) => (
          <button
            key={symbol}
            type="button"
            aria-label={tSymbols(name)}
            data-testid={`symbol-${symbol}`}
            disabled={disabled}
            onClick={() => onAddSymbol(symbol)}
            className={KEY_CLASS}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          aria-label={t('composer.backspace')}
          disabled={disabled || composer.length === 0}
          onClick={onBackspace}
          className={KEY_CLASS}
        >
          <Delete className="h-5 w-5" />
        </button>
      </div>

      <div className="flex gap-2 lg:flex-1">
        {/* 只有 X 圖示時和乘號太像容易誤按，改用橡皮擦 */}
        <Button
          variant="outline"
          size="icon"
          className="h-[52px] w-[52px] shrink-0 rounded-xl border-line-strong bg-surface text-ink hover:bg-sunken"
          aria-label={t('composer.clear')}
          disabled={disabled || composer.length === 0}
          onClick={onClear}
        >
          <Eraser className="h-5 w-5" />
        </Button>
        <Button
          variant="tactile"
          className="h-[52px] min-w-0 flex-1 text-lg"
          disabled={disabled || !isValid}
          onClick={onCommit}
        >
          {t('composer.commit')}
        </Button>
      </div>
    </section>
  );
}
