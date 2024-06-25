import { useEffect } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import HoverTip from '../hover-tip';

type PlayerInfoAreaProps = {
  bestScore?: number;
  isLastRoundPlayer?: boolean;
  remainCards?: number;
  score?: number;
  isSinglePlay?: boolean;
};

const PlayerInfoArea = ({
  bestScore,
  isLastRoundPlayer = false,
  remainCards,
  score = 0,
  isSinglePlay,
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
      <div className="grow">
        <span className="mr-4 max-md:text-sm">
          牌庫剩餘: {remainCards || 0} 張
        </span>
        {isLastRoundPlayer && (
          <HoverTip content="最後輪到的玩家">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white">
              L
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
