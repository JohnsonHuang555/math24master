import { useTranslations } from 'next-intl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type RemoveRoomPlayerModalProps = {
  isOpen: boolean;
  onSubmit: () => void;
  onOpenChange: (v: boolean) => void;
};

const RemoveRoomPlayerModal = ({
  isOpen,
  onSubmit,
  onOpenChange,
}: RemoveRoomPlayerModalProps) => {
  const t = useTranslations('Multiplayer.kick');
  const tCommon = useTranslations('Common');
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onSubmit}>
            {t('confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RemoveRoomPlayerModal;
