import { useEffect, useState } from 'react';
import Image from 'next/image';
import { toast } from '@/components/ui/use-toast';
import { Symbol } from '@/models/Symbol';

type SelectedCard = number | Symbol;

type UseGameProps = {
  initHandCards?: number[];
};

const useGame = ({ initHandCards }: UseGameProps) => {
  const [selectedCards, setSelectedCards] = useState<SelectedCard[]>([]);
  const [handCards, setHandCards] = useState<number[]>([]);

  useEffect(() => {
    if (initHandCards) {
      setHandCards(initHandCards);
    }
  }, [initHandCards]);

  const onSelectCardOrSymbol = (val: number | Symbol) => {
    if (
      selectedCards.length === 0 &&
      typeof val !== 'number' &&
      [Symbol.Plus, Symbol.Times, Symbol.Divide, Symbol.RightBracket].includes(
        val,
      )
    ) {
      toast({ variant: 'destructive', title: '第一個符號只能用減號或左括號' });
      return;
    }
    setSelectedCards(state => [...state, val]);
  };

  const onReselect = () => {
    setSelectedCards([]);
  };

  const onSort = () => {
    setHandCards(state => state.sort());
  };

  const showCurrentSelect = () => {
    return selectedCards.map((card, index) => {
      switch (card) {
        case Symbol.Plus:
          return (
            <Image
              key={`${index}-${card}`}
              src="/plus.svg"
              alt="plus"
              width={52}
              height={52}
              priority
            />
          );
        case Symbol.Minus:
          return (
            <Image
              key={`${index}-${card}`}
              src="/minus.svg"
              alt="minus"
              width={52}
              height={52}
              priority
            />
          );
        case Symbol.Times:
          return (
            <Image
              key={`${index}-${card}`}
              src="/times.svg"
              alt="times"
              width={52}
              height={52}
              priority
            />
          );
        case Symbol.Divide:
          return (
            <Image
              key={`${index}-${card}`}
              src="/divide.svg"
              alt="divide"
              width={52}
              height={52}
              priority
            />
          );
        default:
          return (
            <span key={`${index}-${card}`} className="text-4xl">
              {card}
            </span>
          );
      }
    });
  };

  return {
    handCards,
    selectedCards,
    onSelectCardOrSymbol,
    onReselect,
    onSort,
    showCurrentSelect,
  };
};

export default useGame;
