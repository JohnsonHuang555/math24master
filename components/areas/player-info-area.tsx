import { useEffect } from 'react';
import Image from 'next/image';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import HoverTip from '../hover-tip';

type PlayerInfoAreaProps = {
  bestScore?: number;
  isLastRoundPlayer?: boolean;
  remainCards?: number;
  score?: number;
  isSinglePlay?: boolean;
  isYourTurn?: boolean;
};

const PlayerInfoArea = ({
  bestScore,
  isLastRoundPlayer = false,
  remainCards,
  score = 0,
  isSinglePlay,
  isYourTurn,
}: PlayerInfoAreaProps) => {
  const count = useMotionValue(score);
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    animate(count, score, {
      duration: 0.3,
    });
  }, [count, score]);

  return (
    <div className="flex basis-[23%] flex-col justify-center p-5 max-md:absolute max-md:-top-[180px]">
      {isYourTurn && (
        <div className="flex items-center">
          <Image
            src="/triangle-right.svg"
            alt="triangle-right"
            width={16}
            height={16}
            priority
          />
          <div className="mb-[1px] ml-1 text-base text-red-600 max-md:text-sm">
            你的回合
          </div>
        </div>
      )}
      <div className="grow">
        <span className="mr-4 max-md:mr-2 max-md:text-sm">
          牌庫剩餘: {remainCards || 0} 張
        </span>
        {isLastRoundPlayer && (
          <HoverTip content="最後輪到的玩家">
            <span className="flex h-5 w-9 items-center justify-center rounded-full bg-red-600 text-white max-sm:h-4 max-sm:w-8 max-sm:text-xs">
              終回
            </span>
          </HoverTip>
        )}
      </div>
      {bestScore && (
        <div className="mt-2 text-sm text-red-600">最佳分數: {bestScore}</div>
      )}
      <div className="flex">
        <div className="mr-2 text-lg max-md:text-base">當前得分: </div>
        <motion.div className="text-xl max-md:text-base">{rounded}</motion.div>
      </div>
      {!isSinglePlay && <div className="text-xl max-md:text-base">你</div>}
    </div>
  );
};

export default PlayerInfoArea;
