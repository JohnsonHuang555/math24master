'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { NumberCard } from '@/models/Player';

const COLOR_CLASSES: Record<string, string> = {
  red: 'bg-red-100 border-red-400 text-red-700',
  blue: 'bg-blue-100 border-blue-400 text-blue-700',
  yellow: 'bg-yellow-100 border-yellow-400 text-yellow-700',
  black: 'bg-gray-200 border-gray-600 text-gray-800',
};

type RummyHandAreaProps = {
  handCard: NumberCard[];
  /** 已放入 workingBoard 的牌 id 集合（ghost 顯示） */
  usedCardIds: Set<string>;
  onSelectCard: (card: NumberCard) => void;
  colorRule?: 'none' | 'standard';
};

const COLOR_ORDER: Record<string, number> = {
  red: 0,
  blue: 1,
  yellow: 2,
  black: 3,
};

const HandCard = ({
  card,
  index,
  isUsed,
  onSelectCard,
  colorRule,
}: {
  card: NumberCard;
  index: number;
  isUsed: boolean;
  onSelectCard: (card: NumberCard) => void;
  colorRule?: 'none' | 'standard';
}) => {
  const colorClass = card.isJoker
    ? 'bg-purple-100 border-purple-400 text-purple-700'
    : colorRule === 'none'
      ? 'bg-gray-200 border-gray-600 text-gray-800'
      : card.color
        ? COLOR_CLASSES[card.color]
        : 'bg-white border-gray-300 text-gray-700';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isUsed ? 0.3 : 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={!isUsed ? { scale: 1.1 } : {}}
      whileTap={!isUsed ? { scale: 0.95 } : {}}
      className={cn(
        'flex h-14 w-10 cursor-pointer select-none flex-col items-center justify-center rounded-lg border-2 text-sm font-bold shadow-sm',
        colorClass,
        isUsed && 'cursor-not-allowed',
      )}
      onClick={() => {
        if (!isUsed) onSelectCard(card);
      }}
    >
      {card.isJoker ? (
        <span className="text-xs">Joker</span>
      ) : (
        <span>{card.value}</span>
      )}
      {card.color && !card.isJoker && colorRule !== 'none' && (
        <span className="text-[8px] uppercase">{card.color[0]}</span>
      )}
    </motion.div>
  );
};

const RummyHandArea = ({
  handCard,
  usedCardIds,
  onSelectCard,
  colorRule,
}: RummyHandAreaProps) => {
  const sortedCards = [...handCard].sort((a, b) => {
    if (a.isJoker && b.isJoker) return 0;
    if (a.isJoker) return 1;
    if (b.isJoker) return -1;
    const ca = COLOR_ORDER[a.color ?? ''] ?? 4;
    const cb = COLOR_ORDER[b.color ?? ''] ?? 4;
    if (ca !== cb) return ca - cb;
    return a.value - b.value;
  });

  const cols = Math.ceil(sortedCards.length / 2);

  return (
    <div className="w-full overflow-x-auto py-2 max-h-[130px]">
      <div
        className="mx-auto flex gap-2 flex-wrap"
      >
        {sortedCards.map((card, index) => (
          <HandCard
            key={card.id}
            card={card}
            index={index}
            isUsed={usedCardIds.has(card.id)}
            onSelectCard={onSelectCard}
            colorRule={colorRule}
          />
        ))}
      </div>
    </div>
  );
};

export default RummyHandArea;
