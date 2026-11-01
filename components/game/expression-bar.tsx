import { CircleCheck, CircleX, Ellipsis } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { SelectedCard } from '@/models/SelectedCard';
import { Symbol } from '@/models/Symbol';

const SYMBOL_LABEL: Record<Symbol, string> = {
  [Symbol.Plus]: '+',
  [Symbol.Minus]: '−',
  [Symbol.Times]: '×',
  [Symbol.Divide]: '÷',
  [Symbol.LeftBracket]: '(',
  [Symbol.RightBracket]: ')',
};

type ExpressionBarProps = {
  tokens: SelectedCard[];
  /** 算式的即時計算結果；算式不完整時為 null */
  result: number | null;
  /** 還沒選任何牌時的提示文字 */
  placeholder: string;
  /**
   * 已經用完該用的牌（例如經典模式 4 張都用上）。
   * 還沒用完時，結果不是 24 只代表「還在組」，以中性樣式顯示，不判定為錯
   */
  isFinal: boolean;
  /** 有傳入時，點擊算式中的某一格會移除它 */
  onRemoveToken?: (index: number) => void;
  className?: string;
};

/**
 * 算式列：四種狀態——空白、不完整、結果非 24、等於 24。
 * 對錯不只靠顏色：外框加粗、圖示與實際數值一起出現
 */
export function ExpressionBar({
  tokens,
  result,
  placeholder,
  isFinal,
  onRemoveToken,
  className,
}: ExpressionBarProps) {
  const t = useTranslations('GameUI.expression');

  const isEmpty = tokens.length === 0;
  const isCorrect = result !== null && Math.abs(result - 24) < 1e-9;
  const isWrong = result !== null && !isCorrect && isFinal;

  return (
    <div
      className={cn(
        'flex min-h-16 w-full items-center gap-2 rounded-2xl border bg-sunken px-3.5 py-2',
        isCorrect
          ? 'border-2 border-primary bg-primary-tint px-[13px]'
          : isWrong
            ? 'border-2 border-danger bg-danger-tint px-[13px]'
            : 'border-line',
        className,
      )}
    >
      {isEmpty ? (
        <span className="text-[15px] text-ink-2">{placeholder}</span>
      ) : (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {tokens.map((token, i) => (
            <ExpressionToken
              key={i}
              token={token}
              onRemove={onRemoveToken ? () => onRemoveToken(i) : undefined}
              removeLabel={t('removeToken')}
            />
          ))}
        </div>
      )}

      {!isEmpty && (
        <span
          aria-live="polite"
          className={cn(
            'ml-auto flex shrink-0 items-center gap-1.5 font-display text-2xl leading-none font-extrabold',
            isCorrect
              ? 'text-primary-ink'
              : isWrong
                ? 'text-danger-ink'
                : 'text-ink-2',
          )}
        >
          {result === null ? (
            <>
              <Ellipsis aria-hidden className="h-5 w-5" />
              <span className="font-noto text-sm font-semibold">
                {t('incomplete')}
              </span>
            </>
          ) : (
            <>
              {isCorrect && <CircleCheck aria-hidden className="h-6 w-6" />}
              {isWrong && <CircleX aria-hidden className="h-5 w-5" />}
              <span>= {result}</span>
              {(isCorrect || isWrong) && (
                <span className="sr-only">
                  {isCorrect ? t('correct') : t('wrong')}
                </span>
              )}
            </>
          )}
        </span>
      )}
    </div>
  );
}

function ExpressionToken({
  token,
  onRemove,
  removeLabel,
}: {
  token: SelectedCard;
  onRemove?: () => void;
  removeLabel: string;
}) {
  const isNumber = !!token.number;
  const label = isNumber
    ? String(token.number!.value)
    : token.symbol
      ? SYMBOL_LABEL[token.symbol]
      : '';

  const className = cn(
    'font-display text-[22px] leading-none font-extrabold',
    isNumber
      ? 'flex h-10 min-w-8 items-center justify-center rounded-lg border-[1.5px] border-playcard-line bg-playcard px-1 text-playcard-ink shadow-[0_2px_0_0_var(--playcard-edge)]'
      : 'px-0.5 text-ink-2',
  );

  if (!onRemove) return <span className={className}>{label}</span>;

  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`${removeLabel} ${label}`}
      className={cn(
        className,
        'cursor-pointer transition-colors hover:border-danger hover:text-danger-ink',
      )}
    >
      {label}
    </button>
  );
}
