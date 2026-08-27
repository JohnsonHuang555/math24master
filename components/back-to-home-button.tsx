'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

// 全站統一的「回首頁」按鈕，各頁面自行決定要放進 <header> 還是既有的標題列
export function BackToHomeButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push('/')}
      className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800"
    >
      <ArrowLeft className="h-4 w-4" />
      首頁
    </button>
  );
}
