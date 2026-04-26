'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ClassicPlayGame from '@/app/single-play/[mode]/classic-play-game';
import ChallengePlayGame from '@/app/single-play/[mode]/challenge-play-game';
import NormalPlayGame from '@/app/single-play/[mode]/normal-play-game';

type PlayMode = 'classic' | 'normal' | 'challenge';

const MODE_OPTIONS = [
  {
    value: 'classic' as const,
    label: '經典模式',
    description: '牌值 1–13・固定牌庫',
    color:
      'border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950',
    activeColor: 'bg-purple-500 text-white hover:bg-purple-600',
  },
  {
    value: 'normal' as const,
    label: '關卡模式',
    description: '10 題計時挑戰・答錯 +10 秒懲罰',
    color:
      'border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950',
    activeColor: 'bg-blue-500 text-white hover:bg-blue-600',
  },
  {
    value: 'challenge' as const,
    label: '挑戰模式',
    description: '5 分鐘倒數・答對 +1 分鐘・挑戰無限關卡',
    color:
      'border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950',
    activeColor: 'bg-orange-500 text-white hover:bg-orange-600',
  },
] as const;

export default function SinglePlayPage() {
  const [selectedMode, setSelectedMode] = useState<PlayMode>('classic');
  const [activeMode, setActiveMode] = useState<PlayMode | null>(null);
  const router = useRouter();

  if (activeMode === 'normal') {
    return <NormalPlayGame onBack={() => setActiveMode(null)} autoStart />;
  }

  if (activeMode === 'challenge') {
    return <ChallengePlayGame onBack={() => setActiveMode(null)} autoStart />;
  }

  if (activeMode === 'classic') {
    return <ClassicPlayGame onBack={() => setActiveMode(null)} autoStart />;
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold">選擇模式</h1>
        <p className="text-sm text-muted-foreground">請選擇遊戲模式後開始</p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        {MODE_OPTIONS.map(opt => (
          <div key={opt.value} className="flex flex-col gap-2">
            <button
              className={cn(
                'rounded-xl border-2 px-6 py-4 text-left transition-all',
                opt.color,
                selectedMode === opt.value && opt.activeColor,
              )}
              onClick={() => setSelectedMode(opt.value)}
            >
              <div className="text-lg font-bold">{opt.label}</div>
              <div
                className={cn(
                  'text-sm',
                  selectedMode === opt.value
                    ? 'text-white/80'
                    : 'text-muted-foreground',
                )}
              >
                {opt.description}
              </div>
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.push('/')}>
          回上一頁
        </Button>
        <Button onClick={() => setActiveMode(selectedMode)}>開始遊戲</Button>
      </div>
    </div>
  );
}
