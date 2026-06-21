'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { NumberCard } from '@/models/Player';

type BuzzerPublicCardsProps = {
  cards: NumberCard[];
  countdownValue: number | null;
  isBuzzerOpen: boolean;
};

const BuzzerPublicCards = ({
  cards,
  countdownValue,
  isBuzzerOpen,
}: BuzzerPublicCardsProps) => {
  return (
    <div className="relative flex flex-col items-center gap-4">
      <AnimatePresence>
        {countdownValue !== null && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0, scale: 1.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/60"
          >
            <span className="text-6xl font-extrabold text-white drop-shadow-lg">
              {countdownValue}
            </span>
          </motion.div>
        )}
        {isBuzzerOpen && countdownValue === null && (
          <motion.div
            key="buzzer-open"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -top-10 z-10"
          >
            <span className="rounded-full bg-[#E9A368] px-5 py-1.5 text-lg font-bold text-white shadow-md">
              搶答開始！
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-4">
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ delay: index * 0.1, duration: 0.35, ease: 'easeOut' }}
            className="flex h-24 w-20 items-center justify-center rounded-xl border-4 border-gray-200 bg-white shadow-lg"
            style={{ perspective: 600 }}
          >
            <span className="text-4xl font-extrabold text-gray-800">
              {card.value}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default BuzzerPublicCards;
