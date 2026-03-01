import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AchievementId =
  | 'first_win'
  | 'score_10'
  | 'all_multiply'
  | 'daily_done'
  | 'multiplayer_win'
  | 'play_10'
  | 'no_skip'
  | 'speed_win';

export type Achievement = {
  id: AchievementId;
  name: string;
  description: string;
  unlockedAt?: string; // ISO date string
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_win',
    name: '初次出牌',
    description: '首次出牌成功',
  },
  {
    id: 'score_10',
    name: '高手',
    description: '單回合得 10 分（含加分）',
  },
  {
    id: 'all_multiply',
    name: '乘法王',
    description: '使用 3 個乘號組出算式',
  },
  {
    id: 'daily_done',
    name: '每日挑戰',
    description: '完成第一次每日挑戰',
  },
  {
    id: 'multiplayer_win',
    name: '勝利宣言',
    description: '多人模式獲勝',
  },
  {
    id: 'play_10',
    name: '老手',
    description: '累計出牌成功 10 次',
  },
  {
    id: 'no_skip',
    name: '精準',
    description: '單人模式一局未跳過完成遊戲',
  },
  {
    id: 'speed_win',
    name: '神速',
    description: '10 秒內出牌成功',
  },
];

type AchievementStore = {
  unlockedIds: AchievementId[];
  totalPlays: number;       // 累計出牌成功次數
  singleSkipCount: number;  // 本局跳過次數（單人）
  lastPlayTime: number;     // 最近出牌時刻（用於 speed_win）
  /** 解鎖成就；若已解鎖則忽略。回傳是否為新解鎖 */
  unlock: (id: AchievementId) => boolean;
  incrementPlays: () => void;
  incrementSkip: () => void;
  resetSingleSession: () => void;
  setLastPlayTime: (time: number) => void;
};

export const useAchievementStore = create<AchievementStore>()(
  persist(
    (set, get) => ({
      unlockedIds: [],
      totalPlays: 0,
      singleSkipCount: 0,
      lastPlayTime: 0,

      unlock: (id: AchievementId) => {
        if (get().unlockedIds.includes(id)) return false;
        set(state => ({ unlockedIds: [...state.unlockedIds, id] }));
        return true;
      },

      incrementPlays: () =>
        set(state => ({ totalPlays: state.totalPlays + 1 })),

      incrementSkip: () =>
        set(state => ({ singleSkipCount: state.singleSkipCount + 1 })),

      resetSingleSession: () => set({ singleSkipCount: 0 }),

      setLastPlayTime: (time: number) => set({ lastPlayTime: time }),
    }),
    {
      name: 'achievements',
    },
  ),
);
