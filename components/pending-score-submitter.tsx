'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useSession } from 'next-auth/react';
import { useGuestStore } from '@/stores/guest-store';
import { usePendingScoreStore } from '@/stores/pending-score-store';

export function PendingScoreSubmitter() {
  const { data: session } = useSession();
  const { guestId, guestName } = useGuestStore();
  const { pendingScore, clearPendingScore } = usePendingScoreStore();
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!pendingScore || submittedRef.current) return;

    const hasGoogle = !!session?.user;
    const hasGuest = !!guestId && !!guestName;
    if (!hasGoogle && !hasGuest) return;

    submittedRef.current = true;

    const body = hasGoogle
      ? { mode: pendingScore.mode, payload: pendingScore.payload }
      : { mode: pendingScore.mode, payload: pendingScore.payload, guestId, guestName };

    fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(res => res.json())
      .then((data: { ok?: boolean; updated?: boolean }) => {
        clearPendingScore();
        if (data.ok) {
          toast.success('分數已同步至排行榜！');
        }
      })
      .catch(() => {
        submittedRef.current = false;
      });
  }, [session, guestId, guestName, pendingScore, clearPendingScore]);

  return null;
}
