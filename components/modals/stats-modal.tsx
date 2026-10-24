'use client';

import { Award, BarChart2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatTimePrecise } from '@/lib/utils';
import {
  VISIBLE_ACHIEVEMENTS,
  useAchievementStore,
} from '@/stores/achievement-store';
import { useStatsStore } from '@/stores/stats-store';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

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
  const t = useTranslations('Stats');
  const tCommon = useTranslations('Common');
  const {
    classicPlays,
    classicBestScore,
    classicFastestPlayMs,
    classicTotalSkips,
    challengePlays,
    challengeBestStage,
    matchPlays,
    matchBestScore,
    dailyChallengeCompletes,
    quickMathPlays,
    quickMathBestSeconds,
    quickMathAdvancedPlays,
    quickMathAdvancedBestSeconds,
  } = useStatsStore();
  const unlockedIds = useAchievementStore(state => state.unlockedIds);

  const unlockedValidCount = unlockedIds.filter(id =>
    VISIBLE_ACHIEVEMENTS.some(a => a.id === id),
  ).length;

  const fastestPlayDisplay =
    classicFastestPlayMs > 0
      ? `${(classicFastestPlayMs / 1000).toFixed(1)}s`
      : '-';

  return (
    <Dialog open={isOpen} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-blue-500" />
            {t('title')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* 經典模式 */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <SectionTitle>{t('classic')}</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <StatItem label={t('plays')} value={classicPlays} />
              <StatItem label={t('bestScore')} value={classicBestScore || '-'} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 opacity-70">
              <StatItem label={t('fastestPlay')} value={fastestPlayDisplay} />
              <StatItem label={t('totalSkips')} value={classicTotalSkips} />
            </div>
          </div>

          {/* 挑戰模式 + 每日挑戰 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <SectionTitle>{t('challenge')}</SectionTitle>
              <div className="flex flex-col gap-3">
                <StatItem label={t('plays')} value={challengePlays} />
                <StatItem
                  label={t('bestStage')}
                  value={challengeBestStage || '-'}
                />
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <SectionTitle>{t('daily')}</SectionTitle>
              <div className="flex justify-center">
                <StatItem
                  label={t('completions')}
                  value={dailyChallengeCompletes}
                />
              </div>
            </div>
          </div>

          {/* 消消樂模式 */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <SectionTitle>{t('match')}</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <StatItem label={t('finishedPlays')} value={matchPlays} />
              <StatItem label={t('bestScore')} value={matchBestScore || '-'} />
            </div>
          </div>

          {/* 心算快答 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <SectionTitle>{t('quickMathBasic')}</SectionTitle>
              <div className="flex flex-col gap-3">
                <StatItem label={t('finishedPlays')} value={quickMathPlays} />
                <StatItem
                  label={t('fastestFinish')}
                  value={
                    quickMathBestSeconds > 0
                      ? formatTimePrecise(quickMathBestSeconds)
                      : '-'
                  }
                />
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <SectionTitle>{t('quickMathAdvanced')}</SectionTitle>
              <div className="flex flex-col gap-3">
                <StatItem
                  label={t('finishedPlays')}
                  value={quickMathAdvancedPlays}
                />
                <StatItem
                  label={t('fastestFinish')}
                  value={
                    quickMathAdvancedBestSeconds > 0
                      ? formatTimePrecise(quickMathAdvancedBestSeconds)
                      : '-'
                  }
                />
              </div>
            </div>
          </div>

          {/* 成就解鎖進度 */}
          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <SectionTitle>{t('achievements')}</SectionTitle>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5">
                  <Award className="h-5 w-5 text-yellow-400" />
                  <span className="text-2xl font-bold tabular-nums">
                    {unlockedValidCount}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {VISIBLE_ACHIEVEMENTS.length}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-yellow-400 transition-all"
                    style={{
                      width: `${Math.round((unlockedValidCount / VISIBLE_ACHIEVEMENTS.length) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <Button variant="outline" onClick={onClose}>
          {tCommon('close')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
