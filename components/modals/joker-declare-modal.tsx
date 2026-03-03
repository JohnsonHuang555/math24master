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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CardColor } from '@/models/Player';

const COLOR_LABELS: Record<CardColor, string> = {
  red: '紅色',
  blue: '藍色',
  yellow: '黃色',
  black: '黑色',
};

type JokerDeclareModalProps = {
  isOpen: boolean;
  jokerCardId: string;
  onConfirm: (jokerCardId: string, value: number, color: CardColor) => void;
  onCancel: () => void;
};

export const JokerDeclareModal = ({
  isOpen,
  jokerCardId,
  onConfirm,
  onCancel,
}: JokerDeclareModalProps) => {
  const [value, setValue] = useState('1');
  const [color, setColor] = useState<CardColor>('red');

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onCancel()}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>宣告 Joker 數值與顏色</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">數值</Label>
            <Select defaultValue={value} onValueChange={setValue}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="選擇數值" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {Array.from({ length: 13 }, (_, i) => i + 1).map(v => (
                    <SelectItem key={v} value={String(v)}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">顏色</Label>
            <Select defaultValue={color} onValueChange={v => setColor(v as CardColor)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="選擇顏色" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {(Object.keys(COLOR_LABELS) as CardColor[]).map(c => (
                    <SelectItem key={c} value={c}>
                      {COLOR_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel}>
            取消
          </Button>
          <Button
            onClick={() => onConfirm(jokerCardId, Number(value), color)}
          >
            確定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
