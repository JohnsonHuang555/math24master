'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Lock } from 'lucide-react';
import {
  ACHIEVEMENTS,
  AchievementCategory,
  useAchievementStore,
} from '@/stores/achievement-store';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

type AchievementModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const TABS: { key: AchievementCategory | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'beginner', label: '新手' },
  { key: 'advanced', label: '進階' },
  { key: 'challenge', label: '挑戰' },
];

export function AchievementModal({ isOpen, onClose }: AchievementModalProps) {
  const { unlockedIds, unlockDates, totalPlays, consecutiveWins, totalScore } =
    useAchievementStore();

  const unlockedValidCount = unlockedIds.filter(id =>
    ACHIEVEMENTS.some(a => a.id === id),
  ).length;
  const [activeTab, setActiveTab] = useState<AchievementCategory | 'all'>('all');

  const progressValues: Record<string, number> = {
    totalPlays,
    consecutiveWins,
    totalScore,
  };

  const filtered =
    activeTab === 'all'
      ? ACHIEVEMENTS
      : ACHIEVEMENTS.filter(a => a.category === activeTab);

  return (
    <Dialog open={isOpen} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-400" />
              成就
            </div>
            <span className="text-sm font-normal text-muted-foreground">
              已解鎖 {unlockedValidCount} / {ACHIEVEMENTS.length}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* 分類 Tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                activeTab === tab.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
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
              ? Math.min(progressValues[achievement.progressKey] ?? 0, achievement.progressTarget!)
              : 0;
            const pct = achievement.progressTarget
              ? Math.round((progress / achievement.progressTarget) * 100)
              : 0;

            return (
              <motion.div
                key={achievement.id}
                animate={
                  isUnlocked
                    ? { scale: [1, 1.03, 1] }
                    : { scale: 1 }
                }
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
                      'mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
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
                        {achievement.name}
                      </span>
                      {isUnlocked && unlockTs && (
                        <span className="flex-shrink-0 text-xs text-muted-foreground">
                          {new Date(unlockTs).toLocaleDateString('zh-TW')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {achievement.description}
                    </span>
                    {/* 進度條 */}
                    {(hasProgress || (isUnlocked && achievement.progressTarget)) && (
                      <div className="mt-2">
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                          <span>
                            {isUnlocked ? achievement.progressTarget : progress} /{' '}
                            {achievement.progressTarget}
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
          關閉
        </Button>
      </DialogContent>
    </Dialog>
  );
}
