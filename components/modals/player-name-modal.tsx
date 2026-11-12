import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { containsProfanity } from '@/lib/profanity';

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
  const t = useTranslations('Multiplayer.playerName');
  const tCommon = useTranslations('Common');
  const isInappropriate = containsProfanity(playerName);

  const confirm = () => {
    if (isInappropriate) return;
    onConfirm(playerName.trim());
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') confirm();
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
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="player-name" className="text-right">
            {t('label')}
          </Label>
          <Input
            id="player-name"
            placeholder={t('placeholder')}
            className="col-span-3"
            defaultValue={defaultValue}
            onChange={e => setPlayerName(e.target.value)}
            onKeyDown={onKeyDown}
            aria-invalid={isInappropriate}
          />
          {isInappropriate && (
            <p
              role="alert"
              className="col-span-3 col-start-2 text-xs font-semibold text-danger-ink"
            >
              {tCommon('nicknameInappropriate')}
            </p>
          )}
        </div>
        <DialogFooter>
          {!closeDisabled && (
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
          )}
          <Button type="submit" onClick={confirm} disabled={isInappropriate}>
            {tCommon('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
