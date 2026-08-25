'use client';

import { useEffect, useState } from 'react';
import { BookOpen, LayoutGrid, Play, Share2, Trophy } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { MatchPlayArea } from '@/components/areas/match-play-area';
import { LoginPromptModal } from '@/components/modals/login-prompt-modal';
import { RuleModal } from '@/components/modals/rule-modal';
import { Button } from '@/components/ui/button';
import { useLeaderboardSubmit } from '@/hooks/useLeaderboardSubmit';
import useMatchPlay from '@/hooks/useMatchPlay';
import { renderMatchResultCard } from '@/lib/match-result-card';
import { shareImage } from '@/lib/share';
import { useGuestStore } from '@/stores/guest-store';
import { useLoginPromptPreferenceStore } from '@/stores/login-prompt-preference-store';
import { usePendingScoreStore } from '@/stores/pending-score-store';

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

  const { status: sessionStatus } = useSession();
  const { guestId } = useGuestStore();
  const { setPendingScore, clearPendingScore } = usePendingScoreStore();
  const { skipLoginPrompt, setSkipLoginPrompt } =
    useLoginPromptPreferenceStore();
  const isAuthenticated = sessionStatus === 'authenticated' || !!guestId;

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

  useEffect(() => {
    if (autoStart) startGame();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isGameOver) setScreenStatus('finished');
  }, [isGameOver]);

  const isCleared = status === 'cleared';

  useLeaderboardSubmit(
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
        // v1 不做 stats-store 整合，暫不追蹤個人最佳分數
        isNewBestScore: false,
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

  // ── 開始畫面 ──
  if (screenStatus === 'idle') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-white shadow-[0_5px_0_0_hsl(175,84%,20%)]">
            <LayoutGrid className="h-8 w-8" />
          </div>
          <div>
            <h1 className="flex items-center justify-center gap-2 font-display text-2xl font-black text-foreground">
              消消樂模式
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                Beta
              </span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              16 張牌 · 任選 2~4 張湊 24
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              沒有時間限制 · 全部清除才計分上榜
            </p>
          </div>
        </div>
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
  if (screenStatus === 'finished') {
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
          <div className="w-full max-w-sm rounded-3xl border-2 border-zinc-200 bg-white/90 p-6 text-center shadow-[0_8px_0_0_hsl(175,84%,78%)] dark:border-zinc-700 dark:bg-zinc-900/80 dark:shadow-[0_8px_0_0_hsl(175,84%,20%)]">
            {isCleared ? (
              <>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-900/30">
                  <Trophy className="h-7 w-7 text-teal-500" />
                </div>
                <h2 className="font-display text-xl font-black text-foreground">
                  全清！
                </h2>
                <div className="mt-4">
                  <p className="font-display text-5xl font-bold text-primary">
                    {score}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    最終得分
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="mt-6 w-full gap-1.5"
                  onClick={handleShareResult}
                  disabled={isSharing}
                >
                  <Share2 className="h-4 w-4" />
                  {isSharing ? '圖卡產生中...' : '分享成績'}
                </Button>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60">
                  <LayoutGrid className="h-7 w-7 text-zinc-400" />
                </div>
                <h2 className="font-display text-xl font-black text-foreground">
                  卡關了
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  剩下 {remainingCount} 張牌怎麼選都湊不出 24
                </p>
                <div className="mt-4">
                  <p className="font-display text-4xl font-bold text-foreground">
                    {score}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    本局得分（未計入排行榜）
                  </p>
                </div>
              </>
            )}
            <div className="mt-3 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onBack}>
                返回選單
              </Button>
              <Button
                variant="tactile"
                className="flex-1"
                onClick={() => {
                  setScreenStatus('playing');
                  onRestart();
                }}
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
  const matchHud = (
    <>
      <div className="flex w-full max-w-sm items-center justify-between rounded-2xl border-2 border-zinc-200 bg-white/95 px-5 py-3 shadow-[0_4px_0_0_rgba(0,0,0,0.05)] dark:border-zinc-700 dark:bg-zinc-900/90">
        <div>
          <p className="text-[10px] font-medium text-muted-foreground">得分</p>
          <p className="font-display text-2xl font-bold tabular-nums text-primary">
            {score}
          </p>
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-muted-foreground">
            消消樂模式
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium text-muted-foreground">剩餘</p>
          <p className="font-display text-lg font-semibold tabular-nums text-foreground">
            {remainingCount} 張
          </p>
        </div>
      </div>

      {/* nav row */}
      <div className="flex w-full max-w-sm items-center justify-end px-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpenRuleModal(true)}
        >
          <BookOpen className="mr-1 h-4 w-4" />
          規則
        </Button>
      </div>
    </>
  );

  return (
    <>
      <RuleModal
        isOpen={isOpenRuleModal}
        onOpenChange={setIsOpenRuleModal}
        mode="match"
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
        onRestart={onRestart}
        onExit={onBack}
      >
        {matchHud}
      </MatchPlayArea>
    </>
  );
}
