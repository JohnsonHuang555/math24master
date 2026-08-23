'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Play, Timer } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { AdUnit } from '@/components/ad-unit';
import { PuzzlePlayArea } from '@/components/areas/puzzle-play-area';
import { LoginPromptModal } from '@/components/modals/login-prompt-modal';
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
import { Button } from '@/components/ui/button';
import { useChallengePlay } from '@/hooks/useChallengePlay';
import { useLeaderboardSubmit } from '@/hooks/useLeaderboardSubmit';
import { cn, formatTime } from '@/lib/utils';
import { useGuestStore } from '@/stores/guest-store';
import { useLoginPromptPreferenceStore } from '@/stores/login-prompt-preference-store';
import { usePendingScoreStore } from '@/stores/pending-score-store';

interface ChallengePlayGameProps {
  onBack: () => void;
  autoStart?: boolean;
}

export default function ChallengePlayGame({
  onBack,
  autoStart,
}: ChallengePlayGameProps) {
  const {
    status,
    finishReason,
    stage,
    totalScore,
    currentNumbers,
    selectedCards,
    seconds,
    best,
    nextSkipPenalty,
    startGame,
    selectCard,
    removeCard,
    clearSelection,
    submitAnswer,
    skipPuzzle,
    quitGame,
    endGameEarly,
  } = useChallengePlay();

  const [penaltyMsg, setPenaltyMsg] = useState<string | null>(null);
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);
  const [showEarlyEndConfirm, setShowEarlyEndConfirm] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const penaltyTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const { status: sessionStatus } = useSession();
  const { guestId } = useGuestStore();
  const { setPendingScore, clearPendingScore } = usePendingScoreStore();
  const { skipLoginPrompt, setSkipLoginPrompt } =
    useLoginPromptPreferenceStore();
  const isAuthenticated = sessionStatus === 'authenticated' || !!guestId;

  const isFinished = status === 'finished';

  useLeaderboardSubmit(
    'challenge',
    isAuthenticated && isFinished ? { stage, totalScore } : null,
    isAuthenticated && isFinished,
  );

  useEffect(() => {
    if (
      !isFinished ||
      isAuthenticated ||
      sessionStatus === 'loading' ||
      skipLoginPrompt ||
      totalScore <= 0
    )
      return;
    setPendingScore({ mode: 'challenge', payload: { stage, totalScore } });
    const id = setTimeout(() => setShowLoginPrompt(true), 1000);
    return () => clearTimeout(id);
  }, [isFinished, isAuthenticated, sessionStatus, skipLoginPrompt]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (autoStart) startGame();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerPenalty = (penalty: number) => {
    clearTimeout(penaltyTimeoutRef.current);
    setPenaltyMsg(`-${penalty}s`);
    penaltyTimeoutRef.current = setTimeout(() => setPenaltyMsg(null), 900);
  };

  const handleSkip = () => {
    const penalty = skipPuzzle();
    triggerPenalty(penalty);
  };

  // ── 開始畫面 ──
  if (status === 'idle') {
    if (autoStart) return null;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-400 text-white shadow-[0_5px_0_0_hsl(36,100%,34%)]">
            <Timer className="h-8 w-8" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-black text-foreground">
              挑戰模式
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              倒數 5 分鐘 · 無限關卡
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              答對加時遞減 · 連續跳過懲罰加重
            </p>
          </div>
        </div>
        {best && (
          <div className="w-full max-w-[240px] rounded-2xl border-2 border-zinc-200 bg-white/90 p-4 text-center shadow-[0_4px_0_0_rgba(0,0,0,0.05)] dark:border-zinc-700 dark:bg-zinc-900/80">
            <p className="text-xs text-muted-foreground">個人最佳</p>
            <p className="font-display text-2xl font-bold text-foreground">
              第 {best.stage} 關
            </p>
            <p className="text-sm text-muted-foreground">
              {best.totalScore} 分
            </p>
          </div>
        )}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack}>
            返回
          </Button>
          <Button variant="tactile" className="gap-1.5" onClick={startGame}>
            <Play className="h-4 w-4" />
            開始遊戲
          </Button>
        </div>
      </div>
    );
  }

  // ── 結算畫面 ──
  if (status === 'finished') {
    const isNewBest = best && stage > best.stage;
    return (
      <>
        <LoginPromptModal
          isOpen={showLoginPrompt}
          onClose={() => setShowLoginPrompt(false)}
          onSkip={() => {
            clearPendingScore();
            setShowLoginPrompt(false);
          }}
          onSkipForever={() => {
            setSkipLoginPrompt(true);
            clearPendingScore();
            setShowLoginPrompt(false);
          }}
        />
        <div className="flex h-full flex-col items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-3xl border-2 border-zinc-200 bg-white/90 p-6 text-center shadow-[0_8px_0_0_hsl(36,100%,72%)] dark:border-zinc-700 dark:bg-zinc-900/80 dark:shadow-[0_8px_0_0_hsl(36,100%,34%)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30">
              <Timer className="h-7 w-7 text-amber-500" />
            </div>
            <h2 className="font-display text-xl font-black text-foreground">
              {finishReason === 'early' ? '提前結算！' : '時間到！'}
            </h2>
            <div className="mt-4 flex justify-center gap-8">
              <div>
                <p className="font-display text-4xl font-bold text-amber-500">
                  {stage}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">最終關卡</p>
              </div>
              <div className="w-px bg-border" />
              <div>
                <p className="font-display text-4xl font-bold text-foreground">
                  {totalScore}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">總分</p>
              </div>
            </div>
            {/* <div className="mt-2 flex justify-center">
              <AdUnit slot="3374528946" width={320} height={50} />
            </div> */}
            {isNewBest && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-800 dark:bg-amber-900/20">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  新紀錄！
                </p>
              </div>
            )}
            {best && !isNewBest && (
              <p className="mt-3 text-sm text-muted-foreground">
                個人最佳：第 {best.stage} 關（{best.totalScore} 分）
              </p>
            )}
            <div className="mt-6 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onBack}>
                返回選單
              </Button>
              <Button variant="tactile" className="flex-1" onClick={startGame}>
                再挑戰
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── 遊戲中 ──
  const isLowTime = seconds <= 60;
  const maxSeconds = 5 * 60;
  const progressPct = Math.min(100, (seconds / maxSeconds) * 100);

  return (
    <>
      <RuleModal
        isOpen={isOpenRuleModal}
        onOpenChange={setIsOpenRuleModal}
        mode="challenge"
      />
      <PuzzlePlayArea
        currentNumbers={currentNumbers}
        selectedCards={selectedCards}
        onSelectCard={selectCard}
        onRemoveCard={removeCard}
        onClearSelection={clearSelection}
        onSubmit={submitAnswer}
        onSkip={handleSkip}
        onBack={() => {
          quitGame();
          onBack();
        }}
        showSkipButton={true}
        skipPenaltyText={`-${nextSkipPenalty} 秒`}
        theme="orange"
      >
        {/* HUD */}
        <div className="w-full rounded-2xl border-2 border-zinc-200 bg-white/95 px-4 pb-3 pt-2.5 shadow-[0_4px_0_0_rgba(0,0,0,0.05)] dark:border-zinc-700 dark:bg-zinc-900/90">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-base font-semibold text-muted-foreground">
              挑戰模式
            </span>
            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                onClick={() => setIsOpenRuleModal(true)}
              >
                <BookOpen className="h-3.5 w-3.5" />
                規則
              </button>
              <button
                className="text-xs font-semibold text-amber-500 hover:text-amber-600 dark:text-amber-400"
                onClick={() => setShowEarlyEndConfirm(true)}
              >
                提前結算
              </button>
            </div>
          </div>
          {/* Big timer */}
          <div className="flex items-baseline justify-center gap-2">
            <span
              className={cn(
                'font-display text-5xl font-bold tabular-nums transition-colors duration-150',
                isLowTime ? 'animate-pulse text-red-500' : 'text-amber-500',
              )}
            >
              {formatTime(seconds)}
            </span>
            <AnimatePresence>
              {penaltyMsg && (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="text-sm font-bold text-red-500"
                >
                  {penaltyMsg}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          {/* Timer progress bar */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <motion.div
              className={cn(
                'h-1.5 rounded-full',
                isLowTime ? 'bg-red-400' : 'bg-amber-400',
              )}
              style={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {/* Stage + score */}
          <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
            <span>
              第 <b className="font-bold text-foreground">{stage}</b> 關
            </span>
            <span>
              <b className="font-bold text-foreground">{totalScore}</b> 分
            </span>
          </div>
        </div>
      </PuzzlePlayArea>

      <AlertDialog
        open={showEarlyEndConfirm}
        onOpenChange={setShowEarlyEndConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要提前結算？</AlertDialogTitle>
            <AlertDialogDescription>
              提前結算後遊戲將立即結束，計分以目前關卡為準。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>繼續遊戲</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowEarlyEndConfirm(false);
                endGameEarly();
              }}
            >
              結算
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
