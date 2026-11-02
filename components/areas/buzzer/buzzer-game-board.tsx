'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlarmClock,
  BookOpen,
  ChevronLeft,
  CircleCheck,
  CircleX,
} from 'lucide-react';
import { RuleModal } from '@/components/modals/rule-modal';
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
import { useHardNavigate } from '@/i18n/navigation';
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
  const hardNavigate = useHardNavigate();
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
    roundTimeoutNotification,
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
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                sessionStorage.removeItem('reconnectToken');
                sessionStorage.removeItem('reconnectRoomId');
                hardNavigate('/multiple-play');
              }}
            >
              離開
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 全螢幕倒數 overlay：數字直接切換，reduced-motion 不縮放 */}
      <AnimatePresence>
        {countdownValue !== null && (
          <motion.div
            key="fullscreen-countdown"
            role="status"
            aria-live="assertive"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-ink/60 backdrop-blur-sm"
          >
            <span className="text-base font-bold text-white">
              第 {roundNumber} 回合
            </span>
            <span className="flex h-40 w-40 items-center justify-center rounded-full bg-surface shadow-[0_0_0_10px_rgba(255,255,255,0.18)]">
              <motion.span
                key={countdownValue}
                initial={reduceMotion ? false : { scale: 1.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                className="font-display text-[110px] leading-none font-extrabold text-primary-ink"
              >
                {countdownValue}
              </motion.span>
            </span>
            <span className="text-[15px] text-white">公共牌即將出現</span>
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
            exit={
              reduceMotion ? undefined : { opacity: 0, y: -20, scale: 0.95 }
            }
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            role="status"
            className={`fixed inset-x-0 top-5 z-50 mx-auto flex w-fit items-center gap-2 rounded-full px-5 py-3 text-[15px] font-extrabold shadow-[0_12px_32px_rgba(16,36,33,0.18)] ${
              lastAnswerResult.isCorrect
                ? 'bg-primary-ink text-white'
                : 'bg-danger-ink text-white'
            }`}
          >
            {lastAnswerResult.isCorrect ? (
              <CircleCheck aria-hidden className="h-5 w-5" />
            ) : (
              <CircleX aria-hidden className="h-5 w-5" />
            )}
            {lastAnswerResult.isCorrect
              ? `答對！+${lastAnswerResult.scoreDelta} 分${lastAnswerResult.streakBonus > 0 ? `（+${lastAnswerResult.streakBonus} 連勝）` : ''}`
              : `答錯，−${Math.abs(lastAnswerResult.scoreDelta)} 分`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 回合超時 全體扣分通知 */}
      <AnimatePresence>
        {roundTimeoutNotification && (
          <motion.div
            key="round-timeout-notification"
            initial={reduceMotion ? false : { opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduceMotion ? undefined : { opacity: 0, y: -20, scale: 0.95 }
            }
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            role="status"
            className="fixed inset-x-0 top-5 z-50 mx-auto flex w-fit max-w-[calc(100%-32px)] items-center gap-2 rounded-full bg-ink px-5 py-3 text-[15px] font-extrabold text-white shadow-[0_12px_32px_rgba(16,36,33,0.18)]"
          >
            <AlarmClock aria-hidden className="h-5 w-5 shrink-0" />
            時間到！沒有人答對，全體扣 {
              roundTimeoutNotification.penaltyPoints
            }{' '}
            分
          </motion.div>
        )}
      </AnimatePresence>

      {/* 頂部工具列 */}
      <div className="flex h-14 shrink-0 items-center gap-1 border-b border-line px-2 md:h-16 md:gap-2 md:px-6">
        <button
          type="button"
          onClick={() => setIsOpenLeaveDialog(true)}
          aria-label="離開房間"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink transition-colors hover:bg-sunken"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="flex-1 text-sm font-bold whitespace-nowrap text-ink">
          第 <span className="font-display text-[17px]">{roundNumber}</span>{' '}
          回合
        </span>
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
        <button
          type="button"
          onClick={() => setIsOpenRuleModal(true)}
          aria-label="遊戲規則"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink transition-colors hover:bg-sunken"
        >
          <BookOpen className="h-5 w-5" />
        </button>
      </div>

      {/* 主內容區 */}
      <div className="flex flex-1 flex-col items-center justify-center gap-3 overflow-y-auto px-4 py-4 md:gap-5 md:py-6">
        {/* 公共牌 */}
        <BuzzerPublicCards cards={publicCards} />

        {/* 作答中狀態列 */}
        <AnimatePresence>
          {isAnswering && answerRemaining !== null && (
            <motion.div
              key="answering-indicator"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              role="status"
              className="flex items-center gap-3 rounded-2xl border-2 border-primary bg-primary-tint px-5 py-2.5"
            >
              <motion.div
                animate={reduceMotion ? undefined : { opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="h-2 w-2 rounded-full bg-primary"
              />
              <span className="text-sm font-bold text-primary-ink">
                {answeringPlayer?.name ?? '玩家'} 作答中
              </span>
              <span
                className={`font-display text-xl font-extrabold tabular-nums ${
                  answerRemaining <= 5 ? 'text-danger-ink' : 'text-primary-ink'
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
              selectedCards={
                isCurrentAnswerer ? selectedCards : answerSelectedCards
              }
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
      <div className="flex shrink-0 flex-col items-center gap-3 border-t border-line px-4 pt-4 pb-5">
        {/* 搶答按鈕 */}
        {!isCurrentAnswerer && (
          <BuzzerButton
            isLocked={myState?.isLocked ?? false}
            lockRemaining={lockRemaining}
            lockTotal={roomInfo.settings.buzzerSettings?.lockSeconds}
            isBuzzerOpen={isBuzzerOpen}
            isAnswering={isAnswering}
            isCurrentAnswerer={false}
            answeringPlayerName={answeringPlayer?.name}
            onBuzz={() => buzzIn(roomId)}
          />
        )}

        {/* 玩家清單 */}
        <div className="grid w-full grid-cols-2 gap-2 md:flex md:max-w-4xl md:flex-wrap md:items-center md:justify-center md:gap-3">
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
