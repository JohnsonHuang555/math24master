'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Delete, Play, RotateCcw, Trophy } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { LeaderboardModal } from '@/components/modals/leaderboard-modal';
import { LoginPromptModal } from '@/components/modals/login-prompt-modal';
import { Button } from '@/components/ui/button';
import { useLeaderboardSubmit } from '@/hooks/useLeaderboardSubmit';
import { WRONG_PENALTY_SECONDS, useQuickMath } from '@/hooks/useQuickMath';
import { TOTAL_QUESTIONS } from '@/lib/quick-math-generator';
import { formatTimePrecise } from '@/lib/utils';
import { useGuestStore } from '@/stores/guest-store';
import { useLoginPromptPreferenceStore } from '@/stores/login-prompt-preference-store';
import { usePendingScoreStore } from '@/stores/pending-score-store';
import { useStatsStore } from '@/stores/stats-store';

const KEYPAD_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export default function QuickMathPage() {
  const {
    gameState,
    countdownValue,
    currentIndex,
    currentQuestion,
    inputValue,
    displaySeconds,
    finalSeconds,
    penaltySeconds,
    wrongFlash,
    justFinished,
    startGame,
    pressDigit,
    clearInput,
    backspace,
    submitAnswer,
    restart,
  } = useQuickMath();

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const { status: sessionStatus } = useSession();
  const { guestId } = useGuestStore();
  const { setPendingScore, clearPendingScore } = usePendingScoreStore();
  const { skipLoginPrompt, setSkipLoginPrompt } =
    useLoginPromptPreferenceStore();
  const isAuthenticated = sessionStatus === 'authenticated' || !!guestId;

  const quickMathBestSeconds = useStatsStore(s => s.quickMathBestSeconds);
  const incrementQuickMathPlays = useStatsStore(s => s.incrementQuickMathPlays);
  const updateQuickMathBest = useStatsStore(s => s.updateQuickMathBest);

  const reduceMotion = useReducedMotion();

  // 完賽：更新本地統計
  useEffect(() => {
    if (!justFinished || finalSeconds === null) return;
    incrementQuickMathPlays();
    updateQuickMathBest(finalSeconds);
  }, [justFinished]); // eslint-disable-line react-hooks/exhaustive-deps

  // 完賽：已登入直接提交排行榜
  useLeaderboardSubmit(
    'quickmath',
    justFinished && isAuthenticated && finalSeconds !== null
      ? { seconds: finalSeconds }
      : null,
    justFinished && isAuthenticated && finalSeconds !== null,
  );

  // 完賽：未登入暫存成績並提示登入
  useEffect(() => {
    if (
      !justFinished ||
      isAuthenticated ||
      sessionStatus === 'loading' ||
      skipLoginPrompt
    )
      return;
    if (finalSeconds === null) return;
    setPendingScore({
      mode: 'quickmath',
      payload: { seconds: finalSeconds },
    });
    const id = setTimeout(() => setShowLoginPrompt(true), 1000);
    return () => clearTimeout(id);
  }, [justFinished, isAuthenticated, sessionStatus, skipLoginPrompt]); // eslint-disable-line react-hooks/exhaustive-deps

  // 實體鍵盤：0-9 / Backspace / Enter
  useEffect(() => {
    if (gameState !== 'playing') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        pressDigit(Number(e.key));
      } else if (e.key === 'Backspace') {
        backspace();
      } else if (e.key === 'Enter') {
        // 阻止焦點停在鍵盤按鈕上時 Enter 觸發該按鈕的 click（造成重複輸入）
        e.preventDefault();
        submitAnswer();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState, pressDigit, backspace, submitAnswer]);

  // ── 開始畫面 ──
  if (gameState === 'idle') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 p-4">
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-2xl font-bold">心算快答</h1>
          <p className="text-sm text-muted-foreground">
            {TOTAL_QUESTIONS} 題連續快答 · 全球排行榜
          </p>
        </div>
        <div className="flex flex-col items-center gap-1 text-center text-sm text-muted-foreground">
          <p>每題一道算式，心算後輸入答案</p>
          <p>
            難度逐題提升 · 答錯 +{WRONG_PENALTY_SECONDS} 秒可重試 ·
            全部答完即結束
          </p>
          <p className="text-xs">依總花費時間排名，最速紀錄寫入排行榜</p>
        </div>
        {quickMathBestSeconds > 0 && (
          <div className="rounded-2xl border-2 border-zinc-200 bg-white px-5 py-3 text-center shadow-[0_4px_0_0_rgba(0,0,0,0.05)] dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-xs text-muted-foreground">個人最佳</p>
            <p className="font-display text-2xl font-black text-primary">
              {formatTimePrecise(quickMathBestSeconds)}
            </p>
          </div>
        )}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => setShowLeaderboard(true)}
          >
            <Trophy className="h-4 w-4" />
            排行榜
          </Button>
          <Button variant="tactile" className="gap-1.5" onClick={startGame}>
            <Play className="h-4 w-4" />
            開始挑戰
          </Button>
        </div>
        <Link
          href="/"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          回首頁
        </Link>
        <LeaderboardModal
          isOpen={showLeaderboard}
          onClose={() => setShowLeaderboard(false)}
          defaultTab="quickmath"
        />
      </div>
    );
  }

  // ── 3-2-1 倒數 ──
  if (gameState === 'countdown') {
    return (
      <div className="h-full">
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
                className="mt-4 font-display text-2xl font-black tracking-widest text-white/60"
              >
                Ready ?
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── 結算畫面 ──
  if (gameState === 'completed') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto p-4">
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-2xl font-bold">心算快答</h1>
          <p className="text-sm text-muted-foreground">挑戰完成</p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex w-full max-w-sm flex-col items-center gap-4"
        >
          <div className="w-full rounded-2xl border-2 border-zinc-200 bg-white p-5 text-center shadow-[0_4px_0_0_rgba(0,0,0,0.05)] dark:border-zinc-700 dark:bg-zinc-900">
            <div className="font-display text-5xl font-black text-primary sm:text-6xl">
              {finalSeconds !== null ? formatTimePrecise(finalSeconds) : '完成'}
            </div>
            <div className="text-sm text-muted-foreground">
              {TOTAL_QUESTIONS} 題完成時間
            </div>
            {penaltySeconds > 0 ? (
              <div className="mt-2 text-sm font-semibold text-red-500">
                含答錯罰時 +{penaltySeconds} 秒
              </div>
            ) : (
              <div className="mt-2 text-sm font-semibold text-primary">
                全程零失誤！
              </div>
            )}
            {quickMathBestSeconds > 0 &&
              finalSeconds !== null &&
              finalSeconds <= quickMathBestSeconds && (
                <div className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  個人最佳紀錄！
                </div>
              )}
          </div>

          <div className="flex w-full gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-1.5"
              onClick={() => setShowLeaderboard(true)}
            >
              <Trophy className="h-4 w-4" />
              排行榜
            </Button>
            <Button
              variant="tactile"
              className="flex-1 gap-1.5"
              onClick={() => {
                restart();
                startGame();
              }}
            >
              <RotateCcw className="h-4 w-4" />
              再玩一次
            </Button>
          </div>
        </motion.div>
        <Link
          href="/"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          回首頁
        </Link>
        <LeaderboardModal
          isOpen={showLeaderboard}
          onClose={() => setShowLeaderboard(false)}
          defaultTab="quickmath"
        />
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
      </div>
    );
  }

  // ── 遊戲中 ──
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-4">
      {/* HUD */}
      <div className="flex flex-col items-center gap-1">
        <div className="relative flex items-baseline gap-3">
          <span className="font-display text-4xl font-bold tabular-nums text-primary">
            {formatTimePrecise(displaySeconds)}
          </span>
          <span className="text-sm text-muted-foreground">
            第 <b className="font-bold text-foreground">{currentIndex + 1}</b> /{' '}
            {TOTAL_QUESTIONS} 題
          </span>
          {/* 答錯 +3s 飄字 */}
          <AnimatePresence>
            {wrongFlash && (
              <motion.span
                key="penalty-flash"
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: -8 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="absolute -right-12 top-0 font-display text-lg font-black text-red-500"
              >
                +{WRONG_PENALTY_SECONDS}s
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {penaltySeconds > 0 && (
          <p className="text-xs font-semibold text-red-500">
            累計罰時 +{penaltySeconds} 秒
          </p>
        )}
      </div>

      {/* 題目卡 */}
      <motion.div
        animate={
          wrongFlash && !reduceMotion ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }
        }
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm rounded-2xl border-2 border-zinc-200 bg-white px-6 py-8 text-center shadow-[0_4px_0_0_rgba(0,0,0,0.05)] dark:border-zinc-700 dark:bg-zinc-900"
      >
        <p className="font-display text-3xl font-black tracking-wide text-foreground sm:text-4xl">
          {currentQuestion?.display} = ?
        </p>
      </motion.div>

      {/* 答案顯示框 */}
      <div className="flex h-12 w-full max-w-xs items-center justify-center rounded-2xl border-2 border-zinc-200 bg-white px-4 font-display text-2xl font-bold tabular-nums shadow-[0_4px_0_0_rgba(0,0,0,0.05)] dark:border-zinc-700 dark:bg-zinc-900">
        {inputValue || (
          <span className="text-sm font-normal text-muted-foreground">
            輸入答案
          </span>
        )}
      </div>

      {/* 數字鍵盤 */}
      <div className="grid w-full max-w-xs grid-cols-3 gap-2">
        {KEYPAD_DIGITS.map(digit => (
          <button
            key={digit}
            onClick={() => pressDigit(digit)}
            className="flex h-14 items-center justify-center rounded-2xl border-2 border-zinc-200 bg-white font-display text-2xl font-bold text-zinc-800 shadow-[0_4px_0_0_rgba(0,0,0,0.08)] transition-all hover:border-primary/50 active:translate-y-0.5 active:shadow-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {digit}
          </button>
        ))}
        <button
          onClick={clearInput}
          disabled={inputValue === ''}
          aria-label="清除輸入"
          className="flex h-14 items-center justify-center rounded-2xl border-2 border-zinc-200 bg-white text-zinc-500 shadow-[0_4px_0_0_rgba(0,0,0,0.08)] transition-all hover:border-red-300 active:translate-y-0.5 active:shadow-none disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
        >
          <Delete className="h-6 w-6" />
        </button>
        <button
          onClick={() => pressDigit(0)}
          className="flex h-14 items-center justify-center rounded-2xl border-2 border-zinc-200 bg-white font-display text-2xl font-bold text-zinc-800 shadow-[0_4px_0_0_rgba(0,0,0,0.08)] transition-all hover:border-primary/50 active:translate-y-0.5 active:shadow-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        >
          0
        </button>
        <Button
          variant="tactile"
          disabled={inputValue === ''}
          onClick={submitAnswer}
          aria-label="送出答案"
          className="h-14 rounded-2xl"
        >
          <Check className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
