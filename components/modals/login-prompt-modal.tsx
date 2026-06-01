'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { ArrowLeft, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
};

export function LoginPromptModal({ isOpen, onClose, onSkip }: LoginPromptModalProps) {
  const [view, setView] = useState<View>('choose');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
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
              <DialogTitle className="text-center">同步至排行榜</DialogTitle>
            </DialogHeader>
            <p className="text-center text-sm text-muted-foreground">
              登入後可將此局分數同步至排行榜，與其他玩家比較成績！
            </p>
            <div className="flex flex-col gap-3 py-2">
              <Button
                onClick={handleGoogleLogin}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                使用 Google 登入
              </Button>
              <Button
                onClick={() => setView('guest')}
                variant="outline"
                className="w-full"
              >
                訪客登入
              </Button>
            </div>
            <DialogFooter>
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={onSkip}>
                暫不登入
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
                <DialogTitle>訪客登入</DialogTitle>
              </div>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              輸入暱稱即可上榜，資料儲存於此裝置
            </p>
            <Input
              placeholder="請輸入暱稱（2–12 字）"
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
                返回
              </Button>
              <Button onClick={handleGuestConfirm} disabled={trimmed.length < 2}>
                確定
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
