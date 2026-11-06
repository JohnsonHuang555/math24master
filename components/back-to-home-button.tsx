'use client';

import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

// 全站統一的「回首頁」按鈕（44px 圖示鈕），各頁面自行決定要放進 <header> 還是既有的標題列
export function BackToHomeButton({ className }: { className?: string }) {
  const router = useRouter();
  const t = useTranslations('Common');
  return (
    <button
      type="button"
      onClick={() => router.push('/')}
      aria-label={t('home')}
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink transition-colors hover:bg-sunken focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
        className,
      )}
    >
      <ChevronLeft className="h-5 w-5" />
    </button>
  );
}
