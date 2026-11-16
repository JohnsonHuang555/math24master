'use client';

import { CircleCheck, Flame } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDailyStatus } from '@/hooks/useDailyStatus';

const PILL_CLASS =
  'inline-flex h-6 items-center gap-[5px] rounded-full px-2 text-xs font-bold whitespace-nowrap';

/**
 * 每日挑戰按鈕內的狀態標記：今日已完成優先，其次是連續天數；都沒有就不顯示。
 * 掛載後才顯示；跨日或切回分頁時會更新（見 useDailyStatus）
 */
export function DailyStatusBadge() {
  const t = useTranslations('Home.moreModes.dailyChallenge');
  const status = useDailyStatus();

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
