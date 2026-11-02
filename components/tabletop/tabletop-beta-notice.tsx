'use client';

import { useSyncExternalStore } from 'react';
import { FlaskConical } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import {
  TABLETOP_LEADERBOARD_RESET_DATE,
  isTabletopBeta,
} from '@/lib/tabletop-beta';
import { cn } from '@/lib/utils';

const noopSubscribe = () => () => {};

/**
 * 牌桌模式測試期提示。日期只在瀏覽器判斷（server snapshot 為 null），
 * 避免靜態預先產生的頁面在重置日後與 client 不一致
 */
export function TabletopBetaNotice({ className }: { className?: string }) {
  const t = useTranslations('Leaderboard');
  const format = useFormatter();
  const isBeta = useSyncExternalStore(
    noopSubscribe,
    () => isTabletopBeta(),
    () => false,
  );
  if (!isBeta) return null;

  return (
    <p
      className={cn(
        'flex items-center gap-2 rounded-[10px] bg-amber-tint px-3 py-2 text-sm font-semibold text-amber-ink',
        className,
      )}
    >
      <FlaskConical aria-hidden className="h-4 w-4 shrink-0" />
      {t('tabletopBeta', {
        date: format.dateTime(
          new Date(`${TABLETOP_LEADERBOARD_RESET_DATE}T00:00:00+08:00`),
          {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'Asia/Taipei',
          },
        ),
      })}
    </p>
  );
}
