'use client';

import { useTranslations } from 'next-intl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type LeaveGameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeave: () => void;
  /** 預設為「離開後本局進度將不會保存」；牌桌模式等需要另外說明時覆寫 */
  description?: string;
};

/** 各遊戲共用的離開確認：主要按鈕是「繼續遊戲」，避免誤觸離開 */
export function LeaveGameDialog({
  open,
  onOpenChange,
  onLeave,
  description,
}: LeaveGameDialogProps) {
  const t = useTranslations('GameUI.leave');

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? t('description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('stay')}</AlertDialogCancel>
          <AlertDialogAction onClick={onLeave}>{t('leave')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
