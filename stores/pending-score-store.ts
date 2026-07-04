import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PendingScoreMode = 'classic' | 'normal' | 'challenge' | 'daily';

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
    { name: 'pending-leaderboard-score' },
  ),
);
