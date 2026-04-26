import Image from 'next/image';
import { motion } from 'framer-motion';
import { fadeVariants } from '@/lib/animation-variants';
import { Symbol } from '@/models/Symbol';

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
        <motion.button
          key={config.symbol}
          type="button"
          variants={fadeVariants}
          initial="hidden"
          animate="show"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => onClick(config.symbol)}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-slate-100 transition-colors hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          {config.type === 'image' ? (
            <div className="relative h-5 w-5">
              <Image src={config.icon} alt={config.alt} fill priority />
            </div>
          ) : (
            <span className="text-xl font-medium">{config.text}</span>
          )}
        </motion.button>
      ))}
    </>
  );
};

export default Symbols;
