'use client';

import { TabletopCard } from '@/components/tabletop/tabletop-card';
import { NumberCard } from '@/models/Player';

const COLOR_ORDER: Record<string, number> = {
  red: 0,
  blue: 1,
  yellow: 2,
  black: 3,
};

/** 手牌依顏色、再依數值排序，Joker 排最後 */
function sortHand(hand: NumberCard[]): NumberCard[] {
  return [...hand].sort((a, b) => {
    if (a.isJoker !== b.isJoker) return a.isJoker ? 1 : -1;
    const byColor =
      (COLOR_ORDER[a.color ?? ''] ?? 4) - (COLOR_ORDER[b.color ?? ''] ?? 4);
    return byColor !== 0 ? byColor : a.value - b.value;
  });
}

type TabletopHandProps = {
  hand: NumberCard[];
  disabled: boolean;
  onPick: (card: NumberCard) => void;
};

export function TabletopHand({ hand, disabled, onPick }: TabletopHandProps) {
  return (
    <section aria-label="手牌" className="flex w-full flex-col gap-1.5">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black text-foreground">手牌</h2>
        <span className="text-xs text-muted-foreground">{hand.length} 張</span>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {sortHand(hand).map(card => (
          <TabletopCard
            key={card.id}
            card={card}
            disabled={disabled}
            onClick={() => onPick(card)}
          />
        ))}
      </div>
    </section>
  );
}
