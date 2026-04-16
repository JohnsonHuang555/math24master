import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type StatsStore = {
  // 經典模式
  classicPlays: number;            // 場次
  classicBestScore: number;        // 最高分
  classicFastestPlayMs: number;    // 最快出牌（ms，0=未設定）
  classicTotalSkips: number;       // 累計跳過

  // 關卡模式
  normalPlays: number;             // 場次
  normalBestSeconds: number;       // 最速完成秒數（0=未設定）
  normalPerfectRuns: number;       // 零罰時完成次數

  // 挑戰模式
  challengePlays: number;          // 場次
  challengeBestStage: number;      // 最高連續答對題數

  // 每日挑戰
  dailyChallengeCompletes: number;

  incrementClassicPlays: () => void;
  updateClassicBestScore: (score: number) => void;
  updateClassicFastestPlay: (ms: number) => void;
  incrementClassicSkips: () => void;

  incrementNormalPlays: () => void;
  updateNormalBest: (seconds: number) => void;
  incrementNormalPerfectRuns: () => void;

  incrementChallengePlays: () => void;
  updateChallengeBestStage: (count: number) => void;

  incrementDailyChallenge: () => void;
};

export const useStatsStore = create<StatsStore>()(
  persist(
    (set, get) => ({
      classicPlays: 0,
      classicBestScore: 0,
      classicFastestPlayMs: 0,
      classicTotalSkips: 0,

      normalPlays: 0,
      normalBestSeconds: 0,
      normalPerfectRuns: 0,

      challengePlays: 0,
      challengeBestStage: 0,

      dailyChallengeCompletes: 0,

      incrementClassicPlays: () =>
        set(state => ({ classicPlays: state.classicPlays + 1 })),

      updateClassicBestScore: (score: number) => {
        if (score > get().classicBestScore) {
          set({ classicBestScore: score });
        }
      },

      updateClassicFastestPlay: (ms: number) => {
        const current = get().classicFastestPlayMs;
        if (current === 0 || ms < current) {
          set({ classicFastestPlayMs: ms });
        }
      },

      incrementClassicSkips: () =>
        set(state => ({ classicTotalSkips: state.classicTotalSkips + 1 })),

      incrementNormalPlays: () =>
        set(state => ({ normalPlays: state.normalPlays + 1 })),

      updateNormalBest: (seconds: number) => {
        const current = get().normalBestSeconds;
        if (current === 0 || seconds < current) {
          set({ normalBestSeconds: seconds });
        }
      },

      incrementNormalPerfectRuns: () =>
        set(state => ({ normalPerfectRuns: state.normalPerfectRuns + 1 })),

      incrementChallengePlays: () =>
        set(state => ({ challengePlays: state.challengePlays + 1 })),

      updateChallengeBestStage: (count: number) =>
        set(state => ({
          challengeBestStage: Math.max(state.challengeBestStage, count),
        })),

      incrementDailyChallenge: () =>
        set(state => ({
          dailyChallengeCompletes: state.dailyChallengeCompletes + 1,
        })),
    }),
    {
      name: 'player-stats',
      version: 2,
      migrate: (persistedState) => ({
        classicPlays: 0,
        classicBestScore: 0,
        classicFastestPlayMs: 0,
        classicTotalSkips: 0,
        normalPlays: 0,
        normalBestSeconds: 0,
        normalPerfectRuns: 0,
        challengePlays: 0,
        challengeBestStage: 0,
        dailyChallengeCompletes: 0,
        ...(persistedState as Partial<StatsStore> | undefined),
      }),
    },
  ),
);
