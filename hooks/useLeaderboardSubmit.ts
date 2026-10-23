'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useGuestStore } from '@/stores/guest-store';
import { LeaderboardMode } from './useLeaderboard';

export type LeaderboardSubmitState =
  | { status: 'idle' | 'submitting' | 'error' }
  | { status: 'done'; updated: boolean };

const IDLE: LeaderboardSubmitState = { status: 'idle' };

export function useLeaderboardSubmit(
  mode: LeaderboardMode,
  payload: Record<string, unknown> | null,
  enabled: boolean,
): LeaderboardSubmitState {
  const { data: session } = useSession();
  const { guestId, guestName } = useGuestStore();
  const submittedRef = useRef(false);
  const [state, setState] = useState<LeaderboardSubmitState>(IDLE);

  useEffect(() => {
    if (!enabled || !payload) {
      // 開新局（回到未完賽狀態）時重置，下次完賽才能再提交
      submittedRef.current = false;
      setState(s => (s.status === 'idle' ? s : IDLE));
      return;
    }
    if (submittedRef.current) return;

    const hasGoogle = !!session?.user;
    const hasGuest = !!guestId && !!guestName;
    if (!hasGoogle && !hasGuest) return;

    submittedRef.current = true;
    setState({ status: 'submitting' });

    const body = hasGoogle
      ? { mode, payload }
      : { mode, payload, guestId, guestName };

    fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: { updated?: boolean }) =>
        setState({ status: 'done', updated: !!data.updated }),
      )
      // best-effort：失敗不打擾玩家，只讓名次顯示退回舊資料
      .catch(() => setState({ status: 'error' }));
  }, [enabled, payload, session, mode, guestId, guestName]);

  return state;
}
