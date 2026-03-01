import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type StatsStore = {
  singlePlays: number;    // 單人遊戲完成場次
  multiPlays: number;     // 多人遊戲完成場次
  multiWins: number;      // 多人勝場數
  totalSkips: number;     // 累計跳過次數（跨所有對局）

  incrementSinglePlays: () => void;
  incrementMultiPlays: () => void;
  incrementMultiWins: () => void;
  incrementSkips: () => void;
};

export const useStatsStore = create<StatsStore>()(
  persist(
    set => ({
      singlePlays: 0,
      multiPlays: 0,
      multiWins: 0,
      totalSkips: 0,

      incrementSinglePlays: () =>
        set(state => ({ singlePlays: state.singlePlays + 1 })),
      incrementMultiPlays: () =>
        set(state => ({ multiPlays: state.multiPlays + 1 })),
      incrementMultiWins: () =>
        set(state => ({ multiWins: state.multiWins + 1 })),
      incrementSkips: () =>
        set(state => ({ totalSkips: state.totalSkips + 1 })),
    }),
    { name: 'player-stats' },
  ),
);
