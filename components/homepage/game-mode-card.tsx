'use client';

import { ReactNode } from 'react';
import { ChevronRight, LucideIcon } from 'lucide-react';
import { useHardNavigate } from '@/i18n/navigation';

type GameModeCardProps = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  /** 說明下方的狀態 pill，如每日挑戰的完成狀態與連續天數 */
  extra?: ReactNode;
};

/** 首頁「更多遊戲」的小磚：平面卡片，模式之間用圖示區分、不用顏色 */
const GameModeCard = ({
  href,
  icon: Icon,
  title,
  description,
  badge,
  extra,
}: GameModeCardProps) => {
  const hardNavigate = useHardNavigate();

  return (
    <button
      type="button"
      onClick={() => hardNavigate(href)}
      className="flex w-full items-center gap-3.5 rounded-[18px] border border-line bg-surface p-3.5 text-left transition-colors hover:border-line-strong hover:bg-sunken focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-primary-tint text-primary-ink">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="flex items-center gap-1.5">
          <strong className="text-base text-ink">{title}</strong>
          {badge && (
            <span className="inline-flex h-[22px] items-center rounded-full border border-line-strong bg-sunken px-2 text-[11px] font-bold whitespace-nowrap text-ink">
              {badge}
            </span>
          )}
        </span>
        <span className="text-[13px] text-ink-2">{description}</span>
        {extra}
      </div>
      <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-ink-2" />
    </button>
  );
};

export default GameModeCard;
