import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AchievementCategory = 'beginner' | 'advanced' | 'challenge';

export type AchievementId =
  | 'first_win'
  | 'daily_done'
  | 'normal_first'
  | 'challenge_first'
  | 'speed_win'
  | 'all_ops'
  | 'all_multiply'
  | 'no_skip'
  | 'consecutive_5'
  | 'total_score_100'
  | 'play_100'
  | 'normal_perfect'
  | 'challenge_stage_10'
  | 'daily_streak_7';

// 名稱與描述在 messages 的 Achievements.items.<id>
export type Achievement = {
  id: AchievementId;
  category: AchievementCategory;
  progressKey?:
    | 'totalPlays'
    | 'consecutiveWins'
    | 'totalScore'
    | 'challengeBestStage'
    | 'dailyStreak';
  progressTarget?: number;
  /** 隱藏中（如關卡模式暫時下架）：不顯示、不計入完成度，資料保留 */
  hidden?: boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  // 新手
  {
    id: 'first_win',
    category: 'beginner',
  },
  {
    id: 'daily_done',
    category: 'beginner',
  },
  {
    id: 'normal_first',
    category: 'beginner',
    hidden: true, // 關卡模式暫時下架
  },
  {
    id: 'challenge_first',
    category: 'beginner',
  },
  // 進階
  {
    id: 'speed_win',
    category: 'advanced',
  },
  {
    id: 'all_ops',
    category: 'advanced',
  },
  {
    id: 'all_multiply',
    category: 'advanced',
  },
  {
    id: 'no_skip',
    category: 'advanced',
  },
  // 挑戰
  {
    id: 'consecutive_5',
    category: 'challenge',
    progressKey: 'consecutiveWins',
    progressTarget: 5,
  },
  {
    id: 'total_score_100',
    category: 'challenge',
    progressKey: 'totalScore',
    progressTarget: 100,
  },
  {
    id: 'play_100',
    category: 'challenge',
    progressKey: 'totalPlays',
    progressTarget: 100,
  },
  {
    id: 'normal_perfect',
    category: 'challenge',
    hidden: true, // 關卡模式暫時下架
  },
  {
    id: 'challenge_stage_10',
    category: 'challenge',
    progressKey: 'challengeBestStage',
    progressTarget: 10,
  },
  {
    id: 'daily_streak_7',
    category: 'challenge',
    progressKey: 'dailyStreak',
    progressTarget: 7,
  },
];

/** 顯示用成就清單（過濾隱藏項；成就彈窗與完成度分母皆用此清單） */
export const VISIBLE_ACHIEVEMENTS: Achievement[] = ACHIEVEMENTS.filter(
  a => !a.hidden,
);

type AchievementStore = {
  unlockedIds: AchievementId[];
  unlockDates: Partial<Record<AchievementId, number>>; // 解鎖時間戳（ms）
  totalPlays: number; // 累計出牌成功次數
  singleSkipCount: number; // 本局跳過次數（單人）
  lastPlayTime: number; // 最近出牌時刻（用於 speed_win）
  consecutiveWins: number; // 連勝計數
  totalScore: number; // 累計得分
  challengeBestStage: number; // 挑戰模式最高連續答對題數（for progress display）
  dailyStreak: number; // 每日挑戰當前連續天數（for progress display）

  /** 解鎖成就；若已解鎖則忽略。回傳是否為新解鎖 */
  unlock: (id: AchievementId) => boolean;
  incrementPlays: () => void;
  incrementSkip: () => void;
  resetSingleSession: () => void;
  setLastPlayTime: (time: number) => void;
  incrementConsecutiveWins: () => void;
  resetConsecutiveWins: () => void;
  addScore: (points: number) => void;
  updateChallengeBestStage: (stage: number) => void;
  updateDailyStreak: (streak: number) => void;
};

export const useAchievementStore = create<AchievementStore>()(
  persist(
    (set, get) => ({
      unlockedIds: [],
      unlockDates: {},
      totalPlays: 0,
      singleSkipCount: 0,
      lastPlayTime: 0,
      consecutiveWins: 0,
      totalScore: 0,
      challengeBestStage: 0,
      dailyStreak: 0,

      unlock: (id: AchievementId) => {
        if (get().unlockedIds.includes(id)) return false;
        set(state => ({
          unlockedIds: [...state.unlockedIds, id],
          unlockDates: { ...state.unlockDates, [id]: Date.now() },
        }));
        return true;
      },

      incrementPlays: () =>
        set(state => ({ totalPlays: state.totalPlays + 1 })),

      incrementSkip: () =>
        set(state => ({ singleSkipCount: state.singleSkipCount + 1 })),

      resetSingleSession: () => set({ singleSkipCount: 0 }),

      setLastPlayTime: (time: number) => set({ lastPlayTime: time }),

      incrementConsecutiveWins: () =>
        set(state => ({ consecutiveWins: state.consecutiveWins + 1 })),

      resetConsecutiveWins: () => set({ consecutiveWins: 0 }),

      addScore: (points: number) =>
        set(state => ({ totalScore: state.totalScore + points })),

      updateChallengeBestStage: (stage: number) =>
        set(state => ({
          challengeBestStage: Math.max(state.challengeBestStage, stage),
        })),

      updateDailyStreak: (streak: number) => set({ dailyStreak: streak }),
    }),
    {
      name: 'achievements-v2',
    },
  ),
);
