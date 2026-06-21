'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GameOverModal } from '@/components/modals/game-over-modal';
import { NumberCard } from '@/models/Player';
import { SelectedCard } from '@/models/SelectedCard';
import { Symbol } from '@/models/Symbol';
import { useBuzzerPlay } from '@/providers/buzzer-play-provider';
import { useMultiplePlay } from '@/providers/multiple-play-provider';
import BuzzerAnswerPanel from './buzzer-answer-panel';
import BuzzerButton from './buzzer-button';
import BuzzerNoSolutionVote from './buzzer-no-solution-vote';
import BuzzerPlayerCard from './buzzer-player-card';
import BuzzerPublicCards from './buzzer-public-cards';
import BuzzerRoundTimer from './buzzer-round-timer';

type Props = { roomId: string };

export default function BuzzerGameBoard({ roomId }: Props) {
  const {
    publicCards,
    roundNumber,
    roundSeconds,
    roundRemaining,
    roundTimerPaused,
    isBuzzerOpen,
    countdownValue,
    currentAnswerPlayerId,
    answerSeconds,
    answerRemaining,
    playerStates,
    noSolutionVotes,
    totalPlayers,
    lastAnswerResult,
    gameOver,
    buzzIn,
    submitAnswer,
    voteNoSolution,
  } = useBuzzerPlay();

  const { roomInfo, playerId } = useMultiplePlay();

  const [selectedCards, setSelectedCards] = useState<SelectedCard[]>([]);

  const isCurrentAnswerer = currentAnswerPlayerId === playerId;
  const isAnswering = currentAnswerPlayerId !== null;
  const myState = playerId ? playerStates[playerId] : undefined;

  // 計算鎖定剩餘秒數（client-side）
  const lockRemaining = (() => {
    if (!myState?.isLocked || !myState.lockUntil) return 0;
    return Math.max(0, Math.ceil((myState.lockUntil - Date.now()) / 1000));
  })();

  const hasVotedNoSolution = playerId ? noSolutionVotes.includes(playerId) : false;

  const handleSelectCard = (card: NumberCard) => {
    setSelectedCards(prev => [...prev, { number: card }]);
  };

  const handleSelectSymbol = (symbol: Symbol) => {
    setSelectedCards(prev => [...prev, { symbol }]);
  };

  const handleClear = () => setSelectedCards([]);

  const handleSubmit = () => {
    submitAnswer(roomId, selectedCards);
    setSelectedCards([]);
  };

  // 作答結束後清除已選牌
  const prevAnswererId = currentAnswerPlayerId;
  if (prevAnswererId !== null && currentAnswerPlayerId === null && selectedCards.length > 0) {
    setSelectedCards([]);
  }

  if (!roomInfo) return null;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-start gap-4 p-4 md:p-6">

      {/* 遊戲結束 Modal */}
      {gameOver && (
        <GameOverModal
          isOpen={!!gameOver}
          onClose={() => (window.location.href = '/multiple-play')}
          players={gameOver.players as any}
          currentPlayerId={playerId}
          isMultiplePlay
          onPlayAgain={() => (window.location.href = '/multiple-play')}
          onGoHome={() => (window.location.href = '/multiple-play')}
        />
      )}

      {/* 答題結果 Toast */}
      <AnimatePresence>
        {lastAnswerResult && (
          <motion.div
            key="answer-result"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-6 py-3 text-sm font-bold shadow-lg ${
              lastAnswerResult.isCorrect
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            {lastAnswerResult.isCorrect
              ? `✓ 答對！+${lastAnswerResult.scoreDelta} 分${lastAnswerResult.streakBonus > 0 ? `（含連勝獎勵 +${lastAnswerResult.streakBonus}）` : ''}`
              : `✗ 答錯，-${Math.abs(lastAnswerResult.scoreDelta)} 分`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 頂部：回合資訊 + 計時器 */}
      <div className="flex w-full max-w-4xl items-center justify-between">
        <div className="text-sm font-semibold text-muted-foreground">
          第 {roundNumber} 回合
        </div>
        <BuzzerRoundTimer
          roundSeconds={roundSeconds}
          roundRemaining={roundRemaining}
          isPaused={roundTimerPaused}
        />
        <BuzzerNoSolutionVote
          votes={noSolutionVotes}
          totalPlayers={totalPlayers}
          hasVoted={hasVotedNoSolution}
          isDisabled={isAnswering}
          onVote={() => voteNoSolution(roomId)}
        />
      </div>

      {/* 中央：公共牌 */}
      <BuzzerPublicCards
        cards={publicCards}
        countdownValue={countdownValue}
        isBuzzerOpen={isBuzzerOpen}
      />

      {/* 作答時間倒數（所有人可見） */}
      {isAnswering && answerRemaining !== null && (
        <div className="flex flex-col items-center gap-1">
          <div className="text-xs text-muted-foreground">
            {roomInfo.players.find(p => p.id === currentAnswerPlayerId)?.name ?? ''} 作答中
          </div>
          <div className={`text-2xl font-bold tabular-nums ${answerRemaining <= 5 ? 'text-red-500' : 'text-foreground'}`}>
            {answerRemaining}s
          </div>
        </div>
      )}

      {/* 作答區域（搶答者顯示互動版，其他人顯示唯讀） */}
      {(isAnswering || isCurrentAnswerer) && (
        <div className="w-full max-w-2xl">
          <BuzzerAnswerPanel
            publicCards={publicCards}
            selectedCards={selectedCards}
            onSelectCard={handleSelectCard}
            onSelectSymbol={handleSelectSymbol}
            onClear={handleClear}
            onSubmit={handleSubmit}
            isAnswerer={isCurrentAnswerer}
          />
        </div>
      )}

      {/* 搶答按鈕（非作答中時顯示） */}
      {!isCurrentAnswerer && (
        <BuzzerButton
          isLocked={myState?.isLocked ?? false}
          lockRemaining={lockRemaining}
          isBuzzerOpen={isBuzzerOpen}
          isAnswering={isAnswering}
          isCurrentAnswerer={false}
          onBuzz={() => buzzIn(roomId)}
        />
      )}

      {/* 玩家列表 */}
      <div className="mt-auto flex w-full max-w-4xl flex-wrap justify-center gap-3">
        {roomInfo.players.map(player => (
          <BuzzerPlayerCard
            key={player.id}
            player={player}
            playerState={playerStates[player.id]}
            isCurrentAnswerer={currentAnswerPlayerId === player.id}
            isCurrentPlayer={player.id === playerId}
          />
        ))}
      </div>
    </div>
  );
}
