import { useEffect } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';

type PlayerInfoAreaProps = {
  remainCards?: number;
  score?: number;
};

const PlayerInfoArea = ({ remainCards, score = 0 }: PlayerInfoAreaProps) => {
  const count = useMotionValue(score);
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    animate(count, score, {
      duration: 0.3,
    });
  }, [count, score]);

  return (
    <div className="flex basis-[23%] flex-col justify-center p-5">
      <div className="grow">牌庫剩餘: {remainCards || 0}</div>
      <div className="mb-1 flex">
        <div className="mr-2 text-xl">得分: </div>
        <motion.div className="mb-1 text-xl">{rounded}</motion.div>
      </div>
      <div className="text-xl">You</div>
    </div>
  );
};

export default PlayerInfoArea;
