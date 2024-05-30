import { Card } from './ui/card';

type GameCardProps = {
  value: number;
  onSelect: () => void;
};

const GameCard = ({ value, onSelect }: GameCardProps) => {
  return (
    <Card
      onClick={onSelect}
      className="flex aspect-[5/7.19] max-h-full min-h-[120px] cursor-pointer items-center justify-center border-2 text-4xl hover:bg-slate-100"
    >
      {value}
    </Card>
  );
};

export default GameCard;
