'use client';

import { signOut, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useGuestStore } from '@/stores/guest-store';
import { PlayerAvatar } from './player-avatar';

// 排行榜頁右上角的登入身分與登出；未登入時不顯示（登入入口在「我的名次」）
export function AccountChip() {
  const { data: session, status } = useSession();
  const { guestId, guestName, clearGuest } = useGuestStore();
  const t = useTranslations('Leaderboard');

  let name: string;
  let photoURL: string | null = null;
  let isGuest = false;
  let onSignOut: () => void;

  if (status === 'authenticated' && session.user) {
    name = session.user.name ?? '';
    photoURL = session.user.image ?? null;
    onSignOut = () => signOut();
  } else if (guestId && guestName) {
    name = guestName;
    isGuest = true;
    onSignOut = clearGuest;
  } else {
    return null;
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <PlayerAvatar name={name} photoURL={photoURL} size={24} />
      <span className="max-w-32 truncate text-sm font-medium">{name}</span>
      {isGuest && (
        <span className="shrink-0 rounded-md bg-zinc-100 px-1 py-px text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {t('guest')}
        </span>
      )}
      <button
        onClick={onSignOut}
        className="shrink-0 rounded-xl px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800"
      >
        {t('signOut')}
      </button>
    </div>
  );
}
