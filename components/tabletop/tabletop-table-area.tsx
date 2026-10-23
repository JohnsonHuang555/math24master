'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Scissors } from 'lucide-react';
import { TabletopCard } from '@/components/tabletop/tabletop-card';
import { TabletopTiles } from '@/components/tabletop/tabletop-tiles';
import { Button } from '@/components/ui/button';
import { scoreSet } from '@/lib/tabletop-engine';
import { cn } from '@/lib/utils';
import { NumberCard } from '@/models/Player';
import { TabletopSet } from '@/models/Tabletop';

type TabletopTableAreaProps = {
  table: TabletopSet[];
  loose: NumberCard[];
  highlightSetIds: string[];
  canEdit: boolean;
  onBreakSet: (setId: string) => void;
  onPickLoose: (cardId: string) => void;
};

export function TabletopTableArea({
  table,
  loose,
  highlightSetIds,
  canEdit,
  onBreakSet,
  onPickLoose,
}: TabletopTableAreaProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-label="桌面"
      className="flex w-full flex-col gap-2 rounded-2xl border-2 border-zinc-200 bg-white/60 p-3 backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/40"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-foreground">桌面</h2>
        <span className="text-xs text-muted-foreground">
          {table.length} 組牌組
        </span>
      </div>

      {table.length === 0 ? (
        // 拆開最後一組時桌面也會是空的，這時提示改由下方的散牌區負責
        loose.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            桌面還是空的，用手牌組出第一組吧
          </p>
        )
      ) : (
        <ul className="flex max-h-[34dvh] flex-col gap-1.5 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {table.map((set, i) => (
              <motion.li
                key={set.id}
                layout={!reduceMotion}
                initial={reduceMotion ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                className={cn(
                  'flex items-center gap-2 rounded-2xl border-2 bg-white px-2 py-1.5 dark:bg-zinc-800/80',
                  highlightSetIds.includes(set.id)
                    ? 'border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/20'
                    : 'border-zinc-100 dark:border-zinc-700',
                )}
              >
                <span className="w-5 shrink-0 text-center font-display text-xs font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <TabletopTiles tiles={set.tiles} />
                </div>
                <span className="shrink-0 font-display text-xs font-bold text-muted-foreground tabular-nums">
                  {scoreSet(set)} 分
                </span>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0 gap-1 px-2 text-xs font-bold text-muted-foreground hover:text-foreground"
                    onClick={() => onBreakSet(set.id)}
                  >
                    <Scissors className="h-3.5 w-3.5" />
                    拆開
                  </Button>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {loose.length > 0 && (
        <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-2 dark:border-amber-700 dark:bg-amber-900/10">
          <p className="mb-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
            散牌區：要全部放回牌組才能結束回合
          </p>
          <div className="flex flex-wrap gap-1.5">
            {loose.map(card => (
              <TabletopCard
                key={card.id}
                card={card}
                size="sm"
                onClick={() => onPickLoose(card.id)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
