'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { LeaderboardMode } from './useLeaderboard';

export function useLeaderboardSubmit(
  mode: LeaderboardMode,
  payload: Record<string, unknown> | null,
  enabled: boolean,
) {
  const { data: session } = useSession();
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !payload || !session?.user || submittedRef.current) return;
    submittedRef.current = true;

    fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, payload }),
    }).catch(() => {
      // silent fail — leaderboard submit is best-effort
    });
  }, [enabled, payload, session, mode]);
}
