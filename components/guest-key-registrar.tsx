'use client';

import { useEffect, useRef } from 'react';
import { useGuestStore } from '@/stores/guest-store';

/**
 * 有訪客身分、但密鑰還沒向 server 登記時登記一次（見 docs/adr/0012）。
 * 越早登記，別人越沒有機會拿排行榜上公開的 guestId 搶先登記。
 * 如果這個 guestId 已經被別人登記走，就保留暱稱、換一組新的 guestId
 */
export function GuestKeyRegistrar() {
  const {
    guestId,
    guestKey,
    guestKeyRegistered,
    markGuestKeyRegistered,
    renewGuestId,
  } = useGuestStore();
  const inFlightRef = useRef<string | null>(null);

  useEffect(() => {
    if (!guestId || !guestKey || guestKeyRegistered) return;
    if (inFlightRef.current === guestId) return;
    inFlightRef.current = guestId;

    fetch('/api/leaderboard/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestId, guestKey }),
    })
      .then(res => {
        if (res.ok) markGuestKeyRegistered();
        else if (res.status === 403) renewGuestId();
        // 其他錯誤（網路、頻率限制）下次載入頁面再試
      })
      .catch(() => {})
      .finally(() => {
        inFlightRef.current = null;
      });
  }, [
    guestId,
    guestKey,
    guestKeyRegistered,
    markGuestKeyRegistered,
    renewGuestId,
  ]);

  return null;
}
