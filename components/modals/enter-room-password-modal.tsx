import { useState } from 'react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '../ui/label';

type EnterRoomPasswordModalProps = {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (name: string) => void;
  closeDisabled?: boolean;
};

const EnterRoomPasswordModal = ({
  isOpen,
  onSubmit,
  onOpenChange,
  closeDisabled,
}: EnterRoomPasswordModalProps) => {
  const [password, setPassword] = useState('');

  const onKeyDown = (e: any) => {
    if (!password) {
      toast.warning('請輸入房間密碼');
      return;
    }
    if (e.keyCode === 13) {
      onSubmit(password);
    }
  };

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
          <DialogTitle>房間密碼</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="room-name" className="text-right">
              密碼
            </Label>
            <Input
              id="password"
              placeholder="請輸入房間密碼"
              className="col-span-3"
              onChange={e => setPassword(e.target.value)}
              onKeyDown={onKeyDown}
            />
          </div>
        </div>
        <DialogFooter>
          {!closeDisabled && (
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              取消
            </Button>
          )}
          <Button
            type="submit"
            onClick={() => {
              if (!password) {
                toast.warning('請輸入房間密碼');
                return;
              }
              onSubmit(password);
            }}
          >
            確定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnterRoomPasswordModal;
