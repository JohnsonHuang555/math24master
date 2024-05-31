import GameCard from '../game-card';

type HandCardAreaProps = {
  handCards?: number[];
  onSelect: (card: number) => void;
};

const HandCardArea = ({ handCards = [], onSelect }: HandCardAreaProps) => {
  return (
    <div className="flex flex-1 items-center justify-center gap-4">
      {handCards.map((card, index) => (
        <GameCard
          key={`${index}-${card}`}
          value={card}
          onSelect={() => onSelect(card)}
        />
      ))}
    </div>
  );
};

export default HandCardArea;
