import Image from 'next/image';
import { Symbol } from '@/models/Symbol';
import { Card } from './ui/card';

type SymbolsProps = {
  onClick: (symbol: Symbol) => void;
};

const Symbols = ({ onClick }: SymbolsProps) => {
  return (
    <>
      <Card
        className="cursor-pointer bg-gray-200 p-2 transition-all hover:bg-gray-300"
        onClick={() => onClick(Symbol.Plus)}
      >
        <Image src="/plus.svg" alt="plus" width={40} height={40} priority />
      </Card>
      <Card
        className="cursor-pointer bg-gray-200 p-2 transition-all hover:bg-gray-300"
        onClick={() => onClick(Symbol.Minus)}
      >
        <Image src="/minus.svg" alt="minus" width={40} height={40} priority />
      </Card>
      <Card
        className="cursor-pointer bg-gray-200 p-2 transition-all hover:bg-gray-300"
        onClick={() => onClick(Symbol.Times)}
      >
        <Image src="/times.svg" alt="times" width={40} height={40} priority />
      </Card>
      <Card
        className="cursor-pointer bg-gray-200 p-2 transition-all hover:bg-gray-300"
        onClick={() => onClick(Symbol.Divide)}
      >
        <Image src="/divide.svg" alt="divide" width={40} height={40} priority />
      </Card>
      <Card
        className="cursor-pointer bg-gray-200 p-2 transition-all hover:bg-gray-300"
        onClick={() => onClick(Symbol.LeftBracket)}
      >
        <div className="flex h-10 w-10 items-center justify-center text-2xl font-medium">
          {'('}
        </div>
      </Card>
      <Card
        className="cursor-pointer bg-gray-200 p-2 transition-all hover:bg-gray-300"
        onClick={() => onClick(Symbol.RightBracket)}
      >
        <div className="flex h-10 w-10 items-center justify-center text-2xl font-medium">
          {')'}
        </div>
      </Card>
    </>
  );
};

export default Symbols;
