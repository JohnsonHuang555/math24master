import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('RoundHistory');
  return (
    <li className="rounded-2xl border-2 border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground">
          {t('question', { round: record.round })}
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
            {t('yours', { score: record.playerScore })}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-foreground">
            {record.bestFormula} = 24
          </span>
          <span className="shrink-0 text-xs font-semibold text-muted-foreground">
            {t('best', { score: record.bestScore })}
          </span>
        </div>
      </div>

      <div className="mt-2">
        {record.isPerfect ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t('alreadyBest')}
          </span>
        ) : (
          <span className="text-xs font-semibold text-muted-foreground">
            {t('couldEarnMore', {
              points: record.bestScore - record.playerScore,
            })}
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
  const t = useTranslations('RoundHistory');
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent sheet className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        {roundHistory.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t('empty')}
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
