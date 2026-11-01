'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { BookOpen, Flag, Play, Timer } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { PuzzlePlayArea } from '@/components/areas/puzzle-play-area';
import { GameTimer, TimerDelta } from '@/components/game/game-timer';
import { ResultRank } from '@/components/leaderboard/result-rank';
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
import { getStageBonus, useChallengePlay } from '@/hooks/useChallengePlay';
import { useLeaderboardSubmit } from '@/hooks/useLeaderboardSubmit';
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
    isNewBest,
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

  const reduceMotion = useReducedMotion();
  const [timeDelta, setTimeDelta] = useState<TimerDelta | null>(null);
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);
  const [showEarlyEndConfirm, setShowEarlyEndConfirm] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const deltaTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const { status: sessionStatus } = useSession();
  const { guestId } = useGuestStore();
  const { setPendingScore, clearPendingScore } = usePendingScoreStore();
  const { skipLoginPrompt, setSkipLoginPrompt } =
    useLoginPromptPreferenceStore();
  const isAuthenticated = sessionStatus === 'authenticated' || !!guestId;

  const isFinished = status === 'finished';

  const leaderboardSubmit = useLeaderboardSubmit(
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

  const showTimeDelta = (deltaSeconds: number) => {
    clearTimeout(deltaTimeoutRef.current);
    setTimeDelta(prev => ({
      key: (prev?.key ?? 0) + 1,
      seconds: deltaSeconds,
    }));
    // reduced-motion 時沒有飄字動畫，停留久一點
    deltaTimeoutRef.current = setTimeout(
      () => setTimeDelta(null),
      reduceMotion ? 2500 : 1200,
    );
  };

  // 答對進入下一關時顯示加了幾秒
  const prevStageRef = useRef(stage);
  useEffect(() => {
    if (status === 'playing' && stage > prevStageRef.current) {
      showTimeDelta(getStageBonus(prevStageRef.current));
    }
    prevStageRef.current = stage;
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSkip = () => {
    const penalty = skipPuzzle();
    showTimeDelta(-penalty);
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
            <ResultRank
              mode="challenge"
              submit={leaderboardSubmit}
              className="mt-6"
            />
            <div className="mt-3 flex gap-2">
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
        skipPenaltyText={`−${nextSkipPenalty} 秒`}
        theme="orange"
      >
        {/* HUD */}
        <div className="flex w-full items-center gap-1">
          <span className="flex-1 text-sm font-bold text-ink-2">挑戰模式</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 text-ink"
            onClick={() => setIsOpenRuleModal(true)}
            aria-label="規則"
          >
            <BookOpen className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            className="h-11 gap-1 px-2.5 text-sm font-bold text-ink"
            onClick={() => setShowEarlyEndConfirm(true)}
          >
            <Flag className="h-4.5 w-4.5" />
            提前結算
          </Button>
        </div>
        <GameTimer
          seconds={seconds}
          maxSeconds={5 * 60}
          delta={timeDelta}
          aside={
            <span className="ml-auto flex items-baseline gap-2 text-[13px] text-ink-2">
              <span className="font-display text-xl leading-none font-extrabold text-ink">
                第 {stage} 關
              </span>
              <span>
                <b className="font-display font-bold text-ink">{totalScore}</b>{' '}
                分
              </span>
            </span>
          }
        />
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
