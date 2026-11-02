'use client';

import { LogOut } from 'lucide-react';
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
    <div className="flex h-11 min-w-0 items-center gap-2 rounded-full border border-line bg-surface pr-1 pl-1.5">
      <PlayerAvatar name={name} photoURL={photoURL} size={30} isMe />
      <span className="max-w-32 truncate text-sm font-bold text-ink">
        {name}
      </span>
      {isGuest && (
        <span className="shrink-0 rounded-md bg-sunken px-1.5 py-px text-[11px] font-bold text-ink-2">
          {t('guest')}
        </span>
      )}
      <button
        type="button"
        onClick={onSignOut}
        aria-label={t('signOut')}
        title={t('signOut')}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
