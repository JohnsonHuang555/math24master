'use client';

import { BarChart2, Award } from 'lucide-react';
import {
  ACHIEVEMENTS,
  useAchievementStore,
} from '@/stores/achievement-store';
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
    classicPlays,
    classicBestScore,
    classicFastestPlayMs,
    classicTotalSkips,
    normalPlays,
    normalBestSeconds,
    normalPerfectRuns,
    challengePlays,
    challengeBestStage,
    dailyChallengeCompletes,
  } = useStatsStore();
  const unlockedIds = useAchievementStore(state => state.unlockedIds);

  const unlockedValidCount = unlockedIds.filter(id =>
    ACHIEVEMENTS.some(a => a.id === id),
  ).length;

  const fastestPlayDisplay =
    classicFastestPlayMs > 0
      ? `${(classicFastestPlayMs / 1000).toFixed(1)}s`
      : '-';

  const normalBestDisplay =
    normalBestSeconds > 0 ? `${normalBestSeconds}s` : '-';

  return (
    <Dialog open={isOpen} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-blue-500" />
            玩家統計
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* 經典模式 */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <SectionTitle>經典模式</SectionTitle>
            <div className="grid grid-cols-4 gap-3">
              <StatItem label="場次" value={classicPlays} />
              <StatItem label="最高分" value={classicBestScore || '-'} />
              <StatItem label="最快出牌" value={fastestPlayDisplay} />
              <StatItem label="累計跳過" value={classicTotalSkips} />
            </div>
          </div>

          {/* 關卡模式 + 挑戰模式 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <SectionTitle>關卡模式</SectionTitle>
              <div className="flex flex-col gap-3">
                <StatItem label="場次" value={normalPlays} />
                <StatItem label="最速完成" value={normalBestDisplay} />
                <StatItem label="零罰時次數" value={normalPerfectRuns} />
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <SectionTitle>挑戰模式</SectionTitle>
              <div className="flex flex-col gap-3">
                <StatItem label="場次" value={challengePlays} />
                <StatItem label="最高關卡" value={challengeBestStage || '-'} />
              </div>
            </div>
          </div>

          {/* 每日挑戰 + 成就解鎖進度 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <SectionTitle>每日挑戰</SectionTitle>
              <div className="flex justify-center">
                <StatItem label="完成次數" value={dailyChallengeCompletes} />
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <SectionTitle>成就解鎖</SectionTitle>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5">
                  <Award className="h-5 w-5 text-yellow-400" />
                  <span className="text-2xl font-bold tabular-nums">
                    {unlockedValidCount}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {ACHIEVEMENTS.length}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-yellow-400 transition-all"
                    style={{
                      width: `${Math.round((unlockedValidCount / ACHIEVEMENTS.length) * 100)}%`,
                    }}
                  />
                </div>
              </div>
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
