'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { GuestLoginModal } from '@/components/modals/guest-login-modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGuestStore } from '@/stores/guest-store';

export function LoginButtons({ className }: { className?: string }) {
  const setGuest = useGuestStore(s => s.setGuest);
  const [showGuestLogin, setShowGuestLogin] = useState(false);

  return (
    <>
      <div className={cn('flex gap-2', className)}>
        <Button
          size="sm"
          className="h-8 flex-1 rounded-xl text-xs font-bold"
          onClick={() => signIn('google')}
        >
          Google 登入
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 flex-1 rounded-xl text-xs font-bold"
          onClick={() => setShowGuestLogin(true)}
        >
          訪客登入
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
