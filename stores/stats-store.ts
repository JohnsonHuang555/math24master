import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type StatsStore = {
  singlePlays: number;             // 單人遊戲完成場次
  multiPlays: number;              // 多人遊戲完成場次
  multiWins: number;               // 多人勝場數
  totalSkips: number;              // 累計跳過次數
  bestScore: number;               // 單人最高分
  dailyChallengeCompletes: number; // 每日挑戰完成次數
  fastestPlayMs: number;           // 最快出牌毫秒（0=未設定）
  rummyPlays: number;              // 拉密多人場次
  rummyWins: number;               // 拉密多人勝場

  incrementSinglePlays: () => void;
  incrementMultiPlays: () => void;
  incrementMultiWins: () => void;
  incrementSkips: () => void;
  updateBestScore: (score: number) => void;
  incrementDailyChallenge: () => void;
  updateFastestPlay: (ms: number) => void;
  incrementRummyPlays: () => void;
  incrementRummyWins: () => void;
};

export const useStatsStore = create<StatsStore>()(
  persist(
    (set, get) => ({
      singlePlays: 0,
      multiPlays: 0,
      multiWins: 0,
      totalSkips: 0,
      bestScore: 0,
      dailyChallengeCompletes: 0,
      fastestPlayMs: 0,
      rummyPlays: 0,
      rummyWins: 0,

      incrementSinglePlays: () =>
        set(state => ({ singlePlays: state.singlePlays + 1 })),
      incrementMultiPlays: () =>
        set(state => ({ multiPlays: state.multiPlays + 1 })),
      incrementMultiWins: () =>
        set(state => ({ multiWins: state.multiWins + 1 })),
      incrementSkips: () =>
        set(state => ({ totalSkips: state.totalSkips + 1 })),
      updateBestScore: (score: number) => {
        if (score > get().bestScore) {
          set({ bestScore: score });
        }
      },
      incrementDailyChallenge: () =>
        set(state => ({
          dailyChallengeCompletes: state.dailyChallengeCompletes + 1,
        })),
      updateFastestPlay: (ms: number) => {
        const current = get().fastestPlayMs;
        if (current === 0 || ms < current) {
          set({ fastestPlayMs: ms });
        }
      },
      incrementRummyPlays: () =>
        set(state => ({ rummyPlays: state.rummyPlays + 1 })),
      incrementRummyWins: () =>
        set(state => ({ rummyWins: state.rummyWins + 1 })),
    }),
    { name: 'player-stats' },
  ),
);
