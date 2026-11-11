'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Scissors, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
  onPickLoose: (card: NumberCard) => void;
  /** 標題列右側的操作（電腦回合的「略過動畫」） */
  headerAction?: React.ReactNode;
};

export function TabletopTableArea({
  table,
  loose,
  highlightSetIds,
  canEdit,
  onBreakSet,
  onPickLoose,
  headerAction,
}: TabletopTableAreaProps) {
  const reduceMotion = useReducedMotion();
  const t = useTranslations('Tabletop');

  return (
    <section
      aria-label={t('table.label')}
      className="flex w-full flex-col gap-2"
    >
      <div className="flex min-h-9 items-center justify-between">
        <h2 className="text-[13px] font-extrabold text-ink-2">
          {t('table.count', { count: table.length })}
        </h2>
        {headerAction}
      </div>

      {table.length === 0 ? (
        // 拆開最後一組時桌面也會是空的，這時提示改由下方的散牌區負責
        loose.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line-strong px-4 py-5 text-center text-sm text-ink-2">
            {t('table.empty')}
          </p>
        )
      ) : (
        <ul className="flex max-h-[34dvh] flex-col gap-2 overflow-y-auto px-0.5 pt-2.5 pb-1 lg:grid lg:max-h-none lg:grid-cols-2 lg:gap-3">
          <AnimatePresence initial={false}>
            {table.map(set => {
              const isHighlighted = highlightSetIds.includes(set.id);
              return (
                <motion.li
                  key={set.id}
                  layout={!reduceMotion}
                  initial={reduceMotion ? false : { opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    'relative flex min-h-14 items-center gap-2 rounded-[14px] bg-surface py-1.5 pr-1 pl-2.5',
                    isHighlighted
                      ? 'border-2 border-amber shadow-[0_0_0_3px_var(--amber-tint)]'
                      : 'border border-line',
                  )}
                >
                  {/* 變動的牌組不只靠外框顏色，另外加上文字標記 */}
                  {isHighlighted && (
                    <span className="absolute -top-2.5 right-2.5 inline-flex h-5 items-center gap-1 rounded-full bg-amber px-2 text-[11px] font-bold text-on-amber">
                      <Sparkles aria-hidden className="h-3 w-3" />
                      {t('table.justChanged')}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <TabletopTiles tiles={set.tiles} />
                  </div>
                  <span className="shrink-0 font-display text-sm font-extrabold text-ink-2 tabular-nums">
                    {t('table.setScore', { score: scoreSet(set) })}
                  </span>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      className="h-11 w-11 shrink-0 gap-1 px-0 text-sm font-bold text-ink hover:bg-sunken lg:w-auto lg:border lg:border-line-strong lg:px-3"
                      onClick={() => onBreakSet(set.id)}
                      aria-label={t('table.breakUp')}
                    >
                      <Scissors className="h-[18px] w-[18px]" />
                      <span className="hidden lg:inline">
                        {t('table.breakUp')}
                      </span>
                    </Button>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      {loose.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-[14px] border-2 border-dashed border-amber bg-amber-tint px-2.5 py-2">
          <span className="shrink-0 text-[13px] font-extrabold text-amber-ink">
            {t('table.loose')}
          </span>
          {loose.map(card => (
            <TabletopCard
              key={card.id}
              card={card}
              size="sm"
              onClick={() => onPickLoose(card)}
            />
          ))}
          <span className="min-w-[140px] flex-1 text-xs leading-snug text-ink">
            {t('table.looseHint')}
          </span>
        </div>
      )}
    </section>
  );
}
