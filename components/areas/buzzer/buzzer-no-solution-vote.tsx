'use client';

import { motion, useReducedMotion } from 'framer-motion';

type BuzzerNoSolutionVoteProps = {
  votes: string[];
  totalPlayers: number;
  hasVoted: boolean;
  isDisabled: boolean;
  onVote: () => void;
};

const BuzzerNoSolutionVote = ({
  votes,
  totalPlayers,
  hasVoted,
  isDisabled,
  onVote,
}: BuzzerNoSolutionVoteProps) => {
  const reduceMotion = useReducedMotion();
  const disabled = hasVoted || isDisabled;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <motion.button
        whileTap={disabled || reduceMotion ? undefined : { scale: 0.95 }}
        disabled={disabled}
        onClick={onVote}
        className={`rounded-2xl border-2 px-3 py-1.5 text-xs font-bold transition-colors sm:px-4 sm:py-2 sm:text-sm
          ${
            hasVoted
              ? 'cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500'
              : isDisabled
                ? 'cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500'
                : 'cursor-pointer border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:border-teal-700 dark:bg-teal-900/20 dark:text-teal-400 dark:hover:bg-teal-900/30'
          }`}
      >
        {hasVoted ? (
          <>
            <span className="sm:hidden">已投</span>
            <span className="hidden sm:inline">已投票</span>
          </>
        ) : (
          <>
            <span className="sm:hidden">無解？</span>
            <span className="hidden sm:inline">我覺得此題無解</span>
          </>
        )}
      </motion.button>
      <span className="text-xs text-muted-foreground">
        {votes.length} / {totalPlayers} 票
      </span>
    </div>
  );
};

export default BuzzerNoSolutionVote;
