import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
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
  const t = useTranslations('Multiplayer.editRoom');
  const tCreate = useTranslations('Multiplayer.createRoom');
  const tPassword = useTranslations('Multiplayer.roomPassword');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="room-name" className="text-right">
              {tCreate('roomName')}
            </Label>
            <Input
              id="room-name"
              defaultValue={roomName}
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
              className="col-span-3 text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {tCreate('setPassword')}
            </label>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div />
            <Input
              id="room-password"
              placeholder={tCreate('passwordPlaceholder')}
              className="col-span-3"
              defaultValue={editedPassword}
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
                toast.warning(tPassword('required'));
                return;
              }
              onSubmit(editedRoomName, editedPassword);
            }}
          >
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditRoomModal;
