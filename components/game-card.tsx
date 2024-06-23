import { motion } from 'framer-motion';
import { fadeVariants } from '@/lib/animation-variants';
import { Card } from './ui/card';

type GameCardProps = {
  selectedCardIndex: number;
  value: number;
  onSelect: () => void;
};

const GameCard = ({ selectedCardIndex, value, onSelect }: GameCardProps) => {
  return (
    <>
      <Card
        onClick={onSelect}
        className="flex aspect-[5/7.19] max-h-full min-h-[110px] cursor-pointer items-center justify-center bg-slate-200 text-4xl transition-all"
      >
        {value}
      </Card>
      {selectedCardIndex !== -1 && (
        <motion.div
          variants={fadeVariants}
          initial="hidden"
          animate="show"
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white"
        >
          {selectedCardIndex + 1}
        </motion.div>
      )}
    </>
  );
};

export default GameCard;
