import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PendingScoreMode = 'classic' | 'normal' | 'challenge' | 'quickmath';

type PendingScore = {
  mode: PendingScoreMode;
  payload: Record<string, unknown>;
};

type PendingScoreStore = {
  pendingScore: PendingScore | null;
  setPendingScore: (s: PendingScore) => void;
  clearPendingScore: () => void;
};

export const usePendingScoreStore = create<PendingScoreStore>()(
  persist(
    set => ({
      pendingScore: null,
      setPendingScore: (s: PendingScore) => set({ pendingScore: s }),
      clearPendingScore: () => set({ pendingScore: null }),
    }),
    {
      name: 'pending-leaderboard-score',
      // 2026-07 挑戰模式再平衡並清空 leaderboard_challenge，
      // 舊版 pending 成績不可比，靠 version bump 讓 migrate 直接作廢
      version: 1,
      migrate: () => ({ pendingScore: null }),
    },
  ),
);
