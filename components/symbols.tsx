import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Symbol } from '@/models/Symbol';

type SymbolsProps = {
  onClick: (symbol: Symbol) => void;
  disabled?: boolean;
};

const SYMBOLS = [
  { symbol: Symbol.Plus, label: '+', name: 'plus' },
  { symbol: Symbol.Minus, label: '−', name: 'minus' },
  { symbol: Symbol.Times, label: '×', name: 'times' },
  { symbol: Symbol.Divide, label: '÷', name: 'divide' },
  { symbol: Symbol.LeftBracket, label: '(', name: 'leftParen' },
  { symbol: Symbol.RightBracket, label: ')', name: 'rightParen' },
] as const;

/**
 * 運算符號按鈕列。平面樣式：厚度只留給數字牌與主 CTA。
 * 6 × 48 + 5 × 8 = 328px，剛好放進 360px 寬扣掉左右 16px 邊距
 */
const Symbols = ({ onClick, disabled }: SymbolsProps) => {
  const t = useTranslations('GameUI.symbols');

  return (
    <>
      {SYMBOLS.map(config => (
        <button
          key={config.symbol}
          type="button"
          disabled={disabled}
          onClick={() => onClick(config.symbol)}
          data-testid={`symbol-${config.symbol}`}
          aria-label={t(config.name)}
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl border border-line-strong bg-surface font-display text-[26px] leading-none font-bold text-ink transition-[transform,background-color,border-color] duration-[90ms] ease-out',
            'hover:bg-sunken active:translate-y-px active:border-primary active:bg-primary-tint',
            'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
            'disabled:cursor-not-allowed disabled:opacity-45',
          )}
        >
          {config.label}
        </button>
      ))}
    </>
  );
};

export default Symbols;
