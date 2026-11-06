import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Symbol } from '@/models/Symbol';

type SymbolsProps = {
  onClick: (symbol: Symbol) => void;
  disabled?: boolean;
  /** 桌機在按鈕右下角標出對應的鍵盤按鍵 */
  showShortcuts?: boolean;
};

const SYMBOLS = [
  { symbol: Symbol.Plus, label: '+', name: 'plus', key: '+' },
  { symbol: Symbol.Minus, label: '−', name: 'minus', key: '-' },
  { symbol: Symbol.Times, label: '×', name: 'times', key: '*' },
  { symbol: Symbol.Divide, label: '÷', name: 'divide', key: '/' },
  { symbol: Symbol.LeftBracket, label: '(', name: 'leftParen', key: '(' },
  { symbol: Symbol.RightBracket, label: ')', name: 'rightParen', key: ')' },
] as const;

/**
 * 運算符號按鈕列。平面樣式：厚度只留給數字牌與主 CTA。
 * 6 × 48 + 5 × 8 = 328px，剛好放進 360px 寬扣掉左右 16px 邊距
 */
const Symbols = ({ onClick, disabled, showShortcuts }: SymbolsProps) => {
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
            'relative flex h-12 w-12 items-center justify-center rounded-xl border border-line-strong bg-surface font-display text-[26px] leading-none font-bold text-ink transition-[transform,background-color,border-color] duration-[90ms] ease-out lg:h-[60px] lg:w-[68px] lg:rounded-[14px] lg:text-[30px]',
            'hover:bg-sunken active:translate-y-px active:border-primary active:bg-primary-tint',
            'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
            'disabled:cursor-not-allowed disabled:opacity-45',
          )}
        >
          {config.label}
          {showShortcuts && (
            <kbd
              aria-hidden
              className="absolute right-1.5 bottom-1 hidden font-noto text-[10px] font-bold text-ink-2 lg:block"
            >
              {config.key}
            </kbd>
          )}
        </button>
      ))}
    </>
  );
};

export default Symbols;
