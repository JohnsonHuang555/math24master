'use client';

import { motion } from 'framer-motion';

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
  const disabled = hasVoted || isDisabled;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.button
        whileTap={disabled ? {} : { scale: 0.95 }}
        disabled={disabled}
        onClick={onVote}
        className={`rounded-xl border-2 px-5 py-2 text-sm font-semibold transition-all
          ${hasVoted
            ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
            : isDisabled
            ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
            : 'border-teal-400 bg-teal-50 text-teal-700 hover:bg-teal-100 cursor-pointer'
          }`}
      >
        {hasVoted ? '已投票' : '此題無解'}
      </motion.button>
      <span className="text-xs text-gray-500">
        已有 {votes.length} / {totalPlayers} 人投票
      </span>
    </div>
  );
};

export default BuzzerNoSolutionVote;
