import Image from 'next/image';
import { motion } from 'framer-motion';
import { fadeVariants } from '@/lib/animation-variants';
import { Symbol } from '@/models/Symbol';
import { Card } from './ui/card';

type SymbolsProps = {
  onClick: (symbol: Symbol) => void;
};

type SymbolConfig =
  | { symbol: Symbol; type: 'image'; icon: string; alt: string }
  | { symbol: Symbol; type: 'text'; text: string };

const SYMBOLS: SymbolConfig[] = [
  { symbol: Symbol.Plus, type: 'image', icon: '/plus.svg', alt: 'plus' },
  { symbol: Symbol.Minus, type: 'image', icon: '/minus.svg', alt: 'minus' },
  { symbol: Symbol.Times, type: 'image', icon: '/times.svg', alt: 'times' },
  { symbol: Symbol.Divide, type: 'image', icon: '/divide.svg', alt: 'divide' },
  { symbol: Symbol.LeftBracket, type: 'text', text: '(' },
  { symbol: Symbol.RightBracket, type: 'text', text: ')' },
];

const Symbols = ({ onClick }: SymbolsProps) => {
  return (
    <>
      {SYMBOLS.map(config => (
        <motion.div
          key={config.symbol}
          className="relative"
          variants={fadeVariants}
          initial="hidden"
          animate="show"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 1 }}
        >
          <Card
            className="cursor-pointer bg-slate-200 p-3 transition-all"
            onClick={() => onClick(config.symbol)}
          >
            {config.type === 'image' ? (
              <div className="max-md:h-4 max-md:w-4 md:h-5 md:w-5 lg:h-7 lg:w-7">
                <Image src={config.icon} alt={config.alt} fill priority />
              </div>
            ) : (
              <div className="flex items-center justify-center text-3xl font-medium max-md:h-4 max-md:w-4 max-md:text-2xl md:h-5 md:w-5 lg:h-7 lg:w-7">
                {config.text}
              </div>
            )}
          </Card>
        </motion.div>
      ))}
    </>
  );
};

export default Symbols;
