'use client';

import { useEffect, useRef, useState } from 'react';
import { AddToHomeScreenModal } from '@/components/modals/add-to-home-screen-modal';
import { useAddToHomeScreen } from '@/hooks/useAddToHomeScreen';
import { useA2hsPreferenceStore } from '@/stores/a2hs-preference-store';
import { useStatsStore } from '@/stores/stats-store';

const SHOW_DELAY_MS = 2500;

/**
 * 「加到主畫面」提示的觸發器：只對玩過至少一局、還沒安裝、
 * 沒有選擇永久跳過的玩家，延遲顯示一次。掛在首頁，避免跟
 * 遊戲內既有的登入提示 modal 搶著跳出來。
 */
export function AddToHomeScreenPrompt() {
  const { isStandalone, isIOS, canInstall, promptInstall } =
    useAddToHomeScreen();
  const { skipInstallPrompt, setSkipInstallPrompt } = useA2hsPreferenceStore();
  const hasPlayedBefore = useStatsStore(
    s =>
      s.classicPlays > 0 ||
      s.normalPlays > 0 ||
      s.challengePlays > 0 ||
      s.dailyChallengeCompletes > 0 ||
      s.quickMathPlays > 0 ||
      s.quickMathAdvancedPlays > 0,
  );

  const [isOpen, setIsOpen] = useState(false);
  const hasShownRef = useRef(false);

  useEffect(() => {
    if (hasShownRef.current) return;
    if (isStandalone || skipInstallPrompt || !hasPlayedBefore) return;
    if (!isIOS && !canInstall) return;

    hasShownRef.current = true;
    const id = setTimeout(() => setIsOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(id);
  }, [isStandalone, isIOS, canInstall, skipInstallPrompt, hasPlayedBefore]);

  const handleInstallClick = async () => {
    await promptInstall();
    setIsOpen(false);
  };

  return (
    <AddToHomeScreenModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onSkipForever={() => {
        setSkipInstallPrompt(true);
        setIsOpen(false);
      }}
      onInstallClick={handleInstallClick}
      isIOS={isIOS}
    />
  );
}
