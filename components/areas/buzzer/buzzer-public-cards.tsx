'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { NumberCard } from '@/models/Player';

type BuzzerPublicCardsProps = {
  cards: NumberCard[];
  isBuzzerOpen: boolean;
};

const CARD_TILTS = [-2.5, 1.5, -1.2, 2.0];

const BuzzerPublicCards = ({ cards, isBuzzerOpen }: BuzzerPublicCardsProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {/* 搶答開始 banner */}
      <AnimatePresence>
        {isBuzzerOpen && (
          <motion.div
            key="buzzer-open"
            initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          >
            <div className="rounded-full bg-amber-400 px-6 py-2 font-display text-base font-black text-white shadow-[0_4px_0_0_#d97706]">
              搶答開始！
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards */}
      <div className="flex gap-2 md:gap-4">
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={reduceMotion ? false : { rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1, rotate: CARD_TILTS[index] ?? 0 }}
            transition={{
              delay: index * 0.1,
              duration: 0.35,
              ease: 'easeOut',
            }}
            className="flex h-20 w-14 items-center justify-center rounded-2xl border-2 border-zinc-200 bg-white font-display font-black text-4xl text-zinc-800 shadow-[0_5px_0_0_rgba(0,0,0,0.08)] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 md:h-28 md:w-24 md:text-5xl"
            style={{ perspective: 600 }}
          >
            {card.value}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default BuzzerPublicCards;
