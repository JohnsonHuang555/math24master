import Image from 'next/image';
import { motion } from 'framer-motion';
import { fadeVariants } from '@/lib/animation-variants';
import { Symbol } from '@/models/Symbol';
import { Card } from './ui/card';

type SymbolsProps = {
  onClick: (symbol: Symbol) => void;
};

const Symbols = ({ onClick }: SymbolsProps) => {
  return (
    <>
      <motion.div
        className="relative"
        variants={fadeVariants}
        initial="hidden"
        animate="show"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 1 }}
      >
        <Card
          className="relative cursor-pointer bg-slate-200 p-3 transition-all"
          onClick={() => onClick(Symbol.Plus)}
        >
          <div className="max-sm:h-4 max-sm:w-4 md:h-5 md:w-5 lg:h-7 lg:w-7">
            <Image src="/plus.svg" alt="plus" fill priority />
          </div>
        </Card>
      </motion.div>
      <motion.div
        className="relative"
        variants={fadeVariants}
        initial="hidden"
        animate="show"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 1 }}
      >
        <Card
          className="cursor-pointer bg-slate-200 p-3 transition-all"
          onClick={() => onClick(Symbol.Minus)}
        >
          <div className="max-sm:h-4 max-sm:w-4 md:h-5 md:w-5 lg:h-7 lg:w-7">
            <Image src="/minus.svg" alt="minus" fill priority />
          </div>
        </Card>
      </motion.div>
      <motion.div
        className="relative"
        variants={fadeVariants}
        initial="hidden"
        animate="show"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 1 }}
      >
        <Card
          className="cursor-pointer bg-slate-200 p-3 transition-all"
          onClick={() => onClick(Symbol.Times)}
        >
          <div className="max-sm:h-4 max-sm:w-4 md:h-5 md:w-5 lg:h-7 lg:w-7">
            <Image src="/times.svg" alt="times" fill priority />
          </div>
        </Card>
      </motion.div>
      <motion.div
        className="relative"
        variants={fadeVariants}
        initial="hidden"
        animate="show"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 1 }}
      >
        <Card
          className="cursor-pointer bg-slate-200 p-3 transition-all"
          onClick={() => onClick(Symbol.Divide)}
        >
          <div className="max-sm:h-4 max-sm:w-4 md:h-5 md:w-5 lg:h-7 lg:w-7">
            <Image src="/divide.svg" alt="divide" fill priority />
          </div>
        </Card>
      </motion.div>
      <motion.div
        className="relative"
        variants={fadeVariants}
        initial="hidden"
        animate="show"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 1 }}
      >
        <Card
          className="cursor-pointer bg-slate-200 p-3 transition-all"
          onClick={() => onClick(Symbol.LeftBracket)}
        >
          <div className="flex items-center justify-center text-3xl font-medium max-sm:h-4 max-sm:w-4 max-sm:text-2xl md:h-5 md:w-5 lg:h-7 lg:w-7">
            {'('}
          </div>
        </Card>
      </motion.div>
      <motion.div
        className="relative"
        variants={fadeVariants}
        initial="hidden"
        animate="show"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 1 }}
      >
        <Card
          className="cursor-pointer bg-slate-200 p-3 transition-all"
          onClick={() => onClick(Symbol.RightBracket)}
        >
          <div className="flex items-center justify-center text-3xl font-medium max-sm:h-4 max-sm:w-4 max-sm:text-2xl md:h-5 md:w-5 lg:h-7 lg:w-7">
            {')'}
          </div>
        </Card>
      </motion.div>
    </>
  );
};

export default Symbols;
