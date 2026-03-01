'use client';

import { useEffect, useState } from 'react';
import { BarChart2, Gamepad2, Trophy, Zap } from 'lucide-react';
import { useAchievementStore } from '@/stores/achievement-store';
import { useStatsStore } from '@/stores/stats-store';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

type StatsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function StatsModal({ isOpen, onClose }: StatsModalProps) {
  const { singlePlays, multiPlays, multiWins, totalSkips } = useStatsStore();
  const totalCorrect = useAchievementStore(state => state.totalPlays);
  const [bestScore, setBestScore] = useState<number | null>(null);

  useEffect(() => {
    const score = localStorage.getItem('bestScore');
    if (score) setBestScore(Number(score));
  }, [isOpen]);

  const multiWinRate =
    multiPlays > 0 ? Math.round((multiWins / multiPlays) * 100) : 0;

  const stats = [
    {
      icon: <Gamepad2 className="h-5 w-5 text-blue-500" />,
      label: '單人遊戲場次',
      value: singlePlays,
    },
    {
      icon: <Trophy className="h-5 w-5 text-yellow-500" />,
      label: '單人最高分',
      value: bestScore !== null ? bestScore : '—',
    },
    {
      icon: <Zap className="h-5 w-5 text-green-500" />,
      label: '累計出牌成功',
      value: totalCorrect,
    },
    {
      icon: <BarChart2 className="h-5 w-5 text-purple-500" />,
      label: '累計跳過次數',
      value: totalSkips,
    },
    // {
    //   icon: <Gamepad2 className="h-5 w-5 text-orange-500" />,
    //   label: '多人遊戲場次',
    //   value: multiPlays,
    // },
    // {
    //   icon: <Trophy className="h-5 w-5 text-red-500" />,
    //   label: '多人勝場',
    //   value: `${multiWins} 場（勝率 ${multiWinRate}%）`,
    // },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-blue-500" />
            玩家統計
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-1">
          {stats.map(stat => (
            <div
              key={stat.label}
              className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3"
            >
              <div className="flex items-center gap-2">
                {stat.icon}
                <span className="text-sm">{stat.label}</span>
              </div>
              <span className="text-sm font-semibold">{stat.value}</span>
            </div>
          ))}
        </div>
        <Button variant="outline" onClick={onClose}>
          關閉
        </Button>
      </DialogContent>
    </Dialog>
  );
}
