'use client';

import { LoaderCircle, Share2 } from 'lucide-react';
import { ResultSecondaryButton } from '@/components/game/game-result-screen';
import { cn } from '@/lib/utils';

/** 結算畫面的「分享成績」按鈕；產生圖卡時變成 teal 淡底＋轉圈，並停用 */
export function ShareResultButton({
  label,
  generatingLabel,
  isGenerating,
  onClick,
  className,
}: {
  label: string;
  generatingLabel: string;
  isGenerating: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <ResultSecondaryButton
      onClick={onClick}
      disabled={isGenerating}
      aria-busy={isGenerating}
      data-testid="share-result-button"
      className={cn(
        isGenerating &&
          'border-primary bg-primary-tint text-primary-ink disabled:opacity-100',
        className,
      )}
    >
      {isGenerating ? (
        <LoaderCircle
          aria-hidden
          className="animate-spin motion-reduce:animate-none"
        />
      ) : (
        <Share2 aria-hidden />
      )}
      {isGenerating ? generatingLabel : label}
    </ResultSecondaryButton>
  );
}
