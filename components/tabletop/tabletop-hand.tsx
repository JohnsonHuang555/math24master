'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

/**
 * 手牌固定只佔一行，放不下時左右滑動，不會因為張數多而把畫面往下推。
 * 兩側在還有牌可以滑出來時顯示漸層，提示玩家可以滑動
 */
export function TabletopHand({ hand, disabled, onPick }: TabletopHandProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState({ left: false, right: false });

  const updateFade = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setFade({
      left: el.scrollLeft > 1,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    updateFade();
    window.addEventListener('resize', updateFade);
    return () => window.removeEventListener('resize', updateFade);
  }, [hand.length, updateFade]);

  return (
    <section aria-label="手牌" className="flex w-full flex-col gap-1">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black text-foreground">手牌</h2>
        <span className="text-xs text-muted-foreground">{hand.length} 張</span>
      </div>
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={updateFade}
          className="overflow-x-auto overscroll-x-contain pt-1 pb-2"
        >
          <div className="mx-auto flex w-max gap-1.5 px-1">
            {sortHand(hand).map(card => (
              <TabletopCard
                key={card.id}
                card={card}
                disabled={disabled}
                onClick={() => onPick(card)}
              />
            ))}
          </div>
        </div>
        {fade.left && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-linear-to-r from-[#f3faf8] to-transparent dark:from-zinc-950"
          />
        )}
        {fade.right && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-[#f3faf8] to-transparent dark:from-zinc-950"
          />
        )}
      </div>
    </section>
  );
}
