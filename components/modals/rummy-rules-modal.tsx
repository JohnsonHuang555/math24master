'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { RummyRulesContent } from './rummy-rules-content';

type RummyRulesModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function RummyRulesModal({ isOpen, onClose }: RummyRulesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">拉密模式規則</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 text-sm">
          <RummyRulesContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}
