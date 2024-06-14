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
          className="cursor-pointer bg-slate-200 p-2 transition-all"
          onClick={() => onClick(Symbol.Plus)}
        >
          <Image src="/plus.svg" alt="plus" width={40} height={40} priority />
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
          className="cursor-pointer bg-slate-200 p-2 transition-all"
          onClick={() => onClick(Symbol.Minus)}
        >
          <Image src="/minus.svg" alt="minus" width={40} height={40} priority />
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
          className="cursor-pointer bg-slate-200 p-2 transition-all"
          onClick={() => onClick(Symbol.Times)}
        >
          <Image src="/times.svg" alt="times" width={40} height={40} priority />
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
          className="cursor-pointer bg-slate-200 p-2 transition-all"
          onClick={() => onClick(Symbol.Divide)}
        >
          <Image
            src="/divide.svg"
            alt="divide"
            width={40}
            height={40}
            priority
          />
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
          className="cursor-pointer bg-slate-200 p-2 transition-all"
          onClick={() => onClick(Symbol.LeftBracket)}
        >
          <div className="flex h-10 w-10 items-center justify-center text-2xl font-medium">
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
          className="cursor-pointer bg-slate-200 p-2 transition-all"
          onClick={() => onClick(Symbol.RightBracket)}
        >
          <div className="flex h-10 w-10 items-center justify-center text-2xl font-medium">
            {')'}
          </div>
        </Card>
      </motion.div>
    </>
  );
};

export default Symbols;
