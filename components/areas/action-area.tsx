import { Button } from '../ui/button';

type ActionAreaProps = {
  onSubmit: () => void;
  onReselect: () => void;
  onSort: () => void;
  onEndPhase: () => void;
};

const ActionArea = ({
  onSubmit,
  onReselect,
  onSort,
  onEndPhase,
}: ActionAreaProps) => {
  return (
    <div className="grid basis-1/5 grid-cols-2 gap-2 p-5">
      <Button variant="secondary" className="h-full" onClick={onReselect}>
        重選
      </Button>
      <Button className="h-full" onClick={onSubmit}>
        出牌
      </Button>
      <Button variant="secondary" className="h-full" onClick={onSort}>
        排序
      </Button>
      <Button variant="destructive" className="h-full" onClick={onEndPhase}>
        結束回合
      </Button>
    </div>
  );
};

export default ActionArea;
