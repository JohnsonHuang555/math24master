'use client';

import { TabletopCard } from '@/components/tabletop/tabletop-card';
import { TabletopOperator, TabletopTile } from '@/models/Tabletop';

export const OPERATOR_LABEL: Record<TabletopOperator, string> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
};

/** 一列算式：數字牌用小牌面，運算符號與括號用文字 */
export function TabletopTiles({ tiles }: { tiles: TabletopTile[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {tiles.map((tile, i) =>
        tile.type === 'number' ? (
          <TabletopCard key={tile.card.id} card={tile.card} size="sm" />
        ) : (
          <span
            key={`${tile.type}-${i}`}
            className="px-0.5 font-display text-lg font-bold text-muted-foreground"
          >
            {tile.type === 'operator' ? OPERATOR_LABEL[tile.op] : tile.bracket}
          </span>
        ),
      )}
    </div>
  );
}
