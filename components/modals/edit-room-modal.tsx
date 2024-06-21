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
import { Label } from '@/components/ui/label';
import { Checkbox } from '../ui/checkbox';

type EditRoomModalProps = {
  roomName: string;
  password?: string;
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (editedRoomName: string, password?: string) => void;
};

const EditRoomModal = ({
  roomName,
  password,
  isOpen,
  onSubmit,
  onOpenChange,
}: EditRoomModalProps) => {
  const [editedRoomName, setEditedRoomName] = useState(roomName);
  const [isSetPassword, setIsSetPassword] = useState(!!password);
  const [editedPassword, setEditedPassword] = useState(password);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>編輯房間名稱</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="room-name" className="text-right">
              房間名稱
            </Label>
            <Input
              id="room-name"
              value={roomName}
              className="col-span-3"
              onChange={e => setEditedRoomName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="flex justify-end">
              <Checkbox
                className="border-border"
                id="allow-password"
                defaultChecked={isSetPassword}
                onCheckedChange={v => {
                  if (!v) setEditedPassword('');
                  setIsSetPassword(Boolean(v));
                }}
              />
            </div>
            <label
              htmlFor="allow-password"
              className="col-span-3 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              是否設定房間密碼
            </label>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div />
            <Input
              id="room-password"
              placeholder="請輸入房間密碼"
              className="col-span-3"
              value={editedPassword}
              onChange={e => {
                setEditedPassword(e.target.value);
              }}
              disabled={!isSetPassword}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={() => {
              if (isSetPassword && !editedPassword) {
                toast.warning('請輸入房間密碼');
                return;
              }
              onSubmit(editedRoomName, editedPassword);
            }}
          >
            儲存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditRoomModal;
