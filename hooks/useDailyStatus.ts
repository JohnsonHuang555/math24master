import { useEffect, useState } from 'react';
import { getDailyStatus } from '@/lib/daily-seed';
import { msUntilNextTaipeiDay } from '@/lib/date';

export type DailyStatus = ReturnType<typeof getDailyStatus>;

/**
 * 每日挑戰的今日狀態與連續天數（存在 localStorage，掛載後才讀，避免 hydration 不一致）。
 * 頁面開著跨過每日挑戰日（台灣 00:00）、從背景切回來、或從 bfcache 還原時都會重讀，
 * 避免昨天的「今日已完成」一直掛著
 */
export function useDailyStatus(): DailyStatus | null {
  const [status, setStatus] = useState<DailyStatus | null>(null);

  useEffect(() => {
    const refresh = () => setStatus(getDailyStatus());
    let timer: ReturnType<typeof setTimeout>;
    const scheduleNextDay = () => {
      clearTimeout(timer);
      // 多等 1 秒，確保換日後 getTodayDateString() 已是新的一天
      timer = setTimeout(() => {
        refresh();
        scheduleNextDay();
      }, msUntilNextTaipeiDay() + 1000);
    };
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      refresh();
      // 背景分頁的計時器可能被瀏覽器延後，回到前景時重新排程
      scheduleNextDay();
    };

    refresh();
    scheduleNextDay();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onVisible);
    };
  }, []);

  return status;
}
