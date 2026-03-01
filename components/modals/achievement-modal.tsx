'use client';

import { Award, Lock } from 'lucide-react';
import {
  ACHIEVEMENTS,
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

export function AchievementModal({ isOpen, onClose }: AchievementModalProps) {
  const unlockedIds = useAchievementStore(state => state.unlockedIds);

  return (
    <Dialog open={isOpen} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-400" />
            成就系統
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-1">
          {ACHIEVEMENTS.map(achievement => {
            const isUnlocked = unlockedIds.includes(achievement.id);
            return (
              <div
                key={achievement.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg p-3',
                  isUnlocked ? 'bg-yellow-50 dark:bg-yellow-950/30' : 'bg-muted/50 opacity-60',
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
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
                <div className="flex flex-col">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      !isUnlocked && 'text-muted-foreground',
                    )}
                  >
                    {achievement.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {achievement.description}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-center text-xs text-muted-foreground">
          已解鎖 {unlockedIds.length} / {ACHIEVEMENTS.length}
        </div>
        <Button variant="outline" onClick={onClose}>
          關閉
        </Button>
      </DialogContent>
    </Dialog>
  );
}
