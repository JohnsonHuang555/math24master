import * as React from 'react';
import { Bot, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PlayerStatusKind =
  'turn' | 'last' | 'answering' | 'locked' | 'ready' | 'neutral';

const STATUS_CLASS: Record<PlayerStatusKind, string> = {
  turn: 'bg-primary-ink text-white',
  last: 'bg-amber text-on-amber',
  answering: 'bg-primary-tint text-primary-ink',
  locked: 'bg-danger-tint text-danger-ink',
  ready: 'bg-primary-tint text-primary-ink',
  neutral: 'border border-line-strong bg-sunken text-ink',
};

export type PlayerStatus = {
  kind: PlayerStatusKind;
  label: React.ReactNode;
  icon?: React.ReactNode;
};

type PlayerCardProps = React.HTMLAttributes<HTMLDivElement> & {
  name: string;
  /** 名稱下方的次要資訊，如「18 分 · 手牌 4」或「房主」 */
  meta?: React.ReactNode;
  /** 狀態一律是「圖示＋文字」pill，固定放在右側 */
  status?: PlayerStatus;
  isSelf?: boolean;
  selfLabel?: string;
  isHost?: boolean;
  isBot?: boolean;
  /** 輪到他：加粗外框 */
  isActive?: boolean;
  /** 鎖定中：整張卡退成 sunken */
  isDimmed?: boolean;
};

/** 玩家卡：頭像、暱稱（超長以省略號截斷，玩家輸入不翻譯）、次要資訊、狀態 pill */
export function PlayerCard({
  name,
  meta,
  status,
  isSelf,
  selfLabel,
  isHost,
  isBot,
  isActive,
  isDimmed,
  className,
  ...props
}: PlayerCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3',
        isSelf && 'border-primary bg-primary-tint',
        isActive &&
          'border-2 border-primary px-[13px] py-[11px] shadow-[0_0_0_3px_var(--primary-tint)]',
        isDimmed && !isSelf && 'bg-sunken',
        className,
      )}
      {...props}
    >
      <div
        aria-hidden
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-extrabold',
          isBot
            ? 'bg-sunken text-ink-2'
            : isSelf
              ? 'bg-primary text-primary-foreground'
              : 'bg-primary-tint text-primary-ink',
          isDimmed && 'opacity-55',
        )}
      >
        {isBot ? <Bot className="h-5 w-5" /> : initialOf(name)}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            'flex min-w-0 items-center gap-1 text-[15px] font-bold',
            isDimmed && !isSelf && 'text-ink-2',
          )}
        >
          {/* 名字至少留幾個字，不要被右側的狀態 pill 整個擠掉 */}
          <span className="min-w-[2.5em] truncate">{name}</span>
          {isHost && (
            <Crown aria-hidden className="h-4 w-4 shrink-0 text-amber-ink" />
          )}
          {/* 有狀態 pill 時空間不夠，「（你）」交給整張卡的主色底標示 */}
          {isSelf && selfLabel && !status && (
            <span className="shrink-0 font-semibold text-primary-ink">
              {selfLabel}
            </span>
          )}
        </span>
        {meta && <span className="text-[13px] text-ink-2">{meta}</span>}
      </div>
      {status && (
        <span
          className={cn(
            'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-bold whitespace-nowrap max-sm:px-1.5',
            STATUS_CLASS[status.kind],
          )}
        >
          {status.icon}
          {/* 窄卡（手機兩欄）只留圖示，文字給螢幕閱讀器，避免把名字擠掉 */}
          <span className="max-sm:sr-only">{status.label}</span>
        </span>
      )}
    </div>
  );
}

/** 頭像文字：拉丁字母取前兩個字元，其他（如中文）取第一個字 */
export function initialOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const first = Array.from(trimmed)[0];
  if (/^[A-Za-z]$/.test(first)) {
    const second = Array.from(trimmed)[1];
    return second && /^[A-Za-z]$/.test(second)
      ? first.toUpperCase() + second.toLowerCase()
      : first.toUpperCase();
  }
  return first;
}
