'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type GuestLoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
};

export function GuestLoginModal({ isOpen, onClose, onConfirm }: GuestLoginModalProps) {
  const [name, setName] = useState('');
  const t = useTranslations('Common');
  const trimmed = name.trim();

  const handleConfirm = () => {
    if (trimmed.length < 2) return;
    onConfirm(trimmed);
    setName('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>{t('guestLogin')}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          {t('guestLoginDescription')}
        </p>
        <Input
          placeholder={t('nicknamePlaceholder')}
          maxLength={12}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleConfirm()}
          autoFocus
        />
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={trimmed.length < 2}>
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
