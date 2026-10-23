'use client';

import { useState } from 'react';
import {
  CARD_COLORS,
  CARD_COLOR_STYLE,
} from '@/components/tabletop/tabletop-card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { JokerDeclaration } from '@/lib/tabletop-turn-draft';
import { cn } from '@/lib/utils';
import { CardColor } from '@/models/Player';

type JokerDeclareDialogProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: (declaration: JokerDeclaration) => void;
};

export function JokerDeclareDialog({
  open,
  onCancel,
  onConfirm,
}: JokerDeclareDialogProps) {
  const [value, setValue] = useState<number | null>(null);
  const [color, setColor] = useState<CardColor | null>(null);

  const close = () => {
    setValue(null);
    setColor(null);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && close()}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>宣告 Joker</DialogTitle>
          <DialogDescription>
            宣告後就固定不變，之後重組時當作一張普通的牌
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-sm font-bold text-foreground">數值</p>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 13 }, (_, i) => i + 1).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setValue(v)}
                  className={cn(
                    'h-10 rounded-xl border-2 font-display text-lg font-bold transition-colors',
                    value === v
                      ? 'border-primary bg-primary text-white'
                      : 'border-zinc-200 bg-white text-zinc-800 hover:border-primary/50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100',
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-foreground">顏色</p>
            <div className="grid grid-cols-4 gap-2">
              {CARD_COLORS.map(c => {
                const style = CARD_COLOR_STYLE[c];
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      'flex h-11 items-center justify-center gap-1.5 rounded-xl border-2 bg-white font-bold dark:bg-zinc-800',
                      style.text,
                      color === c
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-zinc-200 dark:border-zinc-700',
                    )}
                  >
                    <style.Shape className="h-3 w-3 fill-current" />
                    {style.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="tactileOutline" onClick={close}>
            取消
          </Button>
          <Button
            variant="tactile"
            disabled={value === null || color === null}
            onClick={() => {
              if (value === null || color === null) return;
              onConfirm({ value, color });
              setValue(null);
              setColor(null);
            }}
          >
            確定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
