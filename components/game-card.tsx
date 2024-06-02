import { Card } from './ui/card';

type GameCardProps = {
  selectedCardIndex: number;
  value: number;
  onSelect: () => void;
};

const GameCard = ({ selectedCardIndex, value, onSelect }: GameCardProps) => {
  return (
    <div className="relative">
      <Card
        onClick={onSelect}
        className="flex aspect-[5/7.19] max-h-full min-h-[120px] cursor-pointer items-center justify-center bg-gray-200 text-4xl transition-all hover:bg-gray-300"
      >
        {value}
      </Card>
      {selectedCardIndex !== -1 && (
        <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white">
          {selectedCardIndex + 1}
        </div>
      )}
    </div>
  );
};

export default GameCard;
