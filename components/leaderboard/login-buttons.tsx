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
          size="sm"
          className="h-8 flex-1 rounded-xl text-xs font-bold"
          onClick={() => signIn('google')}
        >
          {t('googleLogin')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 flex-1 rounded-xl text-xs font-bold"
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
