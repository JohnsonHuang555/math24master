'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { LeaderboardMode, LeaderboardRow } from '@/lib/leaderboard';
import { useGuestStore } from '@/stores/guest-store';

export type MyRankState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'none' }
  | { status: 'error' }
  | { status: 'ranked'; row: LeaderboardRow };

// 個人名次另走不快取的 /api/leaderboard/rank，前 100 名列表則維持 CDN 快取
export function useMyRank(mode: LeaderboardMode, enabled = true) {
  const { data: session, status: sessionStatus } = useSession();
  const guestId = useGuestStore(s => s.guestId);
  const googleId = (session?.user as { id?: string } | undefined)?.id;
  const myId = googleId ?? guestId ?? undefined;

  // 以 mode + 身分作為 key，切換模式或登入身分時舊結果自動失效（回到 loading）
  const key = `${mode}:${myId ?? ''}`;
  const [fetched, setFetched] = useState<{
    key: string;
    state: MyRankState;
  } | null>(null);

  // 送分前後可能各查一次，只採用最後發出的那次，避免較慢的舊回應蓋掉新名次
  const requestSeqRef = useRef(0);

  const load = useCallback(async () => {
    if (!myId) return;
    const seq = ++requestSeqRef.current;
    const settle = (next: MyRankState) => {
      if (seq === requestSeqRef.current) setFetched({ key, state: next });
    };
    try {
      const params = new URLSearchParams({ mode });
      if (!googleId) params.set('guestId', myId);
      const res = await window.fetch(
        `/api/leaderboard/rank?${params.toString()}`,
        { cache: 'no-store' },
      );
      if (!res.ok) throw new Error('fetch failed');
      const data = (await res.json()) as LeaderboardRow | null;
      settle(data ? { status: 'ranked', row: data } : { status: 'none' });
    } catch {
      settle({ status: 'error' });
    }
  }, [key, mode, myId, googleId]);

  useEffect(() => {
    if (enabled && sessionStatus !== 'loading') load();
  }, [enabled, sessionStatus, load]);

  let state: MyRankState;
  if (sessionStatus === 'loading') state = { status: 'loading' };
  else if (!myId) state = { status: 'anonymous' };
  else if (fetched?.key === key) state = fetched.state;
  else state = { status: 'loading' };

  return { state, myId, refetch: load };
}
