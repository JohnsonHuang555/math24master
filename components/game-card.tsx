import { Card } from './ui/card';

type GameCardProps = {
  value: number;
};

const GameCard = ({ value }: GameCardProps) => {
  return (
    <Card className="flex aspect-[5/7.59] max-h-full min-h-[120px] items-center justify-center border-2 text-3xl">
      {value}
    </Card>
  );
};

export default GameCard;
