'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
} from 'framer-motion';
import {
  BookOpen,
  Layers,
  ListChecks,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { PuzzlePlayArea } from '@/components/areas/puzzle-play-area';
import { LoginPromptModal } from '@/components/modals/login-prompt-modal';
import { RoundHistoryModal } from '@/components/modals/round-history-modal';
import { RuleModal } from '@/components/modals/rule-modal';
import { Button } from '@/components/ui/button';
import { useLeaderboardSubmit } from '@/hooks/useLeaderboardSubmit';
import useSinglePlay from '@/hooks/useSinglePlay';
import { renderClassicResultCard } from '@/lib/classic-result-card';
import { shareImage } from '@/lib/share';
import { cn } from '@/lib/utils';
import { HandResult, RoundRecord } from '@/models/Player';
import { Difficulty } from '@/models/Room';
import { Symbol } from '@/models/Symbol';
import { useGuestStore } from '@/stores/guest-store';
import { useLoginPromptPreferenceStore } from '@/stores/login-prompt-preference-store';
import { usePendingScoreStore } from '@/stores/pending-score-store';
import { useStatsStore } from '@/stores/stats-store';

type ClassicStatus = 'idle' | 'playing' | 'finished';

/** 解法效率 → 評級（總分 / 理論上限） */
function gradeOf(efficiency: number): string {
  if (efficiency >= 0.95) return 'S';
  if (efficiency >= 0.8) return 'A';
  if (efficiency >= 0.6) return 'B';
  return 'C';
}

function cnGrade(efficiency: number): string {
  const base = 'font-display text-3xl font-black leading-none';
  if (efficiency >= 0.95) return `${base} text-amber-500`;
  if (efficiency >= 0.8) return `${base} text-primary`;
  if (efficiency >= 0.6) return `${base} text-blue-500`;
  return `${base} text-muted-foreground`;
}

interface ClassicPlayGameProps {
  onBack: () => void;
  autoStart?: boolean;
}

export default function ClassicPlayGame({
  onBack,
  autoStart,
}: ClassicPlayGameProps) {
  const [status, setStatus] = useState<ClassicStatus>(
    autoStart ? 'playing' : 'idle',
  );
  const [difficulty, setDifficulty] = useState<Difficulty | null>(
    autoStart ? Difficulty.Hard : null,
  );
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);
  const [scoreFlash, setScoreFlash] = useState<number | null>(null);
  const [handFeedback, setHandFeedback] = useState<HandResult | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [handHistory, setHandHistory] = useState<HandResult[]>([]);
  const [roundHistory, setRoundHistory] = useState<RoundRecord[]>([]);
  const [showRoundHistory, setShowRoundHistory] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const prevScoreRef = useRef(0);

  const { status: sessionStatus } = useSession();
  const { guestId } = useGuestStore();
  const { setPendingScore, clearPendingScore } = usePendingScoreStore();
  const { skipLoginPrompt, setSkipLoginPrompt } =
    useLoginPromptPreferenceStore();
  const isAuthenticated = sessionStatus === 'authenticated' || !!guestId;

  const {
    roomInfo,
    onPlayCard,
    onSkipHand,
    onSelectCardOrSymbol,
    onReselect,
    checkAnswerCorrect,
    isSymbolScoreAnimationFinished,
    selectedCardSymbols,
    onUpdateScore,
    isGameOver,
    onFinishedSymbolScoreAnimation,
    onBack: onBackCard,
    isLastRound,
    lastHandResult,
    lastRoundResult,
  } = useSinglePlay(difficulty);

  const currentPlayer = roomInfo?.players[0];
  const handCard = currentPlayer?.handCard || [];
  const currentScore = roomInfo?.players[0]?.score ?? 0;
  const perfectHands = currentPlayer?.perfectHands ?? 0;
  const theoreticalMax = currentPlayer?.theoreticalMax ?? 0;
  const remainCards = roomInfo?.deck.length ?? 0;
  const selectedCards = roomInfo?.selectedCards ?? [];

  const count = useMotionValue(currentScore);
  const rounded = useTransform(count, Math.round);

  const {
    classicBestScore: bestScore,
    updateClassicBestScore: updateBestScore,
  } = useStatsStore();

  const disabledActions = checkAnswerCorrect === true || !!isGameOver;

  const startGame = () => {
    setDifficulty(Difficulty.Hard);
    setStatus('playing');
    prevScoreRef.current = 0;
    setHandHistory([]);
    setRoundHistory([]);
  };

  useEffect(() => {
    if (autoStart) startGame();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (roomInfo?.isGameOver) {
      updateBestScore(currentScore);
      setStatus('finished');
    }
  }, [roomInfo?.isGameOver]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    animate(count, currentScore, { duration: 0.3 });
  }, [count, currentScore]);

  useEffect(() => {
    if (status !== 'playing') return;
    if (currentScore > prevScoreRef.current) {
      const gained = currentScore - prevScoreRef.current;
      prevScoreRef.current = currentScore;
      setScoreFlash(gained);
      const id = setTimeout(() => setScoreFlash(null), 950);
      return () => clearTimeout(id);
    }
  }, [currentScore, status]);

  useEffect(() => {
    if (checkAnswerCorrect !== true || selectedCardSymbols.length === 0) return;
    const timers = selectedCardSymbols.map((_, i) =>
      setTimeout(() => onFinishedSymbolScoreAnimation(), (i + 1) * 250),
    );
    return () => timers.forEach(clearTimeout);
  }, [checkAnswerCorrect]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isSymbolScoreAnimationFinished) return;
    const id = setTimeout(() => onUpdateScore(), 1500);
    return () => clearTimeout(id);
  }, [isSymbolScoreAnimationFinished]); // eslint-disable-line react-hooks/exhaustive-deps

  // 每手結算回饋：顯示 3.2 秒後淡出；同時累積六手戰績供分享圖卡使用
  useEffect(() => {
    if (!lastHandResult) return;
    setHandFeedback(lastHandResult);
    setHandHistory(prev => [...prev, lastHandResult]);
    const id = setTimeout(() => setHandFeedback(null), 3200);
    return () => clearTimeout(id);
  }, [lastHandResult]);

  // 累積本局逐題作答紀錄（含玩家算式與最佳解），供結算後查看用
  useEffect(() => {
    if (!lastRoundResult) return;
    setRoundHistory(prev => [
      ...prev,
      { ...lastRoundResult, round: prev.length + 1 },
    ]);
  }, [lastRoundResult]);

  const isNewBestScore =
    status === 'finished' && currentScore > 0 && currentScore >= bestScore;

  const efficiency = theoreticalMax > 0 ? currentScore / theoreticalMax : 0;
  const grade = gradeOf(efficiency);

  const handleShareResult = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const blob = await renderClassicResultCard({
        score: currentScore,
        grade,
        efficiency,
        perfectHands,
        handHistory,
        isNewBestScore,
      });
      if (!blob) {
        toast.error('圖卡產生失敗，請稍後再試');
        return;
      }
      const file = new File([blob], 'math24-classic-result.png', {
        type: 'image/png',
      });
      const outcome = await shareImage(file, {
        title: 'Math24 經典模式',
        text: `Math24 經典模式挑戰結果：${currentScore} 分（評級 ${grade}）\n來 math24master.com 挑戰看看`,
      });
      if (outcome === 'downloaded') {
        toast.success('圖卡已下載，快分享到限動或聊天吧！');
      } else if (outcome === 'failed') {
        toast.error('分享失敗，請稍後再試');
      }
    } finally {
      setIsSharing(false);
    }
  };

  useLeaderboardSubmit(
    'classic',
    isAuthenticated && isGameOver ? { score: currentScore } : null,
    isAuthenticated && !!isGameOver,
  );

  useEffect(() => {
    if (
      !isGameOver ||
      isAuthenticated ||
      sessionStatus === 'loading' ||
      skipLoginPrompt ||
      currentScore <= 0
    )
      return;
    setPendingScore({ mode: 'classic', payload: { score: currentScore } });
    const id = setTimeout(() => setShowLoginPrompt(true), 1000);
    return () => clearTimeout(id);
  }, [isGameOver, isAuthenticated, sessionStatus, skipLoginPrompt]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 開始畫面 ──
  if (status === 'idle') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-teal-500 text-white shadow-[0_5px_0_0_hsl(175,84%,20%)]">
            <Layers className="h-8 w-8" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-black text-foreground">
              經典模式
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              牌值 1–13 · 累積最高分
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              答對得分 · 跳過換牌 · 牌盡結束
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-amber-500">
              <Sparkles className="h-3.5 w-3.5" />
              拿滿該手最高分 = 完美手，額外 +1
            </p>
          </div>
        </div>
        {bestScore > 0 && (
          <div className="w-full max-w-[240px] rounded-2xl border-2 border-zinc-200 bg-white/90 p-4 text-center shadow-[0_4px_0_0_rgba(0,0,0,0.05)] dark:border-zinc-700 dark:bg-zinc-900/80">
            <p className="text-xs text-muted-foreground">個人最高</p>
            <p className="font-display text-3xl font-bold text-foreground">
              {bestScore} 分
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
        <RoundHistoryModal
          isOpen={showRoundHistory}
          onOpenChange={setShowRoundHistory}
          roundHistory={roundHistory}
        />
        <div className="flex h-full flex-col items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-3xl border-2 border-zinc-200 bg-white/90 p-6 text-center shadow-[0_8px_0_0_hsl(175,84%,78%)] dark:border-zinc-700 dark:bg-zinc-900/80 dark:shadow-[0_8px_0_0_hsl(175,84%,20%)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-900/30">
              <Trophy className="h-7 w-7 text-teal-500" />
            </div>
            <h2 className="font-display text-xl font-black text-foreground">
              遊戲結束
            </h2>
            <div className="mt-4">
              <p className="font-display text-5xl font-bold text-primary">
                {currentScore}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">最終得分</p>
            </div>
            {theoreticalMax > 0 && (
              <div className="mt-4 flex items-center justify-center gap-6 rounded-2xl border-2 border-zinc-100 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                <div>
                  <p className={cnGrade(efficiency)}>{grade}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    解法評級
                  </p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="font-display text-xl font-bold text-foreground">
                    {Math.round(efficiency * 100)}%
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    解法效率
                  </p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="flex items-center justify-center gap-1 font-display text-xl font-bold text-amber-500">
                    <Sparkles className="h-4 w-4" />
                    {perfectHands}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    完美手
                  </p>
                </div>
              </div>
            )}
            {isNewBestScore && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-800 dark:bg-amber-900/20">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  新紀錄！
                </p>
              </div>
            )}
            {!isNewBestScore && bestScore > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                個人最高：{bestScore} 分
              </p>
            )}
            {roundHistory.length > 0 && (
              <Button
                variant="outline"
                className="mt-6 w-full gap-1.5"
                onClick={() => setShowRoundHistory(true)}
              >
                <ListChecks className="h-4 w-4" />
                查看作答紀錄
              </Button>
            )}
            <Button
              variant="outline"
              className={cn(
                'w-full gap-1.5',
                roundHistory.length > 0 ? 'mt-3' : 'mt-6',
              )}
              onClick={handleShareResult}
              disabled={isSharing}
            >
              <Share2 className="h-4 w-4" />
              {isSharing ? '圖卡產生中...' : '分享成績'}
            </Button>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onBack}>
                返回選單
              </Button>
              <Button
                variant="tactile"
                className="flex-1"
                onClick={() => window.location.reload()}
              >
                再來一局
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── 遊戲中 ──
  const classicHud = (
    <>
      <AnimatePresence>
        {scoreFlash !== null && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.4, y: -24 }}
            transition={{ duration: 0.25 }}
          >
            <span className="font-display text-6xl font-black text-primary drop-shadow-lg">
              +{scoreFlash}分！
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD bar */}
      <div className="flex w-full max-w-sm items-center justify-between rounded-2xl border-2 border-zinc-200 bg-white/95 px-5 py-3 shadow-[0_4px_0_0_rgba(0,0,0,0.05)] dark:border-zinc-700 dark:bg-zinc-900/90">
        <div>
          <p className="text-[10px] font-medium text-muted-foreground">得分</p>
          <motion.div className="font-display text-2xl font-bold tabular-nums text-primary">
            {rounded}
          </motion.div>
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-muted-foreground">
            經典模式
          </p>
          {isLastRound && (
            <p className="animate-pulse text-xs font-bold text-red-500">
              最後一輪！
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium text-muted-foreground">牌庫</p>
          <p className="font-display text-lg font-semibold tabular-nums text-foreground">
            {remainCards} 張
          </p>
        </div>
      </div>

      {/* Bonus + nav row */}
      <div className="flex w-full max-w-sm items-center justify-between px-1">
        <AnimatePresence mode="wait">
          {isSymbolScoreAnimationFinished ? (
            <motion.div
              key="symbol-bonus"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3 text-xs font-semibold text-primary"
            >
              {selectedCardSymbols.filter(c => c.symbol === Symbol.Times)
                .length >= 2 && <span>2 張乘 +1</span>}
              {selectedCardSymbols.filter(c => c.symbol === Symbol.Divide)
                .length >= 2 && <span>2 張除 +1</span>}
            </motion.div>
          ) : handFeedback ? (
            <motion.div
              key="hand-feedback"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs font-semibold"
            >
              {handFeedback.isPerfect ? (
                <span className="inline-flex items-center gap-1 text-amber-500">
                  <Sparkles className="h-3.5 w-3.5" />
                  完美手，拿滿 {handFeedback.maxScore} 分 · 額外 +1
                </span>
              ) : (
                <span className="text-muted-foreground">
                  本手最高 {handFeedback.maxScore} 分 · 拿下{' '}
                  {handFeedback.roundScore} 分
                </span>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div className="ml-auto flex items-center gap-1">
          {isGameOver && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RotateCcw className="mr-1 h-4 w-4" />
              再來一局
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpenRuleModal(true)}
          >
            <BookOpen className="mr-1 h-4 w-4" />
            規則
          </Button>
        </div>
      </div>
    </>
  );

  const classicFooter = (
    <button
      disabled={disabledActions}
      className="py-1 text-center text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
      onClick={onSkipHand}
    >
      {isLastRound ? '結算' : '跳過換牌'}
    </button>
  );

  return (
    <>
      <RuleModal
        isOpen={isOpenRuleModal}
        onOpenChange={setIsOpenRuleModal}
        mode="classic"
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
      <PuzzlePlayArea
        currentNumbers={handCard}
        selectedCards={selectedCards}
        onSelectCard={card => {
          if (disabledActions) return;
          onSelectCardOrSymbol(card);
        }}
        onRemoveCard={() => {}}
        onClearSelection={() => {
          if (disabledActions) return;
          onReselect();
        }}
        onSubmit={() => {
          const usedCount = selectedCards.filter(c => c.number).length;
          if (usedCount !== handCard.length) {
            toast.error(`必須使用全部 ${handCard.length} 張手牌`);
            return;
          }
          onPlayCard();
        }}
        onSkip={onSkipHand}
        onBack={onBack}
        theme="emerald"
        submitLabel="出牌"
        onBackStep={disabledActions ? undefined : onBackCard}
        hideExitButton={false}
        footerSlot={classicFooter}
        showSkipButton={false}
      >
        {classicHud}
      </PuzzlePlayArea>
    </>
  );
}
