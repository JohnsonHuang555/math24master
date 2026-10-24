'use client';

import { useCallback, useEffect, useState } from 'react';
import type { LeaderboardMode, LeaderboardRow } from '@/lib/leaderboard';

export type { LeaderboardMode, LeaderboardRow };

export function useLeaderboard(mode: LeaderboardMode, enabled: boolean) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ mode, limit: '100' });
      const res = await window.fetch(`/api/leaderboard?${params.toString()}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setRows(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    if (enabled) loadRows();
  }, [enabled, loadRows]);

  return { rows, loading, error, refetch: loadRows };
}
