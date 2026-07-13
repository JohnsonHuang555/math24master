'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useGuestStore } from '@/stores/guest-store';
import { LeaderboardMode } from './useLeaderboard';

export function useLeaderboardSubmit(
  mode: LeaderboardMode,
  payload: Record<string, unknown> | null,
  enabled: boolean,
) {
  const { data: session } = useSession();
  const { guestId, guestName } = useGuestStore();
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !payload) {
      // 開新局（回到未完賽狀態）時重置，下次完賽才能再提交
      submittedRef.current = false;
      return;
    }
    if (submittedRef.current) return;

    const hasGoogle = !!session?.user;
    const hasGuest = !!guestId && !!guestName;
    if (!hasGoogle && !hasGuest) return;

    submittedRef.current = true;

    const body = hasGoogle
      ? { mode, payload }
      : { mode, payload, guestId, guestName };

    fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {
      // silent fail — leaderboard submit is best-effort
    });
  }, [enabled, payload, session, mode, guestId, guestName]);
}
