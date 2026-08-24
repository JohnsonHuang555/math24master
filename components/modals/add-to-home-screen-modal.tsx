'use client';

import { useState } from 'react';
import { Download, Share, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type AddToHomeScreenModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSkipForever: () => void;
  onInstallClick: () => void;
  isIOS: boolean;
};

export function AddToHomeScreenModal({
  isOpen,
  onClose,
  onSkipForever,
  onInstallClick,
  isIOS,
}: AddToHomeScreenModalProps) {
  const [dontRemind, setDontRemind] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <div className="mb-2 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/30">
              <Smartphone className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
          </div>
          <DialogTitle className="text-center">加到主畫面</DialogTitle>
        </DialogHeader>

        {isIOS ? (
          <div className="space-y-2 text-sm">
            <p className="text-center text-muted-foreground">
              兩步就能把 24 點大師加到主畫面<br />下次可以像 App 一樣開啟遊戲，不用再找網址
            </p>
            <div className="flex items-center gap-3 rounded-xl border-2 border-zinc-100 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/40">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-teal-500 text-xs font-bold text-white">
                1
              </span>
              <span className="flex items-center gap-1.5 text-foreground">
                點選瀏覽器的
                <Share className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                分享鍵
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-xl border-2 border-zinc-100 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/40">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-teal-500 text-xs font-bold text-white">
                2
              </span>
              <span className="text-foreground">選擇「加入主畫面」</span>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            加到主畫面後，下次可以像 App 一樣開啟遊戲，不用再找網址
          </p>
        )}

        <div className="flex items-center justify-center gap-2 pt-1">
          <Checkbox
            id="dont-remind-a2hs"
            checked={dontRemind}
            onCheckedChange={v => setDontRemind(!!v)}
          />
          <label
            htmlFor="dont-remind-a2hs"
            className="cursor-pointer select-none text-sm text-muted-foreground"
          >
            不要再提醒我
          </label>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          {!isIOS && (
            <Button
              variant="tactile"
              className="w-full gap-1.5"
              onClick={onInstallClick}
            >
              <Download className="h-4 w-4" />
              加到主畫面
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full text-muted-foreground"
            onClick={dontRemind ? onSkipForever : onClose}
          >
            {isIOS ? '知道了' : '之後再說'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
