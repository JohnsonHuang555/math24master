'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TabletopLogEntry } from '@/hooks/useTabletopPlay';

type TabletopHistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: TabletopLogEntry[];
};

/** 出牌紀錄：最新的在最上面 */
export function TabletopHistoryDialog({
  open,
  onOpenChange,
  log,
}: TabletopHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>出牌紀錄</DialogTitle>
          <DialogDescription>
            這一局每個人的行動，最新的在最上面
          </DialogDescription>
        </DialogHeader>
        {log.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            還沒有人出牌
          </p>
        ) : (
          <ol className="flex max-h-[55vh] flex-col gap-1.5 overflow-y-auto pr-1">
            {log.map(entry => (
              <li
                key={entry.id}
                className="flex items-center gap-2 rounded-xl border-2 border-zinc-100 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <span className="shrink-0 font-bold text-foreground">
                  {entry.seatName}
                </span>
                <span className="min-w-0 flex-1 text-muted-foreground">
                  {entry.text}
                </span>
                {entry.score !== null && (
                  <span className="shrink-0 font-display font-bold text-amber-700 dark:text-amber-400">
                    +{entry.score}
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
