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

export type Achievement = {
  id: AchievementId;
  name: string;
  description: string;
  category: AchievementCategory;
  progressKey?: 'totalPlays' | 'consecutiveWins' | 'totalScore' | 'challengeBestStage' | 'dailyStreak';
  progressTarget?: number;
};

export const ACHIEVEMENTS: Achievement[] = [
  // 新手
  {
    id: 'first_win',
    name: '初次出牌',
    description: '首次出牌成功',
    category: 'beginner',
  },
  {
    id: 'daily_done',
    name: '每日挑戰',
    description: '完成第一次每日挑戰',
    category: 'beginner',
  },
  {
    id: 'normal_first',
    name: '關卡初體驗',
    description: '完成第一次關卡模式',
    category: 'beginner',
  },
  {
    id: 'challenge_first',
    name: '挑戰起步',
    description: '挑戰模式答對第一題',
    category: 'beginner',
  },
  // 進階
  {
    id: 'speed_win',
    name: '神速',
    description: '10 秒內出牌成功',
    category: 'advanced',
  },
  {
    id: 'all_ops',
    name: '全能達人',
    description: '一個算式中同時使用三種不同運算符號',
    category: 'advanced',
  },
  {
    id: 'all_multiply',
    name: '乘法王',
    description: '使用 3 個乘號組出算式',
    category: 'advanced',
  },
  {
    id: 'no_skip',
    name: '精準',
    description: '經典模式一局未跳過完成遊戲',
    category: 'advanced',
  },
  // 挑戰
  {
    id: 'consecutive_5',
    name: '連勝達人',
    description: '連續 5 次出牌成功（不中斷）',
    category: 'challenge',
    progressKey: 'consecutiveWins',
    progressTarget: 5,
  },
  {
    id: 'total_score_100',
    name: '得分達人',
    description: '累計得分達 100 分',
    category: 'challenge',
    progressKey: 'totalScore',
    progressTarget: 100,
  },
  {
    id: 'play_100',
    name: '傳奇玩家',
    description: '累計出牌成功 100 次',
    category: 'challenge',
    progressKey: 'totalPlays',
    progressTarget: 100,
  },
  {
    id: 'normal_perfect',
    name: '完美通關',
    description: '關卡模式全程無錯誤完成',
    category: 'challenge',
  },
  {
    id: 'challenge_stage_10',
    name: '不朽連擊',
    description: '挑戰模式連續答對 10 題',
    category: 'challenge',
    progressKey: 'challengeBestStage',
    progressTarget: 10,
  },
  {
    id: 'daily_streak_7',
    name: '每日達人',
    description: '每日挑戰連續 7 天完成',
    category: 'challenge',
    progressKey: 'dailyStreak',
    progressTarget: 7,
  },
];

type AchievementStore = {
  unlockedIds: AchievementId[];
  unlockDates: Partial<Record<AchievementId, number>>; // 解鎖時間戳（ms）
  totalPlays: number;          // 累計出牌成功次數
  singleSkipCount: number;     // 本局跳過次數（單人）
  lastPlayTime: number;        // 最近出牌時刻（用於 speed_win）
  consecutiveWins: number;     // 連勝計數
  totalScore: number;          // 累計得分
  challengeBestStage: number;  // 挑戰模式最高連續答對題數（for progress display）
  dailyStreak: number;         // 每日挑戰當前連續天數（for progress display）

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
