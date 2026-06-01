'use client';

import { useState } from 'react';
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
          <DialogTitle>訪客登入</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          輸入暱稱即可上榜，資料儲存於此裝置
        </p>
        <Input
          placeholder="請輸入暱稱（2–12 字）"
          maxLength={12}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleConfirm()}
          autoFocus
        />
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={trimmed.length < 2}>
            確定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
