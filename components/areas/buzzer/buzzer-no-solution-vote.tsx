'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type BuzzerNoSolutionVoteProps = {
  votes: string[];
  totalPlayers: number;
  hasVoted: boolean;
  isDisabled: boolean;
  onVote: () => void;
};

/** 無解投票：票數放在按鈕裡，頂部列維持單行 */
const BuzzerNoSolutionVote = ({
  votes,
  totalPlayers,
  hasVoted,
  isDisabled,
  onVote,
}: BuzzerNoSolutionVoteProps) => {
  const disabled = hasVoted || isDisabled;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onVote}
      aria-label={`${hasVoted ? '已投票' : '我覺得此題無解'}，${votes.length} / ${totalPlayers} 票`}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-[13px] font-bold transition-colors',
        hasVoted
          ? 'border-primary bg-primary-tint text-primary-ink'
          : 'border-line-strong bg-surface text-ink hover:bg-sunken disabled:opacity-45',
      )}
    >
      {hasVoted && <Check aria-hidden className="h-4 w-4" />}
      <span className="sm:hidden">{hasVoted ? '已投' : '無解？'}</span>
      <span className="hidden sm:inline">
        {hasVoted ? '已投票' : '我覺得此題無解'}
      </span>
      <span className="font-display text-ink-2 tabular-nums">
        {votes.length}/{totalPlayers}
      </span>
    </button>
  );
};

export default BuzzerNoSolutionVote;
