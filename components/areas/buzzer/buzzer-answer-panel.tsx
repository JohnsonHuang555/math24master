'use client';

import { useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ExpressionBar } from '@/components/game/expression-bar';
import { NumberCard as NumberCardButton } from '@/components/game/number-card';
import Symbols from '@/components/symbols';
import { Button } from '@/components/ui/button';
import { calculateAnswer } from '@/lib/utils';
import { NumberCard } from '@/models/Player';
import { SelectedCard } from '@/models/SelectedCard';
import { Symbol } from '@/models/Symbol';

type BuzzerAnswerPanelProps = {
  publicCards: NumberCard[];
  selectedCards: SelectedCard[];
  onSelectCard: (card: NumberCard) => void;
  onSelectSymbol: (symbol: Symbol) => void;
  onClear: () => void;
  onSubmit: () => void;
  isAnswerer: boolean;
};

/**
 * 搶答作答面板。作答者：選牌、符號、清除、提交；
 * 旁觀者：只看得到作答者正在組的算式
 */
const BuzzerAnswerPanel = ({
  publicCards,
  selectedCards,
  onSelectCard,
  onSelectSymbol,
  onClear,
  onSubmit,
  isAnswerer,
}: BuzzerAnswerPanelProps) => {
  const t = useTranslations('Multiplayer.buzzer');
  const tPuzzle = useTranslations('GameUI.puzzle');
  const usedOrder = new Map(
    selectedCards
      .filter(sc => sc.number !== undefined)
      .map((sc, i) => [sc.number!.id, i + 1] as const),
  );

  const liveResult = useMemo(() => {
    if (selectedCards.length === 0) return null;
    try {
      const result = calculateAnswer(selectedCards);
      if (typeof result !== 'number' || !isFinite(result)) return null;
      return Math.round(result * 1e9) / 1e9;
    } catch {
      return null;
    }
  }, [selectedCards]);

  const expression = (
    <ExpressionBar
      tokens={selectedCards}
      result={liveResult}
      isFinal={usedOrder.size === publicCards.length}
      placeholder={isAnswerer ? tPuzzle('placeholder') : t('waitingForAnswer')}
    />
  );

  if (!isAnswerer) {
    return <div className="w-full max-w-md">{expression}</div>;
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="flex justify-center gap-2">
        {publicCards.map(card => {
          const order = usedOrder.get(card.id);
          return (
            <NumberCardButton
              key={card.id}
              value={card.value}
              state={order !== undefined ? 'selected' : 'idle'}
              order={order}
              disabled={order !== undefined}
              onClick={() => onSelectCard(card)}
              data-testid="buzzer-card"
            />
          );
        })}
      </div>

      {expression}

      <div className="flex justify-center gap-2">
        <Symbols onClick={onSelectSymbol} />
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-14 w-[52px] shrink-0 rounded-xl border-line-strong bg-surface text-ink hover:bg-sunken"
          onClick={onClear}
          aria-label={tPuzzle('clear')}
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
        <Button variant="tactile" className="min-w-0 flex-1" onClick={onSubmit}>
          {tPuzzle('submit')}
        </Button>
      </div>
    </div>
  );
};

export default BuzzerAnswerPanel;
