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
import { Label } from '@/components/ui/label';

type PlayerNameModalProps = {
  defaultValue?: string;
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (playerName: string) => void;
  closeDisabled?: boolean;
};

export function PlayerNameModal({
  defaultValue,
  isOpen,
  onOpenChange,
  onConfirm,
  closeDisabled,
}: PlayerNameModalProps) {
  const [playerName, setPlayerName] = useState('');

  return (
    <Dialog
      open={isOpen}
      onOpenChange={v => {
        if (!closeDisabled) {
          onOpenChange(v);
        }
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>玩家暱稱</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="player-name" className="text-right">
            暱稱
          </Label>
          <Input
            id="player-name"
            placeholder="請輸入玩家暱稱"
            className="col-span-3"
            defaultValue={defaultValue}
            onChange={e => setPlayerName(e.target.value)}
          />
        </div>
        <DialogFooter>
          {!closeDisabled && (
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              取消
            </Button>
          )}
          <Button type="submit" onClick={() => onConfirm(playerName)}>
            確定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
