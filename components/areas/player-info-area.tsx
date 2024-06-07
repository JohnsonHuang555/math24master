import { useEffect } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import HoverTip from '../hover-tip';

type PlayerInfoAreaProps = {
  bestScore?: number;
  isLastRoundPlayer?: boolean;
  remainCards?: number;
  score?: number;
};

const PlayerInfoArea = ({
  bestScore,
  isLastRoundPlayer = false,
  remainCards,
  score = 0,
}: PlayerInfoAreaProps) => {
  const count = useMotionValue(score);
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    animate(count, score, {
      duration: 0.3,
    });
  }, [count, score]);

  return (
    <div className="flex basis-[23%] flex-col justify-center p-5">
      <div className="grow">
        <span className="mr-4">牌庫剩餘: {remainCards || 0}</span>
        {isLastRoundPlayer && (
          <HoverTip content="最後輪到的玩家">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white">
              L
            </span>
          </HoverTip>
        )}
      </div>
      {bestScore && (
        <div className="mt-2 text-sm text-red-500">最佳分數: {bestScore}</div>
      )}
      <div className="flex">
        <div className="mr-2 text-lg">當前分數: </div>
        <motion.div className="text-xl">{rounded}</motion.div>
      </div>
      <div className="text-xl">You</div>
    </div>
  );
};

export default PlayerInfoArea;
