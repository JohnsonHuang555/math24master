'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { BookOpen, ChevronLeft, Flag, Timer } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { PuzzlePlayArea } from '@/components/areas/puzzle-play-area';
import { GameDesktopBar } from '@/components/game/game-hud';
import {
  GameResultScreen,
  RecordBadge,
} from '@/components/game/game-result-screen';
import { GameStartScreen } from '@/components/game/game-start-screen';
import { GameTimer, TimerDelta } from '@/components/game/game-timer';
import { LeaveGameDialog } from '@/components/game/leave-game-dialog';
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

  const t = useTranslations('Challenge');
  const tMode = useTranslations('SinglePlay.modes.challenge');
  const tHud = useTranslations('GameUI.hud');
  const tLeave = useTranslations('GameUI.leave');
  const tTimer = useTranslations('GameUI.timer');
  const reduceMotion = useReducedMotion();
  const [timeDelta, setTimeDelta] = useState<TimerDelta | null>(null);
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);
  const [showEarlyEndConfirm, setShowEarlyEndConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const deltaTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const { status: sessionStatus } = useSession();
  const { guestId } = useGuestStore();
  const { clearPendingScore } = usePendingScoreStore();
  const { skipLoginPrompt, setSkipLoginPrompt } =
    useLoginPromptPreferenceStore();
  const isAuthenticated = sessionStatus === 'authenticated' || !!guestId;

  const isFinished = status === 'finished';

  const leaderboardSubmit = useLeaderboardSubmit(
    'challenge',
    isFinished ? { stage, totalScore } : null,
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

  const ruleModal = (
    <RuleModal
      isOpen={isOpenRuleModal}
      onOpenChange={setIsOpenRuleModal}
      mode="challenge"
    />
  );

  // ── 開始畫面 ──
  if (status === 'idle') {
    if (autoStart) return null;
    return (
      <>
        {ruleModal}
        <GameStartScreen
          icon={Timer}
          title={tMode('label')}
          tagline={tMode('tagline')}
          description={t('startDescription')}
          stats={
            best
              ? [
                  {
                    label: t('bestStage'),
                    value: t('stage', { stage: best.stage }),
                  },
                  {
                    label: t('bestScore'),
                    value: t('points', { score: best.totalScore }),
                  },
                ]
              : undefined
          }
          onBack={onBack}
          onOpenRules={() => setIsOpenRuleModal(true)}
          onStart={startGame}
        />
      </>
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
        <GameResultScreen
          eyebrow={
            finishReason === 'early' ? (
              <>
                <Flag aria-hidden />
                {t('endedEarly')}
              </>
            ) : (
              <>
                <Timer aria-hidden />
                {t('timeUp')}
              </>
            )
          }
          label={t('finalStage')}
          value={t('stage', { stage })}
          badge={isNewBest ? <RecordBadge>{t('newRecord')}</RecordBadge> : null}
          stats={[
            { label: t('totalScore'), value: totalScore },
            ...(best && best.stage > 0 && !isNewBest
              ? [
                  {
                    label: t('personalBest'),
                    value: t('stage', { stage: best.stage }),
                    muted: true,
                  },
                ]
              : []),
          ]}
          backLabel={t('backToMenu')}
          onBack={onBack}
          retryLabel={t('retry')}
          onRetry={startGame}
        >
          <ResultRank mode="challenge" submit={leaderboardSubmit} />
        </GameResultScreen>
      </>
    );
  }

  // ── 遊戲中 ──
  return (
    <>
      {ruleModal}
      <LeaveGameDialog
        open={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        onLeave={() => {
          quitGame();
          onBack();
        }}
      />
      <PuzzlePlayArea
        currentNumbers={currentNumbers}
        selectedCards={selectedCards}
        onSelectCard={selectCard}
        onRemoveCard={removeCard}
        onClearSelection={clearSelection}
        onSubmit={submitAnswer}
        onSkip={handleSkip}
        showSkipButton={true}
        skipPenaltyText={tTimer('delta', {
          sign: '−',
          seconds: nextSkipPenalty,
        })}
        onEscape={() => setShowLeaveConfirm(true)}
        banner={
          <GameTimer
            seconds={seconds}
            maxSeconds={5 * 60}
            delta={timeDelta}
            aside={
              <span className="ml-auto flex items-baseline gap-2 text-[13px] text-ink-2">
                <span className="font-display text-xl leading-none font-extrabold text-ink">
                  {t('stage', { stage })}
                </span>
                <span>
                  {t.rich('hudPoints', {
                    score: totalScore,
                    b: chunks => (
                      <b className="font-display font-bold text-ink">
                        {chunks}
                      </b>
                    ),
                  })}
                </span>
              </span>
            }
          />
        }
        desktopBar={
          <GameDesktopBar
            title={tMode('label')}
            escHint
            onExit={() => setShowLeaveConfirm(true)}
            onOpenRules={() => setIsOpenRuleModal(true)}
            actions={
              <Button
                variant="ghost"
                className="h-11 gap-1.5 border border-line-strong px-3 text-sm font-semibold text-ink"
                onClick={() => setShowEarlyEndConfirm(true)}
              >
                <Flag className="h-5 w-5" />
                {t('endEarly')}
              </Button>
            }
          />
        }
      >
        {/* HUD */}
        <div className="flex w-full items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 text-ink"
            onClick={() => setShowLeaveConfirm(true)}
            aria-label={tHud('exit')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink-2">
            {tMode('label')}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 text-ink"
            onClick={() => setIsOpenRuleModal(true)}
            aria-label={tHud('rules')}
          >
            <BookOpen className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            className="h-11 gap-1 px-2.5 text-sm font-bold text-ink"
            onClick={() => setShowEarlyEndConfirm(true)}
          >
            <Flag className="h-4.5 w-4.5" />
            {t('endEarly')}
          </Button>
        </div>
      </PuzzlePlayArea>

      <AlertDialog
        open={showEarlyEndConfirm}
        onOpenChange={setShowEarlyEndConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('endEarlyTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('endEarlyDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tLeave('stay')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowEarlyEndConfirm(false);
                endGameEarly();
              }}
            >
              {t('endNow')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
