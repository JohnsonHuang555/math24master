'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, CircleCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { GameResultScreen } from '@/components/game/game-result-screen';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { getDailyStatus } from '@/lib/daily-seed';
import { formatTime } from '@/lib/utils';

type QuickPlayResultProps = {
  isFirstTime: boolean;
  totalSteps: number;
  durationMs: number;
  hintsUsed: number;
  onRetry: () => void;
  onExplore: () => void;
};

/** 完成三題：題數、耗時、提示次數；接著引導到每日挑戰或其他模式，不要求登入 */
export function QuickPlayResult({
  isFirstTime,
  totalSteps,
  durationMs,
  hintsUsed,
  onRetry,
  onExplore,
}: QuickPlayResultProps) {
  const t = useTranslations('QuickPlay.result');
  // 每日挑戰的完成狀態存在 localStorage，掛載後才讀
  const [dailyDone, setDailyDone] = useState(false);

  useEffect(() => {
    setDailyDone(getDailyStatus().doneToday); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

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
        backLabel={t('explore')}
        onBack={onExplore}
        retryLabel={t('retry')}
        onRetry={onRetry}
      >
        <Button
          variant="tactileOutline"
          className="h-12 w-full gap-2 text-[15px] lg:h-[52px]"
          asChild
        >
          <Link href="/daily-challenge">
            <CalendarDays aria-hidden className="h-[18px] w-[18px]" />
            {dailyDone ? t('dailyDone') : t('daily')}
          </Link>
        </Button>
      </GameResultScreen>
    </div>
  );
}
