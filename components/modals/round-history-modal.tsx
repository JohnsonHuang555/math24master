import { CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RoundRecord } from '@/models/Player';

type RoundHistoryModalProps = {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  roundHistory: RoundRecord[];
};

function RoundHistoryItem({ record }: { record: RoundRecord }) {
  return (
    <li className="rounded-2xl border-2 border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground">
          第 {record.round} 題
        </span>
        <div className="flex gap-1">
          {record.cardValues.map((value, i) => (
            <span
              key={i}
              className="flex h-6 w-6 items-center justify-center rounded-lg border border-zinc-200 bg-white text-xs font-bold text-foreground dark:border-zinc-700 dark:bg-zinc-900"
            >
              {value}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-2 space-y-1 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-foreground">
            {record.playerFormula} = 24
          </span>
          <span className="shrink-0 text-xs font-semibold text-muted-foreground">
            你的算式 · {record.playerScore} 分
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-foreground">
            {record.bestFormula} = 24
          </span>
          <span className="shrink-0 text-xs font-semibold text-muted-foreground">
            最佳解 · {record.bestScore} 分
          </span>
        </div>
      </div>

      <div className="mt-2">
        {record.isPerfect ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500">
            <CheckCircle2 className="h-3.5 w-3.5" />
            已是最佳解
          </span>
        ) : (
          <span className="text-xs font-semibold text-muted-foreground">
            最佳解可多得 {record.bestScore - record.playerScore} 分
          </span>
        )}
      </div>
    </li>
  );
}

export function RoundHistoryModal({
  isOpen,
  onOpenChange,
  roundHistory,
}: RoundHistoryModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>作答紀錄</DialogTitle>
        </DialogHeader>

        {roundHistory.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            本局沒有作答紀錄
          </p>
        ) : (
          <ul className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto pr-1">
            {roundHistory.map(record => (
              <RoundHistoryItem key={record.round} record={record} />
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
