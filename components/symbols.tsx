import Image from 'next/image';
import { Symbol } from '@/models/Symbol';
import { Card } from './ui/card';

type SymbolsProps = {
  onClick: (symbol: Symbol) => void;
};

const Symbols = ({ onClick }: SymbolsProps) => {
  return (
    <>
      <Card className="cursor-pointer border-2 p-3 hover:bg-slate-100">
        <Image
          onClick={() => onClick(Symbol.Plus)}
          src="/plus.svg"
          alt="plus"
          width={32}
          height={32}
          priority
        />
      </Card>
      <Card className="cursor-pointer border-2 p-3 hover:bg-slate-100">
        <Image
          onClick={() => onClick(Symbol.Minus)}
          src="/minus.svg"
          alt="minus"
          width={32}
          height={32}
          priority
        />
      </Card>
      <Card className="cursor-pointer border-2 p-3 hover:bg-slate-100">
        <Image
          onClick={() => onClick(Symbol.Times)}
          src="/times.svg"
          alt="times"
          width={32}
          height={32}
          priority
        />
      </Card>
      <Card className="cursor-pointer border-2 p-3 hover:bg-slate-100">
        <Image
          onClick={() => onClick(Symbol.Divide)}
          src="/divide.svg"
          alt="divide"
          width={32}
          height={32}
          priority
        />
      </Card>
    </>
  );
};

export default Symbols;
