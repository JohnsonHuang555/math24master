'use client';

import { LoaderCircle, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { QUICK_MATCH } from '@/models/Room';

/** 快速配對倒數中：取代「準備／開始遊戲」，時間到由電腦補位自動開局 */
export function QuickMatchAction({
  secondsLeft,
  onStartNow,
}: {
  secondsLeft: number | null;
  onStartNow: () => void;
}) {
  const t = useTranslations('Multiplayer.quickMatch');
  const seconds = Math.max(secondsLeft ?? QUICK_MATCH.waitSeconds, 0);

  return (
    <div className="flex flex-col gap-2.5">
      <div
        role="status"
        className="flex flex-col gap-1 rounded-2xl border-2 border-primary bg-primary-tint px-3.5 py-3"
      >
        <div className="flex items-center gap-2.5">
          <LoaderCircle
            aria-hidden
            className="h-5 w-5 shrink-0 animate-spin text-primary-ink motion-reduce:animate-none"
          />
          <strong className="min-w-0 flex-1 text-[15px] text-ink">
            {t('searching')}
          </strong>
          <span className="shrink-0 text-sm font-bold whitespace-nowrap text-primary-ink">
            {t.rich('secondsLeft', {
              seconds,
              n: chunks => (
                <span className="font-display text-2xl font-extrabold tabular-nums">
                  {chunks}
                </span>
              ),
            })}
          </span>
        </div>
        <span className="text-[13px] text-ink-2">{t('fillHint')}</span>
      </div>
      <Button variant="tactileOutline" className="w-full" onClick={onStartNow}>
        {t('startNow')}
      </Button>
    </div>
  );
}

/** 邀請朋友：手機叫出系統分享選單，桌機複製連結 */
export function InviteFriendsButton({ className }: { className?: string }) {
  const t = useTranslations('Multiplayer.invite');

  const handleInvite = async () => {
    const url = window.location.href;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: t('shareTitle'),
          text: t('shareText'),
          url,
        });
        trackEvent('room_invite', { outcome: 'shared' });
        return;
      } catch (e) {
        // 玩家自己取消分享就不再複製
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      trackEvent('room_invite', { outcome: 'copied' });
      toast.success(t('copied'));
    } catch {
      trackEvent('room_invite', { outcome: 'failed' });
      toast.error(t('copyFailed'));
    }
  };

  return (
    <Button
      variant="ghost"
      className={cn(
        'h-11 w-full gap-2 border border-line-strong bg-surface text-[15px] font-bold text-primary-ink hover:bg-primary-tint hover:text-primary-ink',
        className,
      )}
      onClick={handleInvite}
    >
      <Share2 aria-hidden className="h-[18px] w-[18px]" />
      {t('action')}
    </Button>
  );
}
