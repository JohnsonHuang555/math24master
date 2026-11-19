'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Flag, History, Info, Layers, SkipForward, Star } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
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
import { ShareCardDialog } from '@/components/share/share-card-dialog';
import { ShareResultButton } from '@/components/share/share-result-button';
import { Button } from '@/components/ui/button';
import { useGameResult } from '@/hooks/useGameResult';
import { useLeaderboardSubmit } from '@/hooks/useLeaderboardSubmit';
import { useShareCard } from '@/hooks/useShareCard';
import useSinglePlay from '@/hooks/useSinglePlay';
import { type Grade, renderClassicShareCard } from '@/lib/share-card/classic';
import { SHARE_SITE, bestHandOf, formatCardDate } from '@/lib/share-card/data';
import { cn } from '@/lib/utils';
import { HandResult, RoundRecord } from '@/models/Player';
import { Difficulty } from '@/models/Room';
import { useGuestStore } from '@/stores/guest-store';
import { useLoginPromptPreferenceStore } from '@/stores/login-prompt-preference-store';
import { usePendingScoreStore } from '@/stores/pending-score-store';
import { useStatsStore } from '@/stores/stats-store';

type ClassicStatus = 'idle' | 'playing' | 'finished';

/** 解法效率 → 評級（總分 / 理論上限） */
function gradeOf(efficiency: number): Grade {
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
  const t = useTranslations('Classic');
  const tMode = useTranslations('SinglePlay.modes.classic');
  const tHome = useTranslations('Home');
  const locale = useLocale();
  const tScoring = useTranslations('GameUI.scoring');
  const tHistory = useTranslations('RoundHistory');

  const { status: sessionStatus } = useSession();
  const { guestId } = useGuestStore();
  const { clearPendingScore } = usePendingScoreStore();
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

  // 每局結算一個新的 id：分享圖卡依它判斷能不能沿用已產生的圖
  const gameResult = useGameResult(!!isGameOver);
  const bestHand = bestHandOf(roundHistory);
  const renderShareCard = useCallback(
    () =>
      renderClassicShareCard({
        score: currentScore,
        grade,
        efficiency,
        perfectHands,
        isNewBestScore,
        bestHand,
        labels: {
          brand: tHome('logoAlt'),
          badge: t('card.badge'),
          scoreLabel: t('card.scoreLabel'),
          newRecord: t('newRecord'),
          grade: t('grade'),
          efficiency: t('efficiency'),
          perfectHands: t('perfectHands'),
          bestHand: t('card.bestHand', { score: bestHand?.score ?? 0 }),
        },
        footer: {
          cta: t('card.cta'),
          site: SHARE_SITE,
          date: formatCardDate(gameResult?.finishedAt ?? new Date(), locale),
        },
      }),
    // 圖卡內容在一局結算後固定；換局由 gameResult（resultId）觸發重畫
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gameResult, locale, currentScore, grade, perfectHands, isNewBestScore],
  );
  const shareCard = useShareCard({
    mode: 'classic',
    fileName: 'math24-classic-result.png',
    resultId: gameResult?.id ?? null,
    path: '/single-play',
    render: renderShareCard,
  });

  const leaderboardSubmit = useLeaderboardSubmit(
    'classic',
    isGameOver ? { score: currentScore } : null,
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
    const id = setTimeout(() => setShowLoginPrompt(true), 1000);
    return () => clearTimeout(id);
  }, [isGameOver, isAuthenticated, sessionStatus, skipLoginPrompt]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 開始畫面 ──
  if (status === 'idle') {
    return (
      <GameStartScreen
        icon={Layers}
        title={tMode('label')}
        tagline={tMode('tagline')}
        description={t.rich('startDescription', { br: () => <br /> })}
        stats={
          bestScore > 0
            ? [
                {
                  label: t('bestScore'),
                  value: t('bestScoreValue', { score: bestScore }),
                },
              ]
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
          eyebrow={t('gameOver')}
          value={currentScore}
          badge={
            isNewBestScore ? (
              <RecordBadge>{t('newRecord')}</RecordBadge>
            ) : bestScore > 0 ? (
              <span className="text-sm font-semibold text-ink-2">
                {t('bestScoreInline', { score: bestScore })}
              </span>
            ) : null
          }
          stats={
            theoreticalMax > 0
              ? [
                  {
                    label: t('grade'),
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
                    label: t('efficiency'),
                    value: `${Math.round(efficiency * 100)}%`,
                  },
                  { label: t('perfectHands'), value: perfectHands },
                ]
              : undefined
          }
          backLabel={t('backToMenu')}
          onBack={onBack}
          retryLabel={t('playAgain')}
          onRetry={() => window.location.reload()}
        >
          <ResultRank mode="classic" submit={leaderboardSubmit} />
          <div className="flex gap-2">
            {roundHistory.length > 0 && (
              <ResultSecondaryButton onClick={() => setShowRoundHistory(true)}>
                <History aria-hidden />
                {t('viewHistory')}
              </ResultSecondaryButton>
            )}
            <ShareResultButton
              label={t('share')}
              generatingLabel={t('sharing')}
              isGenerating={shareCard.isGenerating}
              disabled={!shareCard.ready}
              onClick={() => void shareCard.start()}
            />
          </div>
        </GameResultScreen>
        <ShareCardDialog
          open={shareCard.open}
          onOpenChange={shareCard.setOpen}
          mode="classic"
          file={shareCard.file}
          imageFailed={shareCard.imageFailed}
          shareTitle={t('shareTitle')}
          shareText={t('shareText', { score: currentScore, grade })}
          shareUrl={shareCard.shareUrl}
        />
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
              {t('perfectFeedback', { max: handFeedback.maxScore })}
            </>
          ) : (
            <>
              <Info aria-hidden className="h-5 w-5 shrink-0" />
              {t('handFeedback', {
                max: handFeedback.maxScore,
                score: handFeedback.roundScore,
              })}
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
      {isLastRound ? t('finish') : t('skipHand')}
    </Button>
  );

  // 桌機右側欄：本局已出的每一手，最新的在最上面
  const historyAside = (
    <>
      <div className="flex items-center justify-between">
        <strong className="text-base text-ink">{t('historyTitle')}</strong>
        <span className="text-[13px] text-ink-2">
          {t.rich('handsPlayed', {
            count: roundHistory.length,
            n: chunks => (
              <span className="font-display text-[15px] text-ink">
                {chunks}
              </span>
            ),
          })}
        </span>
      </div>
      <ol className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {roundHistory.length === 0 ? (
          <li className="py-6 text-center text-sm text-ink-2">
            {t('historyEmpty')}
          </li>
        ) : (
          [...roundHistory].reverse().map(record => (
            <li
              key={record.round}
              className="flex flex-col gap-1.5 rounded-[14px] bg-sunken p-3"
            >
              <div className="flex items-center justify-between text-xs font-bold text-ink-2">
                <span>{t('handNumber', { round: record.round })}</span>
                {record.isPerfect && (
                  <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-amber px-[7px] text-[11px] text-on-amber">
                    <Star aria-hidden className="h-3 w-3" />
                    {t('perfectHand')}
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
                  {tHistory('couldEarnMore', {
                    points: record.bestScore - record.playerScore,
                  })}
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
          {t('viewFullHistory')}
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
            toast.error(t('mustUseAll', { count: handCard.length }));
            return;
          }
          onPlayCard();
        }}
        onSkip={onSkipHand}
        submitLabel={t('submit')}
        onBackStep={disabledActions ? undefined : onBackCard}
        busy={isScoring}
        busyLabel={tScoring('scoringNow')}
        stage={stage}
        footerSlot={isScoring ? null : classicFooter}
        onEscape={isScoring ? undefined : () => setShowLeaveConfirm(true)}
        aside={historyAside}
        desktopBar={
          <GameDesktopBar
            title={tMode('label')}
            escHint
            score={currentScore}
            remaining={remainCards}
            isLastRound={isLastRound}
            onExit={isScoring ? undefined : () => setShowLeaveConfirm(true)}
            onOpenRules={() => setIsOpenRuleModal(true)}
          />
        }
      >
        <GameHud
          modeLabel={tMode('label')}
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
