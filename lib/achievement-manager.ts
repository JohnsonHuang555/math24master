import { toast } from 'react-toastify';
import {
  ACHIEVEMENTS,
  AchievementId,
  useAchievementStore,
} from '@/stores/achievement-store';

/** 嘗試解鎖成就；若首次解鎖則顯示通知 */
export function unlockAchievement(id: AchievementId): void {
  const wasNew = useAchievementStore.getState().unlock(id);
  if (wasNew) {
    const achievement = ACHIEVEMENTS.find(a => a.id === id);
    if (achievement) {
      toast.info(`成就解鎖：${achievement.name} — ${achievement.description}`, {
        autoClose: 4000,
      });
    }
  }
}
