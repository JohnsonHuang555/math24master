'use client';

import { useCallback, useEffect, useState } from 'react';

export type LeaderboardMode = 'normal' | 'challenge' | 'classic';

export interface LeaderboardRow {
  rank: number;
  userId: string;
  displayName: string;
  photoURL: string | null;
  seconds?: number;
  totalScore?: number;
  rankingScore?: number;
  stage?: number;
  score?: number;
  submittedAt: string | null;
}

export function useLeaderboard(mode: LeaderboardMode, enabled: boolean) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.fetch(`/api/leaderboard?mode=${mode}&limit=100`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setRows(data);
    } catch {
      setError('載入失敗');
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    if (enabled) loadRows();
  }, [enabled, loadRows]);

  return { rows, loading, error, refetch: loadRows };
}
