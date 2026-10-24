import { AchievementId, useAchievementStore } from '@/stores/achievement-store';

/** 嘗試解鎖成就；首次解鎖的通知由 AchievementToaster 依玩家語系顯示 */
export function unlockAchievement(id: AchievementId): void {
  useAchievementStore.getState().unlock(id);
}
