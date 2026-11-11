'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Ban, LayoutGrid, Share2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { MatchPlayArea } from '@/components/areas/match-play-area';
import { GameDesktopBar, GameHud } from '@/components/game/game-hud';
import {
  GameResultScreen,
  RecordBadge,
  ResultSecondaryButton,
} from '@/components/game/game-result-screen';
import { GameStartScreen } from '@/components/game/game-start-screen';
import { LeaveGameDialog } from '@/components/game/leave-game-dialog';
import { ResultRank } from '@/components/leaderboard/result-rank';
import { LoginPromptModal } from '@/components/modals/login-prompt-modal';
import { RuleModal } from '@/components/modals/rule-modal';
import { useLeaderboardSubmit } from '@/hooks/useLeaderboardSubmit';
import useMatchPlay from '@/hooks/useMatchPlay';
import { trackShare } from '@/lib/analytics';
import { renderMatchResultCard } from '@/lib/match-result-card';
import { shareImage } from '@/lib/share';
import { cn } from '@/lib/utils';
import { MatchCell } from '@/models/MatchBoard';
import { useGuestStore } from '@/stores/guest-store';
import { useLoginPromptPreferenceStore } from '@/stores/login-prompt-preference-store';
import { usePendingScoreStore } from '@/stores/pending-score-store';
import { useStatsStore } from '@/stores/stats-store';

type MatchScreenStatus = 'idle' | 'playing' | 'finished';

interface MatchPlayGameProps {
  onBack: () => void;
  autoStart?: boolean;
}

