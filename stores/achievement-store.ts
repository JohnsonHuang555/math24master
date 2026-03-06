import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AchievementCategory = 'beginner' | 'advanced' | 'challenge';

export type AchievementId =
  | 'first_win'
  | 'score_10'
  | 'all_multiply'
  | 'daily_done'
  | 'multiplayer_win'
  | 'play_10'
  | 'no_skip'
  | 'speed_win'
  | 'consecutive_3'
  | 'total_score_50'
  | 'rummy_meld'
  | 'play_50';

export type Achievement = {
  id: AchievementId;
  name: string;
  description: string;
  category: AchievementCategory;
  /** 帶計數的成就：顯示進度條，target 為目標值 */
  progressKey?: 'totalPlays' | 'consecutiveWins' | 'totalScore';
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
    id: 'play_10',
    name: '老手',
    description: '累計出牌成功 10 次',
    category: 'beginner',
    progressKey: 'totalPlays',
    progressTarget: 10,
  },
  // 進階
  {
    id: 'score_10',
    name: '高手',
    description: '單回合得 10 分（含加分）',
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
    description: '單人模式一局未跳過完成遊戲',
    category: 'advanced',
  },
  {
    id: 'speed_win',
    name: '神速',
    description: '10 秒內出牌成功',
    category: 'advanced',
  },
  // 挑戰
  {
    id: 'multiplayer_win',
    name: '勝利宣言',
    description: '多人模式獲勝',
    category: 'challenge',
  },
  {
    id: 'consecutive_3',
    name: '連勝達人',
    description: '連續 3 次出牌成功（不中斷）',
    category: 'challenge',
    progressKey: 'consecutiveWins',
    progressTarget: 3,
  },
  {
    id: 'total_score_50',
    name: '得分達人',
    description: '累計得分達 50 分',
    category: 'challenge',
    progressKey: 'totalScore',
    progressTarget: 50,
  },
  {
    id: 'rummy_meld',
    name: '拉密破冰',
    description: '拉密模式完成第一次破冰出牌',
    category: 'challenge',
  },
  {
    id: 'play_50',
    name: '傳奇玩家',
    description: '累計出牌成功 50 次',
    category: 'challenge',
    progressKey: 'totalPlays',
    progressTarget: 50,
  },
];

type AchievementStore = {
  unlockedIds: AchievementId[];
  unlockDates: Partial<Record<AchievementId, number>>; // 解鎖時間戳（ms）
  totalPlays: number;       // 累計出牌成功次數
  singleSkipCount: number;  // 本局跳過次數（單人）
  lastPlayTime: number;     // 最近出牌時刻（用於 speed_win）
  consecutiveWins: number;  // 連勝計數
  totalScore: number;       // 累計得分

  /** 解鎖成就；若已解鎖則忽略。回傳是否為新解鎖 */
  unlock: (id: AchievementId) => boolean;
  incrementPlays: () => void;
  incrementSkip: () => void;
  resetSingleSession: () => void;
  setLastPlayTime: (time: number) => void;
  incrementConsecutiveWins: () => void;
  resetConsecutiveWins: () => void;
  addScore: (points: number) => void;
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
    }),
    {
      name: 'achievements',
    },
  ),
);
