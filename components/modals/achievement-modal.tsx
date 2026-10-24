'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Lock } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  AchievementCategory,
  VISIBLE_ACHIEVEMENTS,
  useAchievementStore,
} from '@/stores/achievement-store';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

type AchievementModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const TABS: (AchievementCategory | 'all')[] = [
  'all',
  'beginner',
  'advanced',
  'challenge',
];

export function AchievementModal({ isOpen, onClose }: AchievementModalProps) {
  const t = useTranslations('Achievements');
  const tCommon = useTranslations('Common');
  const format = useFormatter();
  const {
    unlockedIds,
    unlockDates,
    totalPlays,
    consecutiveWins,
    totalScore,
    challengeBestStage,
    dailyStreak,
  } = useAchievementStore();

  const unlockedValidCount = unlockedIds.filter(id =>
    VISIBLE_ACHIEVEMENTS.some(a => a.id === id),
  ).length;
  const [activeTab, setActiveTab] = useState<AchievementCategory | 'all'>(
    'all',
  );

  const progressValues: Record<string, number> = {
    totalPlays,
    consecutiveWins,
    totalScore,
    challengeBestStage,
    dailyStreak,
  };

  const filtered =
    activeTab === 'all'
      ? VISIBLE_ACHIEVEMENTS
      : VISIBLE_ACHIEVEMENTS.filter(a => a.category === activeTab);

  return (
    <Dialog open={isOpen} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-400" />
              {t('title')}
            </div>
            <span className="text-sm font-normal text-muted-foreground">
              {t('unlockedCount', {
                unlocked: unlockedValidCount,
                total: VISIBLE_ACHIEVEMENTS.length,
              })}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* 分類 Tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                activeTab === tab
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t(`tabs.${tab}`)}
            </button>
          ))}
        </div>

        {/* 成就列表 */}
        <div className="flex max-h-[380px] flex-col gap-2 overflow-y-auto py-1 pr-1">
          {filtered.map(achievement => {
            const isUnlocked = unlockedIds.includes(achievement.id);
            const unlockTs = unlockDates[achievement.id];
            const hasProgress =
              !isUnlocked &&
              achievement.progressKey !== undefined &&
              achievement.progressTarget !== undefined;
            const progress = achievement.progressKey
              ? Math.min(
                  progressValues[achievement.progressKey] ?? 0,
                  achievement.progressTarget!,
                )
              : 0;
            const pct = achievement.progressTarget
              ? Math.round((progress / achievement.progressTarget) * 100)
              : 0;

            return (
              <motion.div
                key={achievement.id}
                animate={isUnlocked ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  'rounded-lg border p-3 transition-colors',
                  isUnlocked
                    ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/30'
                    : 'border-transparent bg-muted/50 opacity-70',
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                      isUnlocked
                        ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {isUnlocked ? (
                      <Award className="h-4 w-4" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          !isUnlocked && 'text-muted-foreground',
                        )}
                      >
                        {t(`items.${achievement.id}.name`)}
                      </span>
                      {isUnlocked && unlockTs && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {format.dateTime(new Date(unlockTs), {
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {t(`items.${achievement.id}.description`)}
                    </span>
                    {/* 進度條 */}
                    {(hasProgress ||
                      (isUnlocked && achievement.progressTarget)) && (
                      <div className="mt-2">
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                          <span>
                            {isUnlocked ? achievement.progressTarget : progress}{' '}
                            / {achievement.progressTarget}
                          </span>
                          <span>{isUnlocked ? 100 : pct}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <motion.div
                            className={cn(
                              'h-full rounded-full',
                              isUnlocked ? 'bg-yellow-400' : 'bg-primary',
                            )}
                            initial={{ width: 0 }}
                            animate={{
                              width: `${isUnlocked ? 100 : pct}%`,
                            }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <Button variant="outline" onClick={onClose}>
          {tCommon('close')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
