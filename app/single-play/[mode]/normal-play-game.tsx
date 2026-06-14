'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { ListChecks, Play } from 'lucide-react';
import { PuzzlePlayArea } from '@/components/areas/puzzle-play-area';
import { Button } from '@/components/ui/button';
import { LoginPromptModal } from '@/components/modals/login-prompt-modal';
import { useLeaderboardSubmit } from '@/hooks/useLeaderboardSubmit';
import { useNormalPlay } from '@/hooks/useNormalPlay';
import { cn, formatTime } from '@/lib/utils';
import { useGuestStore } from '@/stores/guest-store';
import { usePendingScoreStore } from '@/stores/pending-score-store';
import { useLoginPromptPreferenceStore } from '@/stores/login-prompt-preference-store';

interface NormalPlayGameProps {
  onBack: () => void;
  autoStart?: boolean;
}

export default function NormalPlayGame({ onBack, autoStart }: NormalPlayGameProps) {
  const {
    status,
    currentRound,
    totalRounds,
    currentNumbers,
    selectedCards,
    totalScore,
    seconds,
    penaltyCount,
    records,
    startGame,
    selectCard,
    removeCard,
    clearSelection,
    submitAnswer,
    skipPuzzle,
    quitGame,
  } = useNormalPlay();

  const [penaltyMsg, setPenaltyMsg] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const prevPenaltyRef = useRef(0);

  const { status: sessionStatus } = useSession();
  const { guestId } = useGuestStore();
  const { setPendingScore, clearPendingScore } = usePendingScoreStore();
  const { skipLoginPrompt, setSkipLoginPrompt } = useLoginPromptPreferenceStore();
  const isAuthenticated = sessionStatus === 'authenticated' || !!guestId;

  const isFinished = status === 'finished';

  useLeaderboardSubmit(
    'normal',
    isAuthenticated && isFinished ? { seconds, totalScore } : null,
    isAuthenticated && isFinished,
  );

  useEffect(() => {
    if (!isFinished || isAuthenticated || sessionStatus === 'loading' || skipLoginPrompt) return;
    setPendingScore({ mode: 'normal', payload: { seconds, totalScore } });
    const id = setTimeout(() => setShowLoginPrompt(true), 1000);
    return () => clearTimeout(id);
  }, [isFinished, isAuthenticated, sessionStatus, skipLoginPrompt]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (autoStart) startGame();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (penaltyCount > prevPenaltyRef.current) {
      prevPenaltyRef.current = penaltyCount;
      setPenaltyMsg('+10s');
      const id = setTimeout(() => setPenaltyMsg(null), 900);
      return () => clearTimeout(id);
    }
  }, [penaltyCount]);

  // ── 開始畫面 ──
  if (status === 'idle') {
    if (autoStart) return null;
    const best = records.length > 0 ? records[0] : null;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-500 text-white shadow-[0_5px_0_0_hsl(221,83%,34%)]">
            <ListChecks className="h-8 w-8" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-black text-foreground">關卡模式</h1>
            <p className="mt-1 text-sm text-muted-foreground">5 題全過關 · 最短時間勝</p>
            <p className="mt-0.5 text-xs text-muted-foreground">答錯或跳過 +10 秒懲罰</p>
          </div>
        </div>
        {best && (
          <div className="w-full max-w-[240px] rounded-2xl border-2 border-zinc-200 bg-white/90 p-4 text-center shadow-[0_4px_0_0_rgba(0,0,0,0.05)] dark:border-zinc-700 dark:bg-zinc-900/80">
            <p className="text-xs text-muted-foreground">最佳紀錄</p>
            <p className="font-display text-2xl font-bold text-foreground">{formatTime(best.totalSeconds)}</p>
            <p className="text-sm text-muted-foreground">{best.totalScore} 分</p>
          </div>
        )}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack}>返回</Button>
          <Button variant="tactile" className="gap-1.5" onClick={startGame}>
            <Play className="h-4 w-4" />開始遊戲
          </Button>
        </div>
      </div>
    );
  }

  // ── 結算畫面 ──
  if (status === 'finished') {
    return (
      <>
        <LoginPromptModal
          isOpen={showLoginPrompt}
          onClose={() => setShowLoginPrompt(false)}
          onSkip={() => { clearPendingScore(); setShowLoginPrompt(false); }}
          onSkipForever={() => { setSkipLoginPrompt(true); clearPendingScore(); setShowLoginPrompt(false); }}
        />
        <div className="flex h-full flex-col items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-3xl border-2 border-zinc-200 bg-white/90 p-6 text-center shadow-[0_8px_0_0_hsl(221,83%,72%)] dark:border-zinc-700 dark:bg-zinc-900/80 dark:shadow-[0_8px_0_0_hsl(221,83%,34%)]">
            {/* All dots filled */}
            <div className="mb-4 flex justify-center gap-2">
              {Array.from({ length: totalRounds }).map((_, i) => (
                <div
                  key={i}
                  className="h-4 w-4 rounded-full bg-blue-500"
                />
              ))}
            </div>
            <h2 className="font-display text-xl font-black text-foreground">全部完成！</h2>
            <div className="mt-4 flex justify-center gap-8">
              <div>
                <p className="font-display text-4xl font-bold text-blue-500">{formatTime(seconds)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">總用時</p>
              </div>
              <div className="w-px bg-border" />
              <div>
                <p className="font-display text-4xl font-bold text-foreground">{totalScore}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">總分</p>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onBack}>返回選單</Button>
              <Button variant="tactile" className="flex-1" onClick={startGame}>再來一次</Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── 遊戲中 ──
  const isFlashing = !!penaltyMsg;

  return (
    <PuzzlePlayArea
      currentNumbers={currentNumbers}
      selectedCards={selectedCards}
      onSelectCard={selectCard}
      onRemoveCard={removeCard}
      onClearSelection={clearSelection}
      onSubmit={submitAnswer}
      onSkip={skipPuzzle}
      onBack={() => {
        quitGame();
        onBack();
      }}
      showSkipButton={false}
      theme="blue"
    >
      {/* HUD */}
      <div className="w-full rounded-2xl border-2 border-zinc-200 bg-white/95 px-4 pt-3 pb-3 shadow-[0_4px_0_0_rgba(0,0,0,0.05)] dark:border-zinc-700 dark:bg-zinc-900/90">
        {/* Progress dots */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {Array.from({ length: totalRounds }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-3.5 w-3.5 rounded-full transition-colors duration-300',
                  i < currentRound
                    ? 'bg-blue-500'
                    : i === currentRound
                    ? 'bg-blue-300'
                    : 'bg-zinc-200 dark:bg-zinc-700',
                )}
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            第 {currentRound + 1}/{totalRounds} 題
          </span>
        </div>
        {/* Timer */}
        <div className="mt-1.5 flex items-baseline justify-center gap-2">
          <span
            className={cn(
              'font-display text-4xl font-bold tabular-nums transition-colors duration-150',
              isFlashing || penaltyCount >= 2 ? 'text-red-500' : 'text-blue-500',
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
        {/* Score */}
        <p className="text-center text-xs text-muted-foreground">
          累計 <b className="font-bold text-foreground">{totalScore}</b> 分
        </p>
      </div>
    </PuzzlePlayArea>
  );
}
