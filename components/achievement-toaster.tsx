'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useAchievementStore } from '@/stores/achievement-store';

/** 成就首次解鎖時跳出通知。掛在 root layout，全站共用 */
export function AchievementToaster() {
  const t = useTranslations('Achievements');

  useEffect(
    () =>
      useAchievementStore.subscribe((state, prev) => {
        // 從 localStorage 還原存檔也會改到 unlockedIds，那不是新解鎖
        if (!useAchievementStore.persist.hasHydrated()) return;
        state.unlockedIds
          .filter(id => !prev.unlockedIds.includes(id))
          .forEach(id =>
            toast.info(
              t('unlockedToast', {
                name: t(`items.${id}.name`),
                description: t(`items.${id}.description`),
              }),
              { duration: 4000 },
            ),
          );
      }),
    [t],
  );

  return null;
}
