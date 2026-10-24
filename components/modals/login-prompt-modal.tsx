'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useGuestStore } from '@/stores/guest-store';

type View = 'choose' | 'guest';

type LoginPromptModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSkip: () => void;
  onSkipForever: () => void;
};

export function LoginPromptModal({ isOpen, onClose, onSkip, onSkipForever }: LoginPromptModalProps) {
  const [view, setView] = useState<View>('choose');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [dontRemind, setDontRemind] = useState(false);
  const t = useTranslations('LoginPrompt');
  const tCommon = useTranslations('Common');
  const trimmed = name.trim();

  const { setGuest } = useGuestStore();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setView('choose');
      setName('');
      onSkip();
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    await signIn('google', { callbackUrl: window.location.href });
  };

  const handleGuestConfirm = () => {
    if (trimmed.length < 2) return;
    setGuest(trimmed);
    setName('');
    setView('choose');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        {view === 'choose' && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-center mb-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <Trophy className="h-6 w-6 text-amber-500" />
                </div>
              </div>
              <DialogTitle className="text-center">{t('title')}</DialogTitle>
            </DialogHeader>
            <p className="text-center text-sm text-muted-foreground">
              {t('description')}
            </p>
            <div className="flex flex-col gap-3 py-2">
              <Button
                onClick={handleGoogleLogin}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                {t('google')}
              </Button>
              <Button
                onClick={() => setView('guest')}
                variant="outline"
                className="w-full"
              >
                {tCommon('guestLogin')}
              </Button>
            </div>
            <div className="flex justify-center items-center gap-2">
              <Checkbox
                id="dont-remind"
                checked={dontRemind}
                onCheckedChange={v => setDontRemind(!!v)}
              />
              <label
                htmlFor="dont-remind"
                className="text-sm text-muted-foreground cursor-pointer select-none"
              >
                {tCommon('dontRemindAgain')}
              </label>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={dontRemind ? onSkipForever : onSkip}
              >
                {t('skip')}
              </Button>
            </DialogFooter>
          </>
        )}

        {view === 'guest' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => { setView('choose'); setName(''); }}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DialogTitle>{tCommon('guestLogin')}</DialogTitle>
              </div>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              {tCommon('guestLoginDescription')}
            </p>
            <Input
              placeholder={tCommon('nicknamePlaceholder')}
              maxLength={12}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGuestConfirm()}
              autoFocus
            />
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => { setView('choose'); setName(''); }}
              >
                {tCommon('back')}
              </Button>
              <Button onClick={handleGuestConfirm} disabled={trimmed.length < 2}>
                {tCommon('confirm')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
