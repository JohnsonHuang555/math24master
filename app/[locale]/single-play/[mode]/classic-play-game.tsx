'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Flag,
  History,
  Info,
  Layers,
  Share2,
  SkipForward,
  Star,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { PuzzlePlayArea } from '@/components/areas/puzzle-play-area';
import { GameDesktopBar, GameHud } from '@/components/game/game-hud';
import {
  GameResultScreen,
  RecordBadge,
  ResultSecondaryButton,
} from '@/components/game/game-result-screen';
import { GameStartScreen } from '@/components/game/game-start-screen';
import { LeaveGameDialog } from '@/components/game/leave-game-dialog';
import { ScoreBreakdown } from '@/components/game/score-breakdown';
import { ResultRank } from '@/components/leaderboard/result-rank';
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

// 評級不另開色相：S 用琥珀、A 用主色，B、C 用中性色，字母本身就是資訊
const GRADE_CLASS: Record<string, string> = {
  S: 'bg-amber text-on-amber',
  A: 'bg-primary-tint text-primary-ink',
  B: 'border border-line-strong bg-sunken text-ink',
  C: 'bg-sunken text-ink-2',
};

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
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  // 出牌後已揭曉分數的運算符號數，每 250ms 加一
  const [revealedSymbols, setRevealedSymbols] = useState(0);
  const [handFeedback, setHandFeedback] = useState<HandResult | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [handHistory, setHandHistory] = useState<HandResult[]>([]);
  const [roundHistory, setRoundHistory] = useState<RoundRecord[]>([]);
  const [showRoundHistory, setShowRoundHistory] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const tScoring = useTranslations('GameUI.scoring');

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

  const {
    classicBestScore: bestScore,
    updateClassicBestScore: updateBestScore,
  } = useStatsStore();

  const disabledActions = checkAnswerCorrect === true || !!isGameOver;

  const startGame = () => {
    setDifficulty(Difficulty.Hard);
    setStatus('playing');
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
    if (checkAnswerCorrect !== true || selectedCardSymbols.length === 0) return;
    setRevealedSymbols(0); // eslint-disable-line react-hooks/set-state-in-effect
    const timers = selectedCardSymbols.map((_, i) =>
      setTimeout(
        () => {
          setRevealedSymbols(n => n + 1);
          onFinishedSymbolScoreAnimation();
        },
        (i + 1) * 250,
      ),
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

  const leaderboardSubmit = useLeaderboardSubmit(
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
      <GameStartScreen
        icon={Layers}
        title="經典模式"
        tagline="牌值 1–13 · 累積最高分"
        description={
          <>
            答對得分 · 跳過換牌 · 牌盡結束
            <br />
            拿滿該手最高分 = 完美手，額外 +1
          </>
        }
        stats={
          bestScore > 0
            ? [{ label: '個人最高', value: `${bestScore} 分` }]
            : undefined
        }
        onBack={onBack}
        onOpenRules={() => setIsOpenRuleModal(true)}
        onStart={startGame}
      >
        <RuleModal
          isOpen={isOpenRuleModal}
          onOpenChange={setIsOpenRuleModal}
          mode="classic"
        />
      </GameStartScreen>
    );
  }

  const loginPrompt = (
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
  );

  // ── 結算畫面 ──
  if (status === 'finished') {
    return (
      <>
        {loginPrompt}
        <RoundHistoryModal
          isOpen={showRoundHistory}
          onOpenChange={setShowRoundHistory}
          roundHistory={roundHistory}
        />
        <GameResultScreen
          eyebrow="遊戲結束"
          value={currentScore}
          badge={
            isNewBestScore ? (
              <RecordBadge>新紀錄！</RecordBadge>
            ) : bestScore > 0 ? (
              <span className="text-sm font-semibold text-ink-2">
                個人最高：{bestScore} 分
              </span>
            ) : null
          }
          stats={
            theoreticalMax > 0
              ? [
                  {
                    label: '解法評級',
                    value: (
                      <span
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-xl text-2xl',
                          GRADE_CLASS[grade],
                        )}
                      >
                        {grade}
                      </span>
                    ),
                  },
                  {
                    label: '解法效率',
                    value: `${Math.round(efficiency * 100)}%`,
                  },
                  { label: '完美手', value: perfectHands },
                ]
              : undefined
          }
          backLabel="返回選單"
          onBack={onBack}
          retryLabel="再來一局"
          onRetry={() => window.location.reload()}
        >
          <ResultRank mode="classic" submit={leaderboardSubmit} />
          <div className="flex gap-2">
            {roundHistory.length > 0 && (
              <ResultSecondaryButton onClick={() => setShowRoundHistory(true)}>
                <History aria-hidden />
                查看作答紀錄
              </ResultSecondaryButton>
            )}
            <ResultSecondaryButton
              onClick={handleShareResult}
              disabled={isSharing}
            >
              <Share2 aria-hidden />
              {isSharing ? '圖卡產生中...' : '分享成績'}
            </ResultSecondaryButton>
          </div>
        </GameResultScreen>
      </>
    );
  }

  // ── 遊戲中 ──
  const isScoring = checkAnswerCorrect === true;

  const stage = isScoring ? (
    <ScoreBreakdown tokens={selectedCards} revealed={revealedSymbols} />
  ) : (
    <AnimatePresence>
      {handFeedback && (
        <motion.div
          key="hand-feedback"
          role="status"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[15px] font-bold',
            handFeedback.isPerfect
              ? 'bg-amber text-on-amber'
              : 'border border-line bg-surface text-ink-2',
          )}
        >
          {handFeedback.isPerfect ? (
            <>
              <Star aria-hidden className="h-5 w-5 shrink-0" />
              完美手，拿滿 {handFeedback.maxScore} 分 · 額外 +1
            </>
          ) : (
            <>
              <Info aria-hidden className="h-5 w-5 shrink-0" />
              本手最高 {handFeedback.maxScore} 分 · 拿下{' '}
              {handFeedback.roundScore} 分
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  const classicFooter = (
    <Button
      variant="ghost"
      disabled={disabledActions}
      className="h-11 gap-1.5 px-3 text-[15px] font-bold text-primary-ink hover:bg-primary-tint hover:text-primary-ink lg:h-[60px] lg:rounded-2xl lg:border-2 lg:border-line-strong lg:bg-surface lg:px-[18px] lg:text-base lg:shadow-[0_4px_0_0_var(--line-strong)] lg:hover:bg-sunken"
      onClick={onSkipHand}
    >
      {isLastRound ? (
        <Flag aria-hidden className="h-[18px] w-[18px]" />
      ) : (
        <SkipForward aria-hidden className="h-[18px] w-[18px]" />
      )}
      {isLastRound ? '結算' : '跳過換牌'}
    </Button>
  );

  // 桌機右側欄：本局已出的每一手，最新的在最上面
  const historyAside = (
    <>
      <div className="flex items-center justify-between">
        <strong className="text-base text-ink">本局作答</strong>
        <span className="text-[13px] text-ink-2">
          已出{' '}
          <span className="font-display text-[15px] text-ink">
            {roundHistory.length}
          </span>{' '}
          手
        </span>
      </div>
      <ol className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {roundHistory.length === 0 ? (
          <li className="py-6 text-center text-sm text-ink-2">
            出牌後會列在這裡
          </li>
        ) : (
          [...roundHistory].reverse().map(record => (
            <li
              key={record.round}
              className="flex flex-col gap-1.5 rounded-[14px] bg-sunken p-3"
            >
              <div className="flex items-center justify-between text-xs font-bold text-ink-2">
                <span>第 {record.round} 手</span>
                {record.isPerfect && (
                  <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-amber px-[7px] text-[11px] text-on-amber">
                    <Star aria-hidden className="h-3 w-3" />
                    完美手
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-display text-[15px] font-extrabold text-ink">
                  {record.playerFormula}
                </span>
                <span className="shrink-0 font-display text-lg font-extrabold text-primary-ink">
                  +{record.playerScore}
                </span>
              </div>
              {!record.isPerfect && record.bestScore > record.playerScore && (
                <span className="text-xs font-semibold text-amber-ink">
                  最佳解可多得 {record.bestScore - record.playerScore} 分
                </span>
              )}
            </li>
          ))
        )}
      </ol>
      {roundHistory.length > 0 && (
        <Button
          variant="ghost"
          className="mt-auto h-11 border border-line text-sm font-semibold text-primary-ink hover:bg-primary-tint hover:text-primary-ink"
          onClick={() => setShowRoundHistory(true)}
        >
          查看完整作答紀錄
        </Button>
      )}
    </>
  );

  return (
    <>
      <RuleModal
        isOpen={isOpenRuleModal}
        onOpenChange={setIsOpenRuleModal}
        mode="classic"
      />
      <RoundHistoryModal
        isOpen={showRoundHistory}
        onOpenChange={setShowRoundHistory}
        roundHistory={roundHistory}
      />
      <LeaveGameDialog
        open={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        onLeave={onBack}
      />
      {loginPrompt}
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
        submitLabel="出牌"
        onBackStep={disabledActions ? undefined : onBackCard}
        busy={isScoring}
        busyLabel={tScoring('scoringNow')}
        stage={stage}
        footerSlot={isScoring ? null : classicFooter}
        onEscape={isScoring ? undefined : () => setShowLeaveConfirm(true)}
        aside={historyAside}
        desktopBar={
          <GameDesktopBar
            title="經典模式"
            score={currentScore}
            remaining={remainCards}
            isLastRound={isLastRound}
            onExit={isScoring ? undefined : () => setShowLeaveConfirm(true)}
            onOpenRules={() => setIsOpenRuleModal(true)}
          />
        }
      >
        <GameHud
          modeLabel="經典模式"
          score={currentScore}
          remaining={remainCards}
          isLastRound={isLastRound}
          onExit={isScoring ? undefined : () => setShowLeaveConfirm(true)}
          onOpenRules={() => setIsOpenRuleModal(true)}
        />
      </PuzzlePlayArea>
    </>
  );
}
