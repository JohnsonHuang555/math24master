'use client';

import { motion } from 'framer-motion';
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
    const sym = SYMBOLS.find((s) => s.value === card.symbol);
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
  const usedCardIds = selectedCards
    .filter((sc) => sc.number !== undefined)
    .map((sc) => sc.number!.id);

  if (!isAnswerer) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/80 p-5 shadow-inner">
        <span className="text-sm font-semibold text-gray-500">正在作答...</span>
        <div className="flex min-h-[48px] flex-wrap items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2">
          {selectedCards.length === 0 ? (
            <span className="text-gray-400">—</span>
          ) : (
            selectedCards.map((card, i) => (
              <span key={i} className="text-2xl font-bold text-gray-700">
                {getSelectedCardDisplay(card)}
              </span>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-white/90 p-5 shadow-lg">
      <div className="flex gap-3">
        {publicCards.map((card) => {
          const isUsed = usedCardIds.includes(card.id);
          return (
            <motion.button
              key={card.id}
              whileTap={{ scale: 0.9 }}
              disabled={isUsed}
              onClick={() => onSelectCard(card)}
              className={`flex h-16 w-14 items-center justify-center rounded-xl border-4 font-extrabold text-2xl shadow transition-all
                ${isUsed
                  ? 'border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed'
                  : 'border-[#E9A368] bg-white text-gray-800 hover:bg-[#fdf0e4] cursor-pointer'
                }`}
            >
              {card.value}
            </motion.button>
          );
        })}
      </div>

      <div className="flex min-h-[48px] w-full flex-wrap items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2">
        {selectedCards.length === 0 ? (
          <span className="text-gray-400">選擇數字與符號...</span>
        ) : (
          selectedCards.map((card, i) => (
            <span key={i} className="text-2xl font-bold text-gray-700">
              {getSelectedCardDisplay(card)}
            </span>
          ))
        )}
      </div>

      <div className="flex gap-2">
        {SYMBOLS.map((sym) => (
          <motion.button
            key={sym.value}
            whileTap={{ scale: 0.9 }}
            onClick={() => onSelectSymbol(sym.value)}
            className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-teal-400 bg-teal-50 text-xl font-bold text-teal-700 shadow hover:bg-teal-100"
          >
            {sym.label}
          </motion.button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onClear}
          className="rounded-xl border-2 border-gray-300 bg-white px-5 py-2 font-semibold text-gray-600 hover:bg-gray-50"
        >
          清除
        </button>
        <button
          onClick={onSubmit}
          className="rounded-xl bg-[#E9A368] px-8 py-2 font-bold text-white shadow-[0_4px_0_#b5622a] hover:bg-[#d4884d] active:translate-y-1 active:shadow-none"
        >
          提交
        </button>
      </div>
    </div>
  );
};

export default BuzzerAnswerPanel;
