import Image from 'next/image';
import { Button } from '../ui/button';

type ActionAreaProps = {
  disabledActions: boolean;
  onSubmit: () => void;
  onReselect: () => void;
  onSort: () => void;
  onEndPhase: () => void;
  onBack: () => void;
  isSinglePlay: boolean;
};

const ActionArea = ({
  disabledActions,
  onSubmit,
  onReselect,
  onSort,
  onBack,
  onEndPhase,
  isSinglePlay,
}: ActionAreaProps) => {
  return (
    <div className="relative grid basis-[23%] grid-cols-2 gap-3 p-5">
      <Button
        disabled={disabledActions}
        className="absolute -top-8 left-[20px] h-10 w-[calc(100%-40px)]"
        onClick={onSubmit}
      >
        <Image
          src="/card-play.svg"
          alt="card-play"
          width={20}
          height={20}
          priority
          className="mr-2"
        />
        出牌
      </Button>
      <Button
        variant="outline"
        disabled={disabledActions}
        className="h-full"
        onClick={onEndPhase}
      >
        <Image
          src="/card-draw.svg"
          alt="card-draw"
          width={20}
          height={20}
          priority
          className="mr-2"
        />
        {isSinglePlay ? '抽牌' : '結束回合'}
      </Button>
      <Button
        disabled={disabledActions}
        variant="outline"
        className="h-full"
        onClick={onReselect}
      >
        <Image
          src="/reset.svg"
          alt="reset"
          width={24}
          height={24}
          priority
          className="mr-1"
        />
        重選
      </Button>
      <Button
        disabled={disabledActions}
        variant="outline"
        className="h-full"
        onClick={onSort}
      >
        <Image
          src="/sort.svg"
          alt="sort"
          width={28}
          height={28}
          priority
          className="mr-1"
        />
        排序
      </Button>
      <Button
        disabled={disabledActions}
        variant="outline"
        className="h-full"
        onClick={onBack}
      >
        <Image
          src="/backspace.svg"
          alt="backspace"
          width={22}
          height={22}
          priority
          className="mr-2"
        />
        倒退
      </Button>
    </div>
  );
};

export default ActionArea;
