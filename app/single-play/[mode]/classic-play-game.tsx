'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { BookOpen, LogOut, RotateCcw } from 'lucide-react';
import { PuzzlePlayArea } from '@/components/areas/puzzle-play-area';
import { RuleModal } from '@/components/modals/rule-modal';
import { Button } from '@/components/ui/button';
import { useLeaderboardSubmit } from '@/hooks/useLeaderboardSubmit';
import useSinglePlay from '@/hooks/useSinglePlay';
import { Difficulty } from '@/models/Room';
import { useAlertDialogStore } from '@/providers/alert-dialog-store-provider';
import { useStatsStore } from '@/stores/stats-store';
import { Symbol } from '@/models/Symbol';

type ClassicStatus = 'idle' | 'playing' | 'finished';

interface ClassicPlayGameProps {
  onBack: () => void;
  autoStart?: boolean;
}

export default function ClassicPlayGame({ onBack, autoStart }: ClassicPlayGameProps) {
  const [status, setStatus] = useState<ClassicStatus>('idle');
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);
  const [scoreFlash, setScoreFlash] = useState<number | null>(null);
  const prevScoreRef = useRef(0);

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
  } = useSinglePlay(difficulty);

  const currentPlayer = roomInfo?.players[0];
  const handCard = currentPlayer?.handCard || [];
  const currentScore = roomInfo?.players[0]?.score ?? 0;
  const remainCards = roomInfo?.deck.length ?? 0;
  const selectedCards = roomInfo?.selectedCards ?? [];

  const count = useMotionValue(currentScore);
  const rounded = useTransform(count, Math.round);

  const { onOpen, isConfirmed, onReset } = useAlertDialogStore(state => state);
  const { classicBestScore: bestScore, updateClassicBestScore: updateBestScore } = useStatsStore();

  const disabledActions = checkAnswerCorrect === true || !!isGameOver;

  const startGame = () => {
    setDifficulty(Difficulty.Hard);
    setStatus('playing');
    prevScoreRef.current = 0;
  };

  useEffect(() => {
    if (autoStart) startGame();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isConfirmed) {
      onReset();
      window.location.reload();
    }
  }, [isConfirmed, onReset]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (roomInfo?.isGameOver) {
      updateBestScore(currentScore);
      setStatus('finished');
    }
  }, [roomInfo?.isGameOver]); // eslint-disable-line react-hooks/exhaustive-deps

  // 分數動畫
  useEffect(() => {
    animate(count, currentScore, { duration: 0.3 });
  }, [count, currentScore]);

  // 得分閃現
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

  // 答對後觸發動畫鏈
  useEffect(() => {
    if (checkAnswerCorrect !== true || selectedCardSymbols.length === 0) return;
    const timers = selectedCardSymbols.map((_, i) =>
      setTimeout(() => onFinishedSymbolScoreAnimation(), (i + 1) * 250),
    );
    return () => timers.forEach(clearTimeout);
  }, [checkAnswerCorrect]); // eslint-disable-line react-hooks/exhaustive-deps

  // 加分動畫結束後觸發 onUpdateScore（用 useEffect 確保 cleanup，避免 double-call）
  useEffect(() => {
    if (!isSymbolScoreAnimationFinished) return;
    const id = setTimeout(() => onUpdateScore(), 1500);
    return () => clearTimeout(id);
  }, [isSymbolScoreAnimationFinished]); // eslint-disable-line react-hooks/exhaustive-deps

  const isNewBestScore = status === 'finished' && currentScore > 0 && currentScore >= bestScore;

  useLeaderboardSubmit(
    'classic',
    isGameOver ? { score: currentScore } : null,
    !!isGameOver,
  );

  // 開始畫面
  if (status === 'idle') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold">經典模式</h1>
          <p className="text-muted-foreground">牌值 1–13・累積最高分</p>
          <p className="text-sm text-muted-foreground">
            答對得分・跳過換牌・牌組用完遊戲結束
          </p>
        </div>
        {bestScore > 0 && (
          <div className="w-full max-w-xs rounded-xl border p-4 text-center">
            <p className="text-sm font-semibold text-muted-foreground">個人最高</p>
            <p className="text-2xl font-bold">{bestScore} 分</p>
          </div>
        )}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onBack()}>返回</Button>
          <Button onClick={startGame}>開始遊戲</Button>
        </div>
      </div>
    );
  }

  // 結束畫面
  if (status === 'finished') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-bold">遊戲結束</h1>
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-5xl font-bold">{currentScore} 分</p>
          <p className="text-muted-foreground">最終得分</p>
          {isNewBestScore && (
            <p className="text-sm font-semibold text-amber-500">🏆 新紀錄！</p>
          )}
        </div>
        {!isNewBestScore && bestScore > 0 && (
          <div className="text-sm text-muted-foreground">
            個人最高：{bestScore} 分
          </div>
        )}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onBack()}>返回選單</Button>
          <Button onClick={() => window.location.reload()}>再來一局</Button>
        </div>
      </div>
    );
  }

  // 遊戲中 — HUD children slot
  const classicHud = (
    <>
      {/* 得分閃現 overlay */}
      <AnimatePresence>
        {scoreFlash !== null && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.4, y: -24 }}
            transition={{ duration: 0.25 }}
          >
            <span className="text-6xl font-black text-emerald-500 drop-shadow-lg">
              +{scoreFlash}分！
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD bar */}
      <div className="flex w-full items-center justify-between border-b bg-background/90 px-4 py-2.5 backdrop-blur-sm">
        <div>
          <p className="text-xs text-muted-foreground">得分</p>
          <motion.div className="text-2xl font-bold tabular-nums">{rounded}</motion.div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-muted-foreground">經典模式</p>
          {isLastRound && (
            <p className="animate-pulse text-xs font-bold text-red-500">最後一輪！</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">牌庫</p>
          <p className="text-lg font-semibold tabular-nums">{remainCards} 張</p>
        </div>
      </div>

      {/* 導覽列 */}
      <div className="flex w-full items-center justify-end gap-1 px-3 py-1">
        {isGameOver && (
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
            <RotateCcw className="mr-1 h-4 w-4" />再來一局
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => setIsOpenRuleModal(true)}>
          <BookOpen className="mr-1 h-4 w-4" />規則
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onOpen({
              title: '回上一頁',
              description: isGameOver
                ? '離開遊戲回到首頁'
                : '離開遊戲後，當前進度將會消失，確定要離開嗎？',
            })
          }
        >
          <LogOut className="mr-1 h-4 w-4" />離開
        </Button>
      </div>

      {/* 加分獎勵顯示 */}
      <AnimatePresence>
        {isSymbolScoreAnimationFinished && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex gap-3 text-xs font-semibold text-emerald-600"
          >
            {selectedCardSymbols.filter(c => c.symbol === Symbol.Times).length >= 2 && (
              <span>符號 2 張乘 +1</span>
            )}
            {selectedCardSymbols.filter(c => c.symbol === Symbol.Divide).length >= 2 && (
              <span>符號 2 張除 +1</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  // 跳過換牌文字連結
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
      <RuleModal isOpen={isOpenRuleModal} onOpenChange={setIsOpenRuleModal} />
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
        onBack={() => {}}
        theme="emerald"
        submitLabel="出牌"
        onBackStep={disabledActions ? undefined : onBackCard}
        hideExitButton={true}
        footerSlot={classicFooter}
        showSkipButton={false}
        compact={true}
      >
        {classicHud}
      </PuzzlePlayArea>
    </>
  );
}
