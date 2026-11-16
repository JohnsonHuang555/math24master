'use client';

import {
  CalendarDays,
  ChevronRight,
  CircleCheck,
  RotateCcw,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { GameResultScreen } from '@/components/game/game-result-screen';
import { Button } from '@/components/ui/button';
import { useDailyStatus } from '@/hooks/useDailyStatus';
import { Link } from '@/i18n/navigation';
import { trackCtaClick } from '@/lib/analytics';
import { formatTime } from '@/lib/utils';

type QuickPlayResultProps = {
  isFirstTime: boolean;
  totalSteps: number;
  durationMs: number;
  hintsUsed: number;
  onRetry: () => void;
};

/**
 * 完成三題：題數、耗時、提示次數，接著給明確的下一步（不要求登入、不跳彈窗）。
 * 今日挑戰還沒做：主要「挑戰今日 3 題」→ 次要「再玩一次」→ 輔助「探索更多模式」。
 * 今日已完成：主要改成「再玩一次」，每日挑戰降為次要的「查看今日挑戰」
 */
export function QuickPlayResult({
  isFirstTime,
  totalSteps,
  durationMs,
  hintsUsed,
  onRetry,
}: QuickPlayResultProps) {
  const t = useTranslations('QuickPlay.result');
  // 掛載前（null）先當作還沒做，主要 CTA 導向每日挑戰；跨日會自動更新
  const dailyDone = useDailyStatus()?.doneToday ?? false;

  const retry = () => {
    trackCtaClick('quick_play_result', 'replay');
    onRetry();
  };

  const dailyLink = (
    <Link
      href="/daily-challenge?from=quick_play"
      onClick={() => trackCtaClick('quick_play_result', 'daily_challenge')}
    >
      <CalendarDays aria-hidden className="h-5 w-5" />
      {dailyDone ? t('dailyDone') : t('daily')}
    </Link>
  );

  const retryButtonContent = (
    <>
      <RotateCcw aria-hidden className="h-5 w-5" />
      {t('retry')}
    </>
  );

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <GameResultScreen
        eyebrow={
          <>
            <CircleCheck aria-hidden className="text-primary-ink" />
            {isFirstTime ? t('eyebrowFirst') : t('eyebrow')}
          </>
        }
        label={t('timeLabel')}
        value={formatTime(Math.max(1, Math.round(durationMs / 1000)))}
        stats={[
          {
            label: t('solved'),
            value: t('solvedValue', { count: totalSteps, total: totalSteps }),
          },
          { label: t('hintsUsed'), value: hintsUsed },
        ]}
        actions={
          <div className="flex flex-col gap-2.5" data-testid="quick-play-next">
            {dailyDone ? (
              <>
                <Button
                  variant="tactile"
                  className="w-full gap-2"
                  onClick={retry}
                >
                  {retryButtonContent}
                </Button>
                <Button
                  variant="tactileOutline"
                  className="w-full gap-2"
                  asChild
                >
                  {dailyLink}
                </Button>
              </>
            ) : (
              <>
                <Button variant="tactile" className="w-full gap-2" asChild>
                  {dailyLink}
                </Button>
                <Button
                  variant="tactileOutline"
                  className="w-full gap-2"
                  onClick={retry}
                >
                  {retryButtonContent}
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              className="h-11 gap-1 self-center px-3 text-[15px] font-bold text-ink-2 hover:text-ink"
              asChild
            >
              <Link
                href="/single-play"
                onClick={() =>
                  trackCtaClick('quick_play_result', 'explore_modes')
                }
              >
                {t('explore')}
                <ChevronRight aria-hidden className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
