'use client';

import { useEffect, useState } from 'react';
import { CircleCheck, Flame } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getDailyStatus } from '@/lib/daily-seed';

const PILL_CLASS =
  'inline-flex h-6 items-center gap-[5px] rounded-full px-2 text-xs font-bold whitespace-nowrap';

/**
 * 每日挑戰按鈕內的狀態標記：今日已完成優先，其次是連續天數；都沒有就不顯示。
 * 讀 localStorage，所以等掛載後才顯示，避免 hydration 不一致
 */
export function DailyStatusBadge() {
  const t = useTranslations('Home.moreModes.dailyChallenge');
  const [status, setStatus] = useState<ReturnType<
    typeof getDailyStatus
  > | null>(null);

  useEffect(() => {
    setStatus(getDailyStatus()); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  if (!status) return null;

  if (status.doneToday) {
    return (
      <span
        className={`${PILL_CLASS} bg-primary-tint text-primary-ink`}
        data-testid="home-daily-status"
      >
        <CircleCheck aria-hidden className="h-[13px] w-[13px]" />
        {t('doneToday')}
      </span>
    );
  }

  if (status.streak > 0) {
    return (
      <span
        className={`${PILL_CLASS} bg-amber-tint text-amber-ink`}
        data-testid="home-daily-status"
      >
        <Flame aria-hidden className="h-[13px] w-[13px]" />
        {t('streak', { count: status.streak })}
      </span>
    );
  }

  return null;
}
