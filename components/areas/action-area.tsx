import { Button } from '../ui/button';

type ActionAreaProps = {
  disabledActions: boolean;
  onSubmit: () => void;
  onReselect: () => void;
  onSort: () => void;
  onEndPhase: () => void;
  isSinglePlay: boolean;
};

const ActionArea = ({
  disabledActions,
  onSubmit,
  onReselect,
  onSort,
  onEndPhase,
  isSinglePlay,
}: ActionAreaProps) => {
  return (
    <div className="grid basis-[23%] grid-cols-2 gap-3 p-5">
      <Button disabled={disabledActions} className="h-full" onClick={onSubmit}>
        出牌
      </Button>
      <Button
        disabled={disabledActions}
        variant="outline"
        className="h-full"
        onClick={onReselect}
      >
        重選
      </Button>
      <Button
        disabled={disabledActions}
        variant="outline"
        className="h-full"
        onClick={onSort}
      >
        排序
      </Button>
      <Button
        disabled={disabledActions}
        variant="outline"
        className="h-full"
        onClick={onEndPhase}
      >
        {isSinglePlay ? '抽牌' : '結束回合並抽牌'}
      </Button>
    </div>
  );
};

export default ActionArea;
