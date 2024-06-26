import Image from 'next/image';
import { calculateAnswer } from '@/lib/utils';
import { SelectedCard } from '@/models/SelectedCard';
import { Button } from '../ui/button';

type ActionAreaProps = {
  disabledActions: boolean;
  onSubmit: () => void;
  onReselect: () => void;
  onSort: () => void;
  onEndPhase: () => void;
  onBack: () => void;
  isSinglePlay: boolean;
  selectedCards?: SelectedCard[];
  isLastRound: boolean;
};

const ActionArea = ({
  disabledActions,
  onSubmit,
  onReselect,
  onSort,
  onBack,
  onEndPhase,
  isSinglePlay,
  selectedCards = [],
  isLastRound,
}: ActionAreaProps) => {
  // mobile only
  const getCurrentAnswer = () => {
    try {
      const answer = calculateAnswer(selectedCards);
      return answer;
    } catch (error) {
      return '?';
    }
  };

  return (
    <div className="relative grid basis-[23%] grid-cols-2 gap-3 p-5 max-md:absolute max-md:-top-[170px] max-md:right-0 max-md:w-[55%]">
      <div className="absolute -top-[72px] right-[20px] text-2xl max-md:hidden lg:hidden">
        = {selectedCards.length === 0 ? '24' : getCurrentAnswer()}
      </div>
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
        {isLastRound ? '結算分數' : isSinglePlay ? '抽牌' : '結束回合'}
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
        清除
      </Button>
      <Button variant="outline" className="h-full" onClick={onSort}>
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
