'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { NumberCard } from '@/models/Player';
import { SelectedCard } from '@/models/SelectedCard';
import { Symbol } from '@/models/Symbol';

type BuzzerAnswerPanelProps = {
  publicCards: NumberCard[];
  selectedCards: SelectedCard[];
  onSelectCard: (card: NumberCard) => void;
  onSelectSymbol: (symbol: Symbol) => void;
  onClear: () => void;
  onSubmit: () => void;
  isAnswerer: boolean;
};

const SYMBOLS: { label: string; value: Symbol }[] = [
  { label: '+', value: Symbol.Plus },
  { label: '-', value: Symbol.Minus },
  { label: '×', value: Symbol.Times },
  { label: '÷', value: Symbol.Divide },
  { label: '(', value: Symbol.LeftBracket },
  { label: ')', value: Symbol.RightBracket },
];

const getSelectedCardDisplay = (card: SelectedCard): string => {
  if (card.number !== undefined) return String(card.number.value);
  if (card.symbol !== undefined) {
    const sym = SYMBOLS.find(s => s.value === card.symbol);
    return sym ? sym.label : String(card.symbol);
  }
  return '';
};

const BuzzerAnswerPanel = ({
  publicCards,
  selectedCards,
  onSelectCard,
  onSelectSymbol,
  onClear,
  onSubmit,
  isAnswerer,
}: BuzzerAnswerPanelProps) => {
  const reduceMotion = useReducedMotion();
  const usedCardIds = selectedCards
    .filter(sc => sc.number !== undefined)
    .map(sc => sc.number!.id);

  // 旁觀者唯讀面板
  if (!isAnswerer) {
    return (
      <div className="flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 dark:border-primary/30 dark:bg-primary/10">
        <span className="text-sm font-bold text-primary">正在作答...</span>
        <div className="flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-white px-4 py-3 dark:bg-zinc-800">
          {selectedCards.length === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-1">
              {selectedCards.map((card, i) => (
                <span
                  key={i}
                  className="font-display text-2xl font-black text-zinc-800 dark:text-zinc-100"
                >
                  {getSelectedCardDisplay(card)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 作答者互動面板
  return (
    <div className="flex w-full max-w-2xl flex-col gap-3 rounded-2xl border-2 border-zinc-200 bg-white/90 p-4 shadow-[0_5px_0_0_rgba(0,0,0,0.06)] backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-800/90 md:gap-4 md:p-5">
      {/* 數字牌選擇區 */}
      <div className="flex justify-center gap-2 md:gap-3">
        {publicCards.map(card => {
          const isUsed = usedCardIds.includes(card.id);
          return (
            <motion.button
              key={card.id}
              whileTap={isUsed || reduceMotion ? undefined : { scale: 0.93 }}
              disabled={isUsed}
              onClick={() => onSelectCard(card)}
              className={`flex h-14 w-12 items-center justify-center rounded-2xl border-2 font-display text-xl font-black transition-colors md:h-16 md:w-14 md:text-2xl
                ${
                  isUsed
                    ? 'cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-600'
                    : 'cursor-pointer border-amber-400 bg-white text-zinc-800 shadow-[0_3px_0_0_#d97706] hover:bg-amber-50 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700'
                }`}
            >
              {card.value}
            </motion.button>
          );
        })}
      </div>

      {/* 算式顯示區 */}
      <div className="flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-zinc-50 px-4 py-2.5 dark:bg-zinc-900 md:min-h-[52px] md:py-3">
        {selectedCards.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            選擇數字與符號...
          </span>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-1">
            {selectedCards.map((card, i) => (
              <span
                key={i}
                className="font-display text-2xl font-black text-zinc-800 dark:text-zinc-100"
              >
                {getSelectedCardDisplay(card)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 符號按鈕 */}
      <div className="flex justify-center gap-1.5 md:gap-2">
        {SYMBOLS.map(sym => (
          <motion.button
            key={sym.value}
            whileTap={reduceMotion ? undefined : { scale: 0.93 }}
            onClick={() => onSelectSymbol(sym.value)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-primary/30 bg-primary/5 font-display text-base font-black text-primary shadow-[0_3px_0_0_rgba(13,148,136,0.2)] hover:bg-primary/10 dark:border-primary/40 dark:bg-primary/10 md:h-11 md:w-11 md:text-lg"
          >
            {sym.label}
          </motion.button>
        ))}
      </div>

      {/* 操作按鈕 */}
      <div className="flex gap-2 md:gap-3">
        <button
          onClick={onClear}
          className="flex-1 rounded-2xl border-2 border-zinc-200 bg-white py-2.5 font-bold text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          清除
        </button>
        <button
          onClick={onSubmit}
          className="flex-1 rounded-2xl bg-amber-400 py-2.5 font-display font-black text-white shadow-[0_4px_0_0_#d97706] transition-colors hover:bg-amber-500 active:translate-y-1 active:shadow-none"
        >
          提交
        </button>
      </div>
    </div>
  );
};

export default BuzzerAnswerPanel;
