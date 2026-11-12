import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { parseBotPlayerName } from '@/models/Player';

/**
 * 把玩家名稱轉成要顯示的文字：真人玩家照原樣顯示（玩家輸入的暱稱不翻譯），
 * 電腦玩家的名稱是代碼（如 `bot:normal:2`），依目前語系顯示成「電腦 2」。
 * 名稱不帶難度，避免在窄欄位被截斷；需要時難度另外用標籤顯示
 */
export function usePlayerName() {
  const t = useTranslations('Multiplayer.bot');
  return useCallback(
    (name: string) => {
      const bot = parseBotPlayerName(name);
      if (!bot) return name;
      return bot.index > 1
        ? t('nameNumbered', { index: bot.index })
        : t('name');
    },
    [t],
  );
}
