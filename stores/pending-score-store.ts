import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LeaderboardMode } from '@/lib/leaderboard';

export type PendingScoreMode = LeaderboardMode;

/** 未登入時暫存的成績收據（見 docs/adr/0011）；成績內容已簽進收據，登入後原樣送出 */
type PendingScore = {
  mode: PendingScoreMode;
  receipt: string;
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
      // version 1：2026-07 挑戰模式再平衡並清空 leaderboard_challenge，舊版 pending 成績不可比
      // version 2：排行榜改為只收成績收據，舊版存的是沒有收據的 payload，無法再上榜
      // 兩次都靠 version bump 讓 migrate 直接作廢
      version: 2,
      migrate: () => ({ pendingScore: null }),
    },
  ),
);
