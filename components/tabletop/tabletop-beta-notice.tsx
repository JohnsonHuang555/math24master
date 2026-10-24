'use client';

import { useSyncExternalStore } from 'react';
import { FlaskConical } from 'lucide-react';
import { tabletopBetaNotice } from '@/lib/tabletop-beta';
import { cn } from '@/lib/utils';

const noopSubscribe = () => () => {};

/**
 * 牌桌模式測試期提示。日期只在瀏覽器判斷（server snapshot 為 null），
 * 避免靜態預先產生的頁面在重置日後與 client 不一致
 */
export function TabletopBetaNotice({ className }: { className?: string }) {
  const notice = useSyncExternalStore(
    noopSubscribe,
    () => tabletopBetaNotice(),
    () => null,
  );
  if (!notice) return null;

  return (
    <p
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
        className,
      )}
    >
      <FlaskConical className="h-3.5 w-3.5 shrink-0" />
      {notice}
    </p>
  );
}
