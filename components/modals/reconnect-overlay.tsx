'use client';

import { RefreshCw, WifiOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

type Props = {
  status: 'connected' | 'reconnecting' | 'disconnected';
  onLeave: () => void;
};

/** 斷線重連遮罩：重連中顯示轉圈（reduced-motion 不轉），失敗時提供回到大廳 */
export function ReconnectOverlay({ status, onLeave }: Props) {
  const t = useTranslations('Multiplayer.reconnect');
  if (status === 'connected') return null;

  const isReconnecting = status === 'reconnecting';

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="reconnect-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,20,19,0.6)] p-4 backdrop-blur-xs"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-[20px] bg-surface px-6 pt-7 pb-6 text-center shadow-[0_16px_40px_rgba(16,36,33,0.16)]">
        <span
          className={
            isReconnecting
              ? 'flex h-14 w-14 items-center justify-center rounded-full bg-primary-tint text-primary-ink'
              : 'flex h-14 w-14 items-center justify-center rounded-full bg-danger-tint text-danger-ink'
          }
        >
          {isReconnecting ? (
            <RefreshCw
              aria-hidden
              className="h-7 w-7 animate-spin motion-reduce:animate-none"
            />
          ) : (
            <WifiOff aria-hidden className="h-7 w-7" />
          )}
        </span>
        <p id="reconnect-title" className="text-xl font-extrabold text-ink">
          {isReconnecting ? t('reconnecting') : t('disconnected')}
        </p>
        <p className="text-[15px] text-ink-2">
          {isReconnecting ? t('reconnectingHint') : t('disconnectedHint')}
        </p>
        {!isReconnecting && (
          <Button variant="tactile" className="mt-3 w-full" onClick={onLeave}>
            {t('backToLobby')}
          </Button>
        )}
      </div>
    </div>
  );
}
