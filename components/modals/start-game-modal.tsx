'use client';

import { cn } from '@/lib/utils';
import { Difficulty } from '@/models/Room';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type PlayMode = 'classic' | 'normal' | 'challenge';

const MODE_LABELS: Record<PlayMode, string> = {
  classic: '經典模式',
  normal: '關卡模式',
  challenge: '挑戰模式',
};

const DIFFICULTY_OPTIONS = [
  {
    value: Difficulty.Easy,
    label: '簡單',
    description: '牌值 1-6',
    color: 'border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950',
    activeColor: 'bg-green-500 text-white hover:bg-green-600',
  },
  {
    value: Difficulty.Normal,
    label: '普通',
    description: '牌值 1-10',
    color: 'border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950',
    activeColor: 'bg-blue-500 text-white hover:bg-blue-600',
  },
  {
    value: Difficulty.Hard,
    label: '困難',
    description: '牌值 1-13',
    color: 'border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950',
    activeColor: 'bg-red-500 text-white hover:bg-red-600',
  },
] as const;

interface StartGameModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMode: PlayMode;
  selectedDifficulty: Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
  onConfirm: () => void;
}

export function StartGameModal({
  isOpen,
  onOpenChange,
  selectedMode,
  selectedDifficulty,
  onDifficultyChange,
  onConfirm,
}: StartGameModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{MODE_LABELS[selectedMode]}</DialogTitle>
        </DialogHeader>

        {selectedMode === 'classic' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              自選難度，累積最高分
            </p>
            <div className="flex flex-col gap-2">
              {DIFFICULTY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={cn(
                    'rounded-xl border-2 px-4 py-3 text-left transition-all',
                    opt.color,
                    selectedDifficulty === opt.value && opt.activeColor,
                  )}
                  onClick={() => onDifficultyChange(opt.value)}
                >
                  <div className="font-bold">{opt.label}</div>
                  <div
                    className={cn(
                      'text-sm',
                      selectedDifficulty === opt.value
                        ? 'text-white/80'
                        : 'text-muted-foreground',
                    )}
                  >
                    {opt.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedMode === 'normal' && (
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <p>共 10 題，全部答對計時結束</p>
            <p>答錯 +10 秒懲罰・符號越難分數越高</p>
          </div>
        )}

        {selectedMode === 'challenge' && (
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <p>倒數 5 分鐘，答對加 1 分鐘</p>
            <p>跳過不加時・撐越多關越好</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={onConfirm}>開始遊戲</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
