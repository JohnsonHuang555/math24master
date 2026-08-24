'use client';

import { useCallback, useEffect, useState } from 'react';

/** 非標準瀏覽器事件，DOM lib 沒有定義，這裡自己補型別 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

function detectIsStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    nav.standalone === true
  );
}

function detectIsIOS(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

/**
 * 「加到主畫面」安裝提示。
 * - Android / Chrome 系列瀏覽器會發出 beforeinstallprompt，可呼叫
 *   promptInstall() 叫出原生安裝對話框。
 * - iOS Safari 完全不支援這個事件，只能引導使用者手動操作
 *   （見 components/modals/add-to-home-screen-modal.tsx）。
 */
export function useAddToHomeScreen() {
  const [deferredEvent, setDeferredEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsStandalone(detectIsStandalone());
    setIsIOS(detectIsIOS());

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setDeferredEvent(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredEvent) return false;
    await deferredEvent.prompt();
    const { outcome } = await deferredEvent.userChoice;
    // beforeinstallprompt 事件只能用一次，用完就清空
    setDeferredEvent(null);
    return outcome === 'accepted';
  }, [deferredEvent]);

  return {
    /** 已經是「加到主畫面」啟動的獨立視窗，不該再提示 */
    isStandalone,
    /** iOS Safari：沒有原生安裝事件，只能顯示手動教學 */
    isIOS,
    /** Android/Chrome：已收到瀏覽器的安裝事件，可以叫出原生安裝對話框 */
    canInstall: !!deferredEvent,
    promptInstall,
  };
}
