'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { numberCardVariants } from '@/components/game/number-card';
import { NumberCard as NumberCardModel } from '@/models/Player';

type BuzzerPublicCardsProps = {
  cards: NumberCardModel[];
};

const CARD_TILTS = [-2.5, 1.5, -1.2, 2.0];

/** 公共牌：依序翻開；reduced-motion 直接顯示、不傾斜 */
const BuzzerPublicCards = ({ cards }: BuzzerPublicCardsProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex justify-center gap-2 py-2 md:gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.id}
          initial={reduceMotion ? false : { rotateY: 90, opacity: 0 }}
          animate={{
            rotateY: 0,
            opacity: 1,
            rotate: reduceMotion ? 0 : (CARD_TILTS[index] ?? 0),
          }}
          transition={{
            delay: reduceMotion ? 0 : index * 0.1,
            duration: 0.35,
            ease: 'easeOut',
          }}
          style={{ perspective: 600 }}
          className={numberCardVariants({ state: 'static' })}
        >
          {card.value}
        </motion.div>
      ))}
    </div>
  );
};

export default BuzzerPublicCards;
