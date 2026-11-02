'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { GuestLoginModal } from '@/components/modals/guest-login-modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGuestStore } from '@/stores/guest-store';

export function LoginButtons({ className }: { className?: string }) {
  const setGuest = useGuestStore(s => s.setGuest);
  const [showGuestLogin, setShowGuestLogin] = useState(false);
  const t = useTranslations('Leaderboard');
  const tCommon = useTranslations('Common');

  return (
    <>
      <div className={cn('flex gap-2', className)}>
        <Button
          variant="outline"
          className="h-11 flex-1 rounded-xl border-[1.5px] border-line-strong bg-surface text-sm font-bold text-ink hover:bg-sunken"
          onClick={() => signIn('google')}
        >
          {t('googleLogin')}
        </Button>
        <Button
          variant="ghost"
          className="h-11 flex-1 rounded-xl text-sm font-bold text-primary-ink hover:bg-primary-tint hover:text-primary-ink"
          onClick={() => setShowGuestLogin(true)}
        >
          {tCommon('guestLogin')}
        </Button>
      </div>
      <GuestLoginModal
        isOpen={showGuestLogin}
        onClose={() => setShowGuestLogin(false)}
        onConfirm={name => {
          setGuest(name);
          setShowGuestLogin(false);
        }}
      />
    </>
  );
}
