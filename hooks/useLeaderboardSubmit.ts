'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useGuestStore } from '@/stores/guest-store';
import { useLoginPromptPreferenceStore } from '@/stores/login-prompt-preference-store';
import { usePendingScoreStore } from '@/stores/pending-score-store';
import { LeaderboardMode } from './useLeaderboard';

export type LeaderboardSubmitState =
  | { status: 'idle' | 'submitting' | 'error' }
  | { status: 'done'; updated: boolean };

const IDLE: LeaderboardSubmitState = { status: 'idle' };

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

async function fetchSessionToken(mode: LeaderboardMode): Promise<string> {
  const { token } = await postJson<{ token: string }>(
    '/api/leaderboard/session',
    { mode },
  );
  return token;
}

/**
 * 排行榜提交流程（見 docs/adr/0011）：
 * 1. 遊戲進行中（result 為 null）先向 server 取開局憑證
 * 2. 結束時（result 有值）用憑證換成績收據，server 會檢查成績與經過時間
 * 3. 已登入（Google 或訪客）直接用收據上榜；未登入則把收據存進 pending，登入後由 PendingScoreSubmitter 補送
 *
 * 開局憑證取得失敗時這一局不會上榜（best-effort，不打擾玩家）
 */
export function useLeaderboardSubmit(
  mode: LeaderboardMode,
  result: Record<string, number> | null,
): LeaderboardSubmitState {
  const { data: session } = useSession();
  const { guestId, guestName, guestKey } = useGuestStore();
  const { skipLoginPrompt } = useLoginPromptPreferenceStore();
  const { setPendingScore, clearPendingScore } = usePendingScoreStore();
  const [state, setState] = useState<LeaderboardSubmitState>(IDLE);

  const sessionTokenRef = useRef<Promise<string> | null>(null);
  const finishedRef = useRef(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const submittedRef = useRef(false);

  const hasGoogle = !!session?.user;
  const hasGuest = !!guestId && !!guestName;
  const isIdentified = hasGoogle || hasGuest;

  // 1. 遊戲進行中：取開局憑證；開新局時重置上一局的狀態
  useEffect(() => {
    if (result) return;
    finishedRef.current = false;
    submittedRef.current = false;
    setReceipt(null); // eslint-disable-line react-hooks/set-state-in-effect
    setState(s => (s.status === 'idle' ? s : IDLE));
    if (!sessionTokenRef.current) {
      const pending = fetchSessionToken(mode);
      // 失敗時清掉，下一局重新取
      pending.catch(() => {
        if (sessionTokenRef.current === pending) sessionTokenRef.current = null;
      });
      sessionTokenRef.current = pending;
    }
  }, [result, mode]);

  // 2. 結束：用開局憑證換成績收據
  useEffect(() => {
    if (!result || finishedRef.current) return;
    finishedRef.current = true;
    const tokenPromise = sessionTokenRef.current;
    // 這張開局憑證已經用掉，下一局要重新取
    sessionTokenRef.current = null;
    if (!tokenPromise) {
      setState({ status: 'error' });
      return;
    }
    setState({ status: 'submitting' });
    tokenPromise
      .then(token =>
        postJson<{ receipt: string }>('/api/leaderboard/finish', {
          mode,
          token,
          payload: result,
        }),
      )
      .then(({ receipt }) => setReceipt(receipt))
      .catch(() => setState({ status: 'error' }));
  }, [result, mode]);

  // 3. 有收據之後：已登入就上榜，未登入就存進 pending 等登入後補送
  useEffect(() => {
    if (!receipt || submittedRef.current) return;
    if (!isIdentified) {
      if (!skipLoginPrompt) setPendingScore({ mode, receipt });
      setState(IDLE); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    submittedRef.current = true;
    setState({ status: 'submitting' });
    const body = hasGoogle
      ? { mode, receipt }
      : { mode, receipt, guestId, guestName, guestKey };
    postJson<{ updated?: boolean }>('/api/leaderboard', body)
      .then(data => {
        // 這張收據已經上榜，pending 裡如果是同一張就不用再送
        if (usePendingScoreStore.getState().pendingScore?.receipt === receipt) {
          clearPendingScore();
        }
        setState({ status: 'done', updated: !!data.updated });
      })
      .catch(() => setState({ status: 'error' }));
  }, [
    receipt,
    isIdentified,
    hasGoogle,
    guestId,
    guestName,
    guestKey,
    mode,
    skipLoginPrompt,
    setPendingScore,
    clearPendingScore,
  ]);

  return state;
}
