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
  const t = useTranslations('Multiplayer.roomPassword');
  const tCommon = useTranslations('Common');

  const onKeyDown = (e: any) => {
    if (e.keyCode === 13) {
      if (!password) {
        toast.warning(t('required'));
        return;
      }
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
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="room-name" className="text-right">
              {t('label')}
            </Label>
            <Input
              id="password"
              placeholder={t('placeholder')}
              className="col-span-3"
              onChange={e => setPassword(e.target.value)}
              onKeyDown={onKeyDown}
            />
          </div>
        </div>
        <DialogFooter>
          {!closeDisabled && (
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
          )}
          <Button
            type="submit"
            onClick={() => {
              if (!password) {
                toast.warning(t('required'));
                return;
              }
              onSubmit(password);
            }}
          >
            {tCommon('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnterRoomPasswordModal;
