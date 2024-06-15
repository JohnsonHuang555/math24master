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

type EditRoomNameModalProps = {
  roomName?: string;
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (editedRoomName: string) => void;
};

const EditRoomNameModal = ({
  roomName,
  isOpen,
  onSubmit,
  onOpenChange,
}: EditRoomNameModalProps) => {
  const [editedRoomName, setEditedRoomName] = useState('');

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
              defaultValue={roomName}
              className="col-span-3"
              onChange={e => setEditedRoomName(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={() => onSubmit(editedRoomName)}>
            儲存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditRoomNameModal;
