import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';
import { fadeVariants } from '@/lib/animation-variants';
import { NumberCard } from '@/models/Player';
import { MAX_FORMULAS_NUMBER_COUNT } from '@/models/Room';
import { Symbol } from '@/models/Symbol';

export type SelectedCard = {
  number?: NumberCard;
  symbol?: Symbol;
};

const useGame = () => {
  const [selectedCards, setSelectedCards] = useState<SelectedCard[]>([]);

  const onSelectCardOrSymbol = ({
    number,
    symbol,
  }: {
    number?: NumberCard;
    symbol?: Symbol;
  }) => {
    if (
      selectedCards.length === 0 &&
      symbol &&
      [Symbol.Plus, Symbol.Times, Symbol.Divide, Symbol.RightBracket].includes(
        symbol,
      )
    ) {
      toast({ variant: 'destructive', title: '第一個符號只能用減號或左括號' });
      return;
    }

    if (number) {
      const currentSelect = selectedCards[selectedCards.length - 1];
      const currentSelectedNumbers = selectedCards.filter(c => c.number);

      // 如果前一個是數字則不能選
      if (currentSelect?.number && currentSelect?.number.id !== number.id) {
        toast({ title: '數字牌不能連續使用', className: 'bg-amber-300' });
        return;
      }

      // 如果前一個是數字則不能選
      if (currentSelectedNumbers.length === MAX_FORMULAS_NUMBER_COUNT) {
        toast({
          title: `數字牌最多 ${MAX_FORMULAS_NUMBER_COUNT} 張`,
          className: 'bg-amber-300',
        });
        return;
      }

      setSelectedCards(state => {
        const isExist = state.find(c => c.number?.id === number.id);
        if (isExist) {
          return state.filter(c => c.number?.id !== number.id);
        }
        return [...state, { number }];
      });
    }
    if (symbol) {
      setSelectedCards(state => [...state, { symbol }]);
    }
  };

  const onReselect = () => {
    setSelectedCards([]);
  };

  const showCurrentSelect = () => {
    return selectedCards.map((card, index) => {
      if (card.symbol) {
        switch (card.symbol) {
          case Symbol.Plus:
            return (
              <motion.span
                key={`${index}-${card}`}
                variants={fadeVariants}
                initial="hidden"
                animate="show"
              >
                <Image
                  src="/plus.svg"
                  alt="plus"
                  width={52}
                  height={52}
                  priority
                />
              </motion.span>
            );
          case Symbol.Minus:
            return (
              <motion.span
                key={`${index}-${card}`}
                variants={fadeVariants}
                initial="hidden"
                animate="show"
              >
                <Image
                  src="/minus.svg"
                  alt="minus"
                  width={52}
                  height={52}
                  priority
                />
              </motion.span>
            );
          case Symbol.Times:
            return (
              <motion.span
                key={`${index}-${card}`}
                variants={fadeVariants}
                initial="hidden"
                animate="show"
              >
                <Image
                  src="/times.svg"
                  alt="times"
                  width={52}
                  height={52}
                  priority
                />
              </motion.span>
            );
          case Symbol.Divide:
            return (
              <motion.span
                key={`${index}-${card}`}
                variants={fadeVariants}
                initial="hidden"
                animate="show"
              >
                <Image
                  src="/divide.svg"
                  alt="divide"
                  width={52}
                  height={52}
                  priority
                />
              </motion.span>
            );
          case Symbol.LeftBracket:
          case Symbol.RightBracket:
            return (
              <motion.span
                key={`${index}-${card}`}
                className="text-4xl"
                variants={fadeVariants}
                initial="hidden"
                animate="show"
              >
                {card.symbol}
              </motion.span>
            );
          default:
            return '';
        }
      } else {
        return (
          <motion.span
            key={`${index}-${card}`}
            className="text-4xl"
            style={{ marginTop: '2px' }}
            variants={fadeVariants}
            initial="hidden"
            animate="show"
          >
            {card.number?.value}
          </motion.span>
        );
      }
    });
  };

  return {
    // handCards,
    selectedCards,
    onSelectCardOrSymbol,
    onReselect,
    showCurrentSelect,
  };
};

export default useGame;
