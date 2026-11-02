'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, CircleCheck } from 'lucide-react';
import { type Solution } from '@/lib/daily-seed';
import { cn } from '@/lib/utils';

interface SolutionsPanelProps {
  round: number;
  numbers: number[];
  solutions: Solution[];
  userFormula: string;
}

const COLLAPSED_LIMIT = 5;

/** 每日挑戰完成頁的一題：標題列可展開，列出這題的解法並標出玩家自己的解法 */
export function SolutionsPanel({
  round,
  numbers,
  solutions,
  userFormula,
}: SolutionsPanelProps) {
  const reduceMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (solutions.length === 0) return null;

  const isUnique = solutions.length === 1;
  const displayedSolutions = showAll
    ? solutions
    : solutions.slice(0, COLLAPSED_LIMIT);
  const hasMore = solutions.length > COLLAPSED_LIMIT;

  return (
    <div className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex min-h-14 w-full items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-sunken"
        aria-expanded={isOpen}
      >
        <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-primary-tint px-2 text-xs font-bold text-primary-ink">
          <CircleCheck aria-hidden className="h-3.5 w-3.5" />第 {round} 題
        </span>
        <span className="flex-1 font-display text-lg font-bold text-ink">
          {numbers.join(' · ')}
        </span>
        <span className="shrink-0 text-xs text-ink-2">
          {isUnique ? '唯一解法' : `${solutions.length} 種解法`}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        >
          <ChevronDown aria-hidden className="h-5 w-5 text-ink-2" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="solutions"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <ul className="flex flex-col gap-2 px-3.5 pb-3.5">
              {displayedSolutions.map((s, i) => {
                const isUser = s.formula === userFormula;
                return (
                  <li
                    key={i}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-xl px-3 py-2.5',
                      isUser
                        ? 'border-[1.5px] border-primary bg-primary-tint'
                        : 'bg-sunken',
                    )}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="font-display text-lg font-extrabold text-ink">
                        {s.formula} = 24
                      </span>
                      {isUser && (
                        <span className="text-xs font-bold text-primary-ink">
                          你的解法
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-ink-2">
                      {s.score} 分
                    </span>
                  </li>
                );
              })}
              {hasMore && !showAll && (
                <li>
                  <button
                    type="button"
                    className="h-11 w-full rounded-xl text-sm font-bold text-primary-ink hover:bg-primary-tint"
                    onClick={() => setShowAll(true)}
                  >
                    查看全部 {solutions.length} 種解法
                  </button>
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