export default function MatchPlayGame({
  onBack,
  autoStart,
}: MatchPlayGameProps) {
  const [screenStatus, setScreenStatus] = useState<MatchScreenStatus>(
    autoStart ? 'playing' : 'idle',
  );
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);
  const t = useTranslations('Matching');
  const tMode = useTranslations('SinglePlay.modes.match');
  const tClassic = useTranslations('Classic');
  const tShare = useTranslations('Share');
  const format = useFormatter();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [scoreFlash, setScoreFlash] = useState<number | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const prevScoreRef = useRef(0);
  const reduceMotion = useReducedMotion();

  const { status: sessionStatus } = useSession();
  const { guestId } = useGuestStore();
  const { setPendingScore, clearPendingScore } = usePendingScoreStore();
  const { skipLoginPrompt, setSkipLoginPrompt } =
    useLoginPromptPreferenceStore();
  const isAuthenticated = sessionStatus === 'authenticated' || !!guestId;

  const {
    matchBestScore: bestScore,
    updateMatchBestScore: updateBestScore,
    incrementMatchPlays,
  } = useStatsStore();

  const {
    cells,
    selectedCards,
    score,
    remainingCount,
    status,
    isGameOver,
    onSelectCardOrSymbol,
    onReselect,
    onBack: onBackStep,
    onSubmit,
    onRestart,
  } = useMatchPlay();

  const startGame = () => setScreenStatus('playing');

  const handleRestart = () => {
    prevScoreRef.current = 0;
    setScoreFlash(null);
    onRestart();
  };

  useEffect(() => {
    if (autoStart) startGame();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isCleared = status === 'cleared';

  useEffect(() => {
    if (!isGameOver) return;
    setScreenStatus('finished');
    incrementMatchPlays();
    // 未全清的分數不算數（規則：全部清除才計分上榜），不列入個人最佳
    if (isCleared) updateBestScore(score);
  }, [isGameOver]); // eslint-disable-line react-hooks/exhaustive-deps

  const isNewBestScore =
    screenStatus === 'finished' && isCleared && score > 0 && score >= bestScore;

  // 消除成功時在牌面上彈出「+N 分！」
  useEffect(() => {
    if (screenStatus !== 'playing') return;
    if (score > prevScoreRef.current) {
      const gained = score - prevScoreRef.current;
      prevScoreRef.current = score;
      setScoreFlash(gained);
      const id = setTimeout(() => setScoreFlash(null), 950);
      return () => clearTimeout(id);
    }
  }, [score, screenStatus]);

  const leaderboardSubmit = useLeaderboardSubmit(
    'match',
    isAuthenticated && isCleared ? { score } : null,
    isAuthenticated && isCleared,
  );

  useEffect(() => {
    if (
      !isCleared ||
      isAuthenticated ||
      sessionStatus === 'loading' ||
      skipLoginPrompt ||
      score <= 0
    )
      return;
    setPendingScore({ mode: 'match', payload: { score } });
    const id = setTimeout(() => setShowLoginPrompt(true), 1000);
    return () => clearTimeout(id);
  }, [isCleared, isAuthenticated, sessionStatus, skipLoginPrompt]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleShareResult = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const blob = await renderMatchResultCard({
        score,
        isNewBestScore,
        labels: {
          brand: tClassic('card.brand'),
          badge: t('card.badge'),
          finalScore: t('card.finalScore'),
          newRecord: t('newRecord'),
          cta: tClassic('card.cta'),
        },
      });
      if (!blob) {
        toast.error(tShare('imageFailed'));
        return;
      }
      const file = new File([blob], 'math24-match-result.png', {
        type: 'image/png',
      });
      const outcome = await shareImage(file, {
        title: t('shareTitle'),
        text: t('shareText', { score }),
      });
      trackShare('match', outcome);
      if (outcome === 'downloaded') {
        toast.success(tShare('downloaded'));
      } else if (outcome === 'failed') {
        toast.error(tShare('failed'));
      }
    } finally {
      setIsSharing(false);
    }
  };

  const ruleModal = (
    <RuleModal
      isOpen={isOpenRuleModal}
      onOpenChange={setIsOpenRuleModal}
      mode="match"
    />
  );

  // ── 開始畫面 ──
  if (screenStatus === 'idle') {
    return (
      <>
        {ruleModal}
        <GameStartScreen
          icon={LayoutGrid}
          title={tMode('label')}
          tagline={t('tagline')}
          description={t('startDescription')}
          stats={
            bestScore > 0
              ? [
                  {
                    label: t('bestScore'),
                    value: t('points', { score: bestScore }),
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
  if (screenStatus === 'finished') {
    const remainingCards = cells.filter(cell => cell.card);
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
          hero={<MiniBoard cells={cells} cleared={isCleared} />}
          eyebrow={isCleared ? t('fullClear') : t('stuck')}
          detail={
            !isCleared && (
              <>
                <p className="text-[15px] leading-relaxed text-ink-2">
                  {t('stuckDetail', { count: remainingCount })}
                </p>
                <div
                  className="my-1 flex gap-2"
                  aria-label={t('remainingCardsLabel', {
                    cards: format.list(
                      remainingCards.map(c => String(c.card!.value)),
                    ),
                  })}
                >
                  {remainingCards.map(cell => (
                    <span
                      key={cell.card!.id}
                      aria-hidden
                      className="flex h-[60px] w-11 items-center justify-center rounded-[10px] border-2 border-playcard-line bg-playcard font-display text-2xl font-extrabold text-playcard-ink shadow-[0_3px_0_0_var(--playcard-edge)]"
                    >
                      {cell.card!.value}
                    </span>
                  ))}
                </div>
              </>
            )
          }
          label={isCleared ? undefined : t('roundScore')}
          value={score}
          valueMuted={!isCleared}
          badge={
            !isCleared ? (
              <span className="inline-flex h-7 items-center gap-[5px] rounded-full border border-line-strong bg-sunken px-2.5 text-[13px] font-bold text-ink">
                <Ban aria-hidden className="h-4 w-4" />
                {t('notRanked')}
              </span>
            ) : isNewBestScore ? (
              <RecordBadge>{t('newRecord')}</RecordBadge>
            ) : bestScore > 0 ? (
              <span className="text-sm text-ink-2">
                {t.rich('bestScoreInline', {
                  score: bestScore,
                  b: chunks => (
                    <b className="font-display font-extrabold text-ink">
                      {chunks}
                    </b>
                  ),
                })}
              </span>
            ) : null
          }
          backLabel={t('backToMenu')}
          onBack={onBack}
          retryLabel={t('playAgain')}
          onRetry={() => {
            setScreenStatus('playing');
            handleRestart();
          }}
        >
          {isCleared && (
            <>
              <ResultRank mode="match" submit={leaderboardSubmit} />
              <ResultSecondaryButton
                className="flex-none"
                onClick={handleShareResult}
                disabled={isSharing}
              >
                <Share2 aria-hidden />
                {isSharing ? t('sharing') : t('share')}
              </ResultSecondaryButton>
            </>
          )}
        </GameResultScreen>
      </>
    );
  }

  // ── 遊戲中 ──
  const boardOverlay = (
    <AnimatePresence>
      {scoreFlash !== null && (
        <motion.div
          role="status"
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={
            reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.2, y: -24 }
          }
          transition={{ duration: reduceMotion ? 0 : 0.25 }}
        >
          <span className="rounded-[20px] bg-surface px-5 py-1.5 font-display text-[72px] leading-none font-extrabold text-primary-ink shadow-[0_12px_32px_rgba(16,36,33,0.18)]">
            {t.rich('scoreFlash', {
              score: scoreFlash,
              unit: chunks => (
                <span className="ml-1 font-noto text-[32px] font-black">
                  {chunks}
                </span>
              ),
            })}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {ruleModal}
      <LeaveGameDialog
        open={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        onLeave={onBack}
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
      <MatchPlayArea
        cells={cells}
        selectedCards={selectedCards}
        onSelectCard={onSelectCardOrSymbol}
        onClearSelection={onReselect}
        onBackStep={onBackStep}
        onSubmit={onSubmit}
        onRestart={handleRestart}
        boardOverlay={boardOverlay}
        onEscape={() => setShowLeaveConfirm(true)}
        desktopBar={
          <GameDesktopBar
            title={tMode('label')}
            escHint
            score={score}
            remaining={remainingCount}
            onExit={() => setShowLeaveConfirm(true)}
            onOpenRules={() => setIsOpenRuleModal(true)}
          />
        }
      >
        <GameHud
          modeLabel={tMode('label')}
          score={score}
          remaining={remainingCount}
          onExit={() => setShowLeaveConfirm(true)}
          onOpenRules={() => setIsOpenRuleModal(true)}
        />
      </MatchPlayArea>
    </>
  );
}

/** 結算用的迷你牌面：全清時 16 格都是主色虛線；卡關時剩下的牌以實心格標出位置 */
function MiniBoard({
  cells,
  cleared,
}: {
  cells: MatchCell[];
  cleared: boolean;
}) {
  return (
    <div aria-hidden className="grid grid-cols-4 gap-1">
      {cells.map(cell => (
        <span
          key={cell.cellIndex}
          className={cn(
            'h-[22px] w-[22px] rounded-[5px]',
            cleared
              ? 'border-2 border-dashed border-primary'
              : cell.card
                ? 'border-[1.5px] border-playcard-line bg-playcard'
                : 'border-[1.5px] border-dashed border-line-strong',
          )}
        />
      ))}
    </div>
  );
}
