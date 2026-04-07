'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type Solution } from '@/lib/daily-seed';
import { cn } from '@/lib/utils';

interface SolutionsPanelProps {
  solutions: Solution[];
  userFormula: string;
}

const COLLAPSED_LIMIT = 5;

export function SolutionsPanel({
  solutions,
  userFormula,
}: SolutionsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (solutions.length === 0) return null;

  const isUnique = solutions.length === 1;
  const displayedSolutions = showAll
    ? solutions
    : solutions.slice(0, COLLAPSED_LIMIT);
  const hasMore = solutions.length > COLLAPSED_LIMIT;

  return (
    <div className="w-full max-w-sm">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50"
        aria-expanded={isOpen}
      >
        <span>
          {isUnique
            ? '🎯 今日唯一解法'
            : `今日其他解法（共 ${solutions.length} 種）`}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="solutions"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-1 rounded-lg border bg-muted/30 p-3">
              {isUnique && (
                <p className="mb-2 text-center text-xs text-muted-foreground">
                  你找到了唯一解法！
                </p>
              )}
              <ul className="space-y-1.5">
                {displayedSolutions.map((s, i) => {
                  const isUser = s.formula === userFormula;
                  return (
                    <li
                      key={i}
                      className={cn(
                        'flex items-center justify-between rounded px-2 py-1 text-sm',
                        isUser
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                          : '',
                      )}
                    >
                      <span className="font-mono">
                        {s.formula} = 24
                        {isUser && (
                          <span className="ml-1.5 text-xs font-semibold">
                            ← 你的解法
                          </span>
                        )}
                      </span>
                      <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                        {s.score} 分
                      </span>
                    </li>
                  );
                })}
              </ul>

              {hasMore && !showAll && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full text-xs"
                  onClick={() => setShowAll(true)}
                >
                  查看全部 {solutions.length} 種解法
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
