import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type HintModalProps = {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
};

export function HintModal({ isOpen, onOpenChange }: HintModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>提示</DialogTitle>
        </DialogHeader>
        <ol className="list-decimal pl-5">
          <li className="mb-1">第一個符號只能放加號與左括號。</li>
          <li className="mb-1">
            算式 1 (2 + 3) 雖然成立但是要使用到乘號才會算分。
            <br />
            ex. 1 × (2 + 3)
          </li>
          <li className="mb-1">左右括號不計分</li>
        </ol>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>關閉</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
