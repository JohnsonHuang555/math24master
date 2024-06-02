import { SelectedCard } from '@/hooks/useGame';
import { NumberCard } from '@/models/Player';
import GameCard from '../game-card';

type HandCardAreaProps = {
  selectedCards: SelectedCard[];
  handCards?: NumberCard[];
  onSelect: (number: NumberCard) => void;
};

const HandCardArea = ({
  selectedCards,
  handCards = [],
  onSelect,
}: HandCardAreaProps) => {
  const getSelectedCardIndex = (id: string) => {
    return selectedCards
      .filter(c => c.number)
      .findIndex(c => {
        return c.number?.id === id;
      });
  };

  return (
    <div className="flex flex-1 items-center overflow-x-auto">
      <div className="m-auto flex gap-4">
        {handCards.map((card, index) => (
          <GameCard
            key={`${index}-${card}`}
            value={card.value}
            onSelect={() => onSelect(card)}
            selectedCardIndex={getSelectedCardIndex(card.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default HandCardArea;
