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
          className="flex h-[52px] w-[52px] cursor-pointer items-center justify-center rounded-full border-2 border-zinc-200 bg-white shadow-[0_3px_0_0_rgba(0,0,0,0.08)] transition-all hover:border-primary/40 hover:bg-zinc-50 active:translate-y-0.5 active:shadow-none dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
        >
          {config.type === 'image' ? (
            <div className="relative h-7 w-7">
              <Image src={config.icon} alt={config.alt} fill priority />
            </div>
          ) : (
            <span className="font-display text-2xl">{config.text}</span>
          )}
        </motion.button>
      ))}
    </>
  );
};

export default Symbols;
