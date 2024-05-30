import GameCard from '../game-card';

type HandCardAreaProps = {
  handCards: [];
  onSelect: () => void;
};

const HandCardArea = ({ onSelect }: HandCardAreaProps) => {
  return (
    <div className="flex flex-1 items-center justify-center gap-4">
      <GameCard value={1} />
      <GameCard value={8} />
      <GameCard value={1} />
      <GameCard value={1} />
      <GameCard value={5} />
      <GameCard value={1} />
      <GameCard value={3} />
      <GameCard value={1} />
    </div>
  );
};

export default HandCardArea;
