'use client';

import { BarChart2 } from 'lucide-react';
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

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

export function StatsModal({ isOpen, onClose }: StatsModalProps) {
  const {
    singlePlays,
    multiPlays,
    multiWins,
    totalSkips,
    bestScore,
    dailyChallengeCompletes,
    fastestPlayMs,
    rummyPlays,
    rummyWins,
  } = useStatsStore();
  const totalCorrect = useAchievementStore(state => state.totalPlays);

  const multiWinRate =
    multiPlays > 0 ? `${Math.round((multiWins / multiPlays) * 100)}%` : '-';

  const fastestPlayDisplay =
    fastestPlayMs > 0 ? `${(fastestPlayMs / 1000).toFixed(1)}s` : '-';

  return (
    <Dialog open={isOpen} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-blue-500" />
            玩家統計
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-1">
          {/* 單人遊戲 */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <SectionTitle>單人遊戲</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
              <StatItem label="完成場次" value={singlePlays} />
              <StatItem label="最高分" value={bestScore || '-'} />
              <StatItem label="最快出牌" value={fastestPlayDisplay} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <StatItem label="累計出牌" value={totalCorrect} />
              <StatItem label="累計跳過" value={totalSkips} />
            </div>
          </div>

          {/* 多人遊戲 */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <SectionTitle>多人遊戲</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
              <StatItem label="完成場次" value={multiPlays} />
              <StatItem label="勝場" value={multiWins} />
              <StatItem label="勝率" value={multiWinRate} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <StatItem label="拉密場次" value={rummyPlays} />
              <StatItem label="拉密勝場" value={rummyWins} />
            </div>
          </div>

          {/* 每日挑戰 */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <SectionTitle>每日挑戰</SectionTitle>
            <div className="flex justify-center">
              <StatItem label="完成次數" value={dailyChallengeCompletes} />
            </div>
          </div>
        </div>

        <Button variant="outline" onClick={onClose}>
          關閉
        </Button>
      </DialogContent>
    </Dialog>
  );
}
