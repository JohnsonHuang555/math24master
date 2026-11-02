'use client';

import { BookOpen, ChevronLeft, type LucideIcon, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type StartStat = { label: string; value: React.ReactNode };

type GameStartScreenProps = {
  icon: LucideIcon;
  title: string;
  /** 標題下的粗體一句話（如「倒數 5 分鐘 · 無限關卡」） */
  tagline?: React.ReactNode;
  /** 補充說明，灰字 */
  description?: React.ReactNode;
  /** 個人最佳等紀錄，最多兩格 */
  stats?: StartStat[];
  onBack: () => void;
  onOpenRules?: () => void;
  onStart: () => void;
  startLabel?: string;
  /** 放在紀錄下方的額外內容（如難度選擇、Beta 提示） */
  children?: React.ReactNode;
  className?: string;
};

/**
 * 單人模式的開始畫面：頂部返回與規則、中間模式資訊與個人紀錄、底部固定主 CTA。
 * 手機上主 CTA 固定在拇指可及的位置
 */
export function GameStartScreen({
  icon: Icon,
  title,
  tagline,
  description,
  stats,
  onBack,
  onOpenRules,
  onStart,
  startLabel,
  children,
  className,
}: GameStartScreenProps) {
  const t = useTranslations('GameUI.hud');
  const tCommon = useTranslations('Common');

  return (
    <div
      className={cn(
        'mx-auto flex h-full w-full max-w-md flex-col px-4 pt-2 pb-6',
        className,
      )}
    >
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 text-ink"
          onClick={onBack}
          aria-label={tCommon('back')}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="flex-1" />
        {onOpenRules && (
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 text-ink"
            onClick={onOpenRules}
            aria-label={t('rules')}
          >
            <BookOpen className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-3.5 py-6 text-center">
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-primary-tint text-primary-ink">
          <Icon aria-hidden className="h-9 w-9" />
        </span>
        <h1 className="mt-1.5 text-[32px] leading-tight font-black text-ink">
          {title}
        </h1>
        {tagline && <p className="text-[17px] font-bold text-ink">{tagline}</p>}
        {description && (
          <div className="text-[15px] leading-relaxed text-ink-2">
            {description}
          </div>
        )}
        {stats && stats.length > 0 && (
          <div
            className={cn(
              'mt-3.5 grid w-full gap-2.5',
              stats.length > 1 ? 'grid-cols-2' : 'grid-cols-1',
            )}
          >
            {stats.map(stat => (
              <div
                key={stat.label}
                className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-3.5 text-left"
              >
                <span className="text-xs font-bold text-ink-2">
                  {stat.label}
                </span>
                <span className="font-display text-[28px] leading-none font-extrabold text-ink tabular-nums">
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        )}
        {children}
      </div>

      <Button variant="tactile" className="w-full gap-2" onClick={onStart}>
        <Play aria-hidden className="h-5 w-5" />
        {startLabel ?? tCommon('startGame')}
      </Button>
    </div>
  );
}
