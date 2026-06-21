'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BookOpen, LogOut } from 'lucide-react';
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
import { GameOverModal } from '@/components/modals/game-over-modal';
import { RuleModal } from '@/components/modals/rule-modal';
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
  const reduceMotion = useReducedMotion();

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
    answerSelectedCards,
    buzzIn,
    submitAnswer,
    voteNoSolution,
    updateSelection,
  } = useBuzzerPlay();

  const { roomInfo, playerId } = useMultiplePlay();

  const [selectedCards, setSelectedCards] = useState<SelectedCard[]>([]);
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);
  const [isOpenLeaveDialog, setIsOpenLeaveDialog] = useState(false);

  const isCurrentAnswerer = currentAnswerPlayerId === playerId;
  const isAnswering = currentAnswerPlayerId !== null;
  const myState = playerId ? playerStates[playerId] : undefined;

  const lockRemaining = (() => {
    if (!myState?.isLocked || !myState.lockUntil) return 0;
    return Math.max(0, Math.ceil((myState.lockUntil - Date.now()) / 1000));
  })();

  const hasVotedNoSolution = playerId
    ? noSolutionVotes.includes(playerId)
    : false;

  const handleSelectCard = (card: NumberCard) => {
    setSelectedCards(prev => {
      const next = [...prev, { number: card }];
      updateSelection(roomId, next);
      return next;
    });
  };

  const handleSelectSymbol = (symbol: Symbol) => {
    setSelectedCards(prev => {
      const next = [...prev, { symbol }];
      updateSelection(roomId, next);
      return next;
    });
  };

  const handleClear = () => {
    setSelectedCards([]);
    updateSelection(roomId, []);
  };

  const handleSubmit = () => {
    submitAnswer(roomId, selectedCards);
    setSelectedCards([]);
    updateSelection(roomId, []);
  };

  const prevAnswererId = currentAnswerPlayerId;
  if (
    prevAnswererId !== null &&
    currentAnswerPlayerId === null &&
    selectedCards.length > 0
  ) {
    setSelectedCards([]);
  }

  if (!roomInfo) return null;

  const answeringPlayer = roomInfo.players.find(
    p => p.id === currentAnswerPlayerId,
  );

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      {/* 規則 Modal */}
      <RuleModal isOpen={isOpenRuleModal} onOpenChange={setIsOpenRuleModal} />

      {/* 離開房間確認 */}
      <AlertDialog open={isOpenLeaveDialog} onOpenChange={setIsOpenLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>離開房間？</AlertDialogTitle>
            <AlertDialogDescription>
              離開後將退出目前遊戲，確定要離開嗎？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">取消</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl bg-rose-500 font-bold text-white shadow-[0_4px_0_0_hsl(347_77%_35%)] hover:bg-rose-600 active:translate-y-1 active:shadow-none"
              onClick={() => {
                sessionStorage.removeItem('reconnectToken');
                sessionStorage.removeItem('reconnectRoomId');
                window.location.href = '/multiple-play';
              }}
            >
              離開
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 遊戲結束 Modal */}
      {gameOver && (
        <GameOverModal
          isOpen={!!gameOver}
          onClose={() => (window.location.href = `/multiple-play/${roomId}`)}
          players={gameOver.players as any}
          currentPlayerId={playerId}
          isMultiplePlay
          onPlayAgain={() => (window.location.href = `/multiple-play/${roomId}`)}
          onGoHome={() => (window.location.href = `/multiple-play/${roomId}`)}
        />
      )}

      {/* 全螢幕倒數 overlay */}
      <AnimatePresence>
        {countdownValue !== null && (
          <motion.div
            key="fullscreen-countdown"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-zinc-900/80 backdrop-blur-md"
          >
            <motion.span
              key={countdownValue}
              initial={reduceMotion ? false : { scale: 1.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduceMotion ? undefined : { scale: 0.7, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18 }}
              className="font-display text-[120px] font-black leading-none text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
            >
              {countdownValue}
            </motion.span>
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="mt-4 font-display text-lg font-black tracking-widest text-white/60"
            >
              遊戲準備開始
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 答題結果通知 */}
      <AnimatePresence>
        {lastAnswerResult && (
          <motion.div
            key="answer-result"
            initial={reduceMotion ? false : { opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className={`fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-full px-6 py-3 font-display text-sm font-black shadow-lg ${
              lastAnswerResult.isCorrect
                ? 'bg-primary text-white shadow-[0_4px_0_0_hsl(175_84%_22%)]'
                : 'bg-rose-500 text-white shadow-[0_4px_0_0_hsl(347_77%_35%)]'
            }`}
          >
            {lastAnswerResult.isCorrect
              ? `✓ 答對！+${lastAnswerResult.scoreDelta} 分${lastAnswerResult.streakBonus > 0 ? `（+${lastAnswerResult.streakBonus} 連勝）` : ''}`
              : `✗ 答錯，-${Math.abs(lastAnswerResult.scoreDelta)} 分`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 頂部工具列 */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200/60 px-3 md:h-20 md:px-6 dark:border-zinc-700/40">
        {/* 左側：回合 badge + 工具按鈕 */}
        <div className="flex items-center gap-2">
          <div className="rounded-full border-2 border-primary/20 bg-primary/10 px-3 py-1 md:px-4 md:py-1.5 dark:border-primary/30">
            <span className="font-display text-xs font-black text-primary md:text-sm">
              第 {roundNumber} 回合
            </span>
          </div>
          <button
            onClick={() => setIsOpenRuleModal(true)}
            className="flex h-8 w-8 items-center justify-center rounded-2xl border-2 border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-primary/40 dark:hover:text-primary md:h-9 md:w-9"
            title="遊戲規則"
          >
            <BookOpen className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </button>
          <button
            onClick={() => setIsOpenLeaveDialog(true)}
            className="flex h-8 w-8 items-center justify-center rounded-2xl border-2 border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-rose-700 dark:hover:text-rose-400 md:h-9 md:w-9"
            title="離開房間"
          >
            <LogOut className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </button>
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

      {/* 主內容區 */}
      <div className="flex flex-1 flex-col items-center justify-center gap-3 overflow-y-auto px-4 py-4 md:gap-5 md:py-6">
        {/* 公共牌 */}
        <BuzzerPublicCards
          cards={publicCards}
          isBuzzerOpen={isBuzzerOpen}
        />

        {/* 作答中狀態列 */}
        <AnimatePresence>
          {isAnswering && answerRemaining !== null && (
            <motion.div
              key="answering-indicator"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3 rounded-2xl border-2 border-primary/20 bg-primary/5 px-5 py-2.5 dark:border-primary/30 dark:bg-primary/10"
            >
              <motion.div
                animate={
                  reduceMotion
                    ? undefined
                    : { opacity: [1, 0.3, 1] }
                }
                transition={{ duration: 1, repeat: Infinity }}
                className="h-2 w-2 rounded-full bg-primary"
              />
              <span className="text-sm font-bold text-primary">
                {answeringPlayer?.name ?? '玩家'} 作答中
              </span>
              <span
                className={`font-display text-xl font-black tabular-nums ${
                  answerRemaining <= 5 ? 'text-rose-500' : 'text-primary'
                }`}
              >
                {answerRemaining}s
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 作答面板（作答者互動 / 旁觀者唯讀） */}
        {isAnswering && (
          <div className="w-full max-w-2xl">
            <BuzzerAnswerPanel
              publicCards={publicCards}
              selectedCards={isCurrentAnswerer ? selectedCards : answerSelectedCards}
              onSelectCard={handleSelectCard}
              onSelectSymbol={handleSelectSymbol}
              onClear={handleClear}
              onSubmit={handleSubmit}
              isAnswerer={isCurrentAnswerer}
            />
          </div>
        )}
      </div>

      {/* 底部操作區 */}
      <div className="flex shrink-0 flex-col items-center gap-4 border-t border-zinc-200/60 px-4 pb-5 pt-4 dark:border-zinc-700/40">
        {/* 搶答按鈕 */}
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

        {/* 玩家清單 */}
        <div className="flex w-full gap-2 overflow-x-auto pb-1 md:max-w-4xl md:flex-wrap md:items-center md:justify-center md:gap-3 md:overflow-visible md:pb-0">
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
    </div>
  );
}
