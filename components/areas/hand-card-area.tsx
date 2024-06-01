import { Card } from '@/models/Player';
import GameCard from '../game-card';

type HandCardAreaProps = {
  handCards?: Card[];
  onSelect: (card: Card) => void;
};

const HandCardArea = ({ handCards = [], onSelect }: HandCardAreaProps) => {
  return (
    <div className="flex flex-1 items-center justify-center gap-4">
      {handCards.map((card, index) => (
        <GameCard
          key={`${index}-${card}`}
          value={card.value}
          onSelect={() => onSelect(card)}
        />
      ))}
    </div>
  );
};

export default HandCardArea;
