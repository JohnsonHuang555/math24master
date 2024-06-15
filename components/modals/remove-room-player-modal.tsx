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
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>是否踢除玩家？</AlertDialogTitle>
          <AlertDialogDescription>
            此玩家將會離開房間，確定要踢除嗎？
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={onSubmit}>確定</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RemoveRoomPlayerModal;
