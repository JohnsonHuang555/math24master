'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Ban, LayoutGrid, Share2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { MatchPlayArea } from '@/components/areas/match-play-area';
import { GameHud } from '@/components/game/game-hud';
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
      });
      if (!blob) {
        toast.error('圖卡產生失敗，請稍後再試');
        return;
      }
      const file = new File([blob], 'math24-match-result.png', {
        type: 'image/png',
      });
      const outcome = await shareImage(file, {
        title: 'Math24 消消樂模式',
        text: `Math24 消消樂模式全清結果：${score} 分\n來 math24master.com 挑戰看看`,
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
          title="消消樂模式"
          tagline="16 張牌 · 任選 2~4 張湊 24"
          description="沒有時間限制 · 全部清除才計分上榜"
          stats={
            bestScore > 0
              ? [{ label: '個人最佳', value: `${bestScore} 分` }]
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
          eyebrow={isCleared ? '全清！' : '卡關了'}
          detail={
            !isCleared && (
              <>
                <p className="text-[15px] leading-relaxed text-ink-2">
                  剩下 {remainingCount} 張牌怎麼選都湊不出 24
                </p>
                <div
                  className="my-1 flex gap-2"
                  aria-label={`剩下的牌：${remainingCards.map(c => c.card!.value).join('、')}`}
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
          label={isCleared ? undefined : '本局得分'}
          value={score}
          valueMuted={!isCleared}
          badge={
            !isCleared ? (
              <span className="inline-flex h-7 items-center gap-[5px] rounded-full border border-line-strong bg-sunken px-2.5 text-[13px] font-bold text-ink">
                <Ban aria-hidden className="h-4 w-4" />
                未計入排行榜
              </span>
            ) : isNewBestScore ? (
              <RecordBadge>新紀錄！</RecordBadge>
            ) : bestScore > 0 ? (
              <span className="text-sm text-ink-2">
                個人最佳：
                <b className="font-display font-extrabold text-ink">
                  {bestScore} 分
                </b>
              </span>
            ) : null
          }
          backLabel="返回選單"
          onBack={onBack}
          retryLabel="再來一局"
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
                {isSharing ? '圖卡產生中...' : '分享成績'}
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
            +{scoreFlash}
            <span className="ml-1 font-noto text-[32px] font-black">分！</span>
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
      >
        <GameHud
          modeLabel="消消樂模式"
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
