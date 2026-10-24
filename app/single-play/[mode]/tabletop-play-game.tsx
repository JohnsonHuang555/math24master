'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  BookOpen,
  Bot,
  Hand,
  History,
  LogOut,
  Play,
  RotateCcw,
  Shapes,
  Trophy,
  User,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { ResultRank } from '@/components/leaderboard/result-rank';
import { LoginPromptModal } from '@/components/modals/login-prompt-modal';
import { RuleModal } from '@/components/modals/rule-modal';
import { JokerDeclareDialog } from '@/components/tabletop/joker-declare-dialog';
import { TabletopComposer } from '@/components/tabletop/tabletop-composer';
import { TabletopHand } from '@/components/tabletop/tabletop-hand';
import { TabletopHistoryDialog } from '@/components/tabletop/tabletop-history-dialog';
import { TabletopScoreboard } from '@/components/tabletop/tabletop-scoreboard';
import { TabletopTableArea } from '@/components/tabletop/tabletop-table-area';
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
import { useLeaderboardSubmit } from '@/hooks/useLeaderboardSubmit';
import useTabletopPlay from '@/hooks/useTabletopPlay';
import type { LeaderboardMode } from '@/lib/leaderboard';
import { cn } from '@/lib/utils';
import { TabletopDifficulty } from '@/models/Tabletop';
import { useGuestStore } from '@/stores/guest-store';
import { useLoginPromptPreferenceStore } from '@/stores/login-prompt-preference-store';
import { usePendingScoreStore } from '@/stores/pending-score-store';
import { useStatsStore } from '@/stores/stats-store';

const DIFFICULTIES: {
  value: TabletopDifficulty;
  label: string;
  description: string;
}[] = [
  { value: 'easy', label: '簡單', description: '電腦只會接牌，出牌比較隨興' },
  { value: 'normal', label: '普通', description: '電腦會拆開一組牌組重組' },
  { value: 'hard', label: '困難', description: '電腦會同時拆開兩組牌組' },
];

interface TabletopPlayGameProps {
  onBack: () => void;
}

export default function TabletopPlayGame({ onBack }: TabletopPlayGameProps) {
  const reduceMotion = useReducedMotion();
  const [difficulty, setDifficulty] = useState<TabletopDifficulty>('normal');
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isOpenHistory, setIsOpenHistory] = useState(false);
  const [pendingJokerId, setPendingJokerId] = useState<string | null>(null);

  const play = useTabletopPlay();
  const { game, draft } = play;

  const { status: sessionStatus } = useSession();
  const { guestId } = useGuestStore();
  const { setPendingScore, clearPendingScore } = usePendingScoreStore();
  const { skipLoginPrompt, setSkipLoginPrompt } =
    useLoginPromptPreferenceStore();
  const isAuthenticated = sessionStatus === 'authenticated' || !!guestId;
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const {
    tabletopBestScores,
    updateTabletopBestScore,
    incrementTabletopPlays,
  } = useStatsStore();

  // 只有正常結束的一局才計分；中途離開不會走到 ended
  const isEnded = game?.status === 'ended';
  const playerScore =
    game?.result?.standings.find(s => s.seatId === game.seats[0].id)?.score ??
    0;
  const leaderboardMode: LeaderboardMode = `tabletop_${game?.difficulty ?? difficulty}`;
  const bestScore = tabletopBestScores[game?.difficulty ?? difficulty];
  const isNewBestScore = isEnded && playerScore > 0 && playerScore >= bestScore;

  useEffect(() => {
    if (!isEnded || !game) return;
    incrementTabletopPlays();
    updateTabletopBestScore(game.difficulty, playerScore);
  }, [isEnded]); // eslint-disable-line react-hooks/exhaustive-deps

  // 剩牌扣分可能讓最終分數變成 0 以下，這種成績不上榜（API 也會拒絕負分）
  const canSubmit = isAuthenticated && isEnded && playerScore > 0;
  const leaderboardSubmit = useLeaderboardSubmit(
    leaderboardMode,
    canSubmit ? { score: playerScore } : null,
    canSubmit,
  );

  // 未登入時先暫存成績，提示登入；登入後由 PendingScoreSubmitter 補送
  useEffect(() => {
    if (
      !isEnded ||
      isAuthenticated ||
      sessionStatus === 'loading' ||
      skipLoginPrompt ||
      playerScore <= 0
    )
      return;
    setPendingScore({ mode: leaderboardMode, payload: { score: playerScore } });
    const id = setTimeout(() => setShowLoginPrompt(true), 1000);
    return () => clearTimeout(id);
  }, [isEnded, isAuthenticated, sessionStatus, skipLoginPrompt]); // eslint-disable-line react-hooks/exhaustive-deps

  const ruleModal = (
    <RuleModal
      isOpen={isOpenRuleModal}
      onOpenChange={setIsOpenRuleModal}
      mode="tabletop"
    />
  );

  // ── 開始畫面：選難度 ──
  if (!game) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto px-4 py-8">
        {ruleModal}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-400 text-white shadow-[0_5px_0_0_hsl(36,100%,40%)]">
            <Shapes className="h-8 w-8" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-black text-foreground">
              牌桌模式
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              改編自拉密 · 和 2 個電腦搶先出完手牌
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              每回合湊一組 24，可以拆開桌上的算式重新組合
            </p>
          </div>
        </div>

        <div
          className="flex w-full max-w-sm flex-col gap-2"
          role="radiogroup"
          aria-label="難度"
        >
          {DIFFICULTIES.map(d => (
            <button
              key={d.value}
              type="button"
              role="radio"
              aria-checked={difficulty === d.value}
              onClick={() => setDifficulty(d.value)}
              className={cn(
                'flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors',
                difficulty === d.value
                  ? 'border-amber-400 bg-amber-50 shadow-[0_4px_0_0_theme(colors.amber.300)] dark:border-amber-500 dark:bg-amber-900/20 dark:shadow-[0_4px_0_0_theme(colors.amber.800)]'
                  : 'border-zinc-200 bg-white/90 shadow-[0_4px_0_0_rgba(0,0,0,0.05)] hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/80',
              )}
            >
              <span className="font-display text-lg font-black text-foreground">
                {d.label}
              </span>
              <span className="text-sm text-muted-foreground">
                {d.description}
              </span>
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="font-bold text-muted-foreground hover:text-foreground"
          onClick={() => setIsOpenRuleModal(true)}
        >
          <BookOpen className="mr-1 h-4 w-4" />
          查看規則
        </Button>

        <div className="flex gap-3">
          <Button variant="tactileOutline" onClick={onBack}>
            返回
          </Button>
          <Button
            variant="tactile"
            className="gap-1.5"
            onClick={() => play.startGame(difficulty)}
          >
            <Play className="h-4 w-4" />
            開始遊戲
          </Button>
        </div>
      </div>
    );
  }

  // ── 結算畫面 ──
  if (game.status === 'ended' && game.result) {
    const playerStanding = game.result.standings.find(
      s => s.seatId === game.seats[0].id,
    );
    const isWinner = playerStanding?.rank === 1;
    return (
      <div className="flex h-full flex-col items-center justify-center overflow-y-auto px-4 py-8">
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
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm rounded-3xl border-2 border-zinc-200 bg-white/90 p-6 text-center shadow-[0_8px_0_0_hsl(36,100%,72%)] dark:border-zinc-700 dark:bg-zinc-900/80 dark:shadow-[0_8px_0_0_hsl(36,100%,25%)]"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30">
            <Trophy className="h-7 w-7 text-amber-500" />
          </div>
          <h2 className="font-display text-xl font-black text-foreground">
            {isWinner ? '你贏了！' : `第 ${playerStanding?.rank} 名`}
          </h2>
          <p className="mt-4 font-display text-5xl font-bold text-primary">
            {playerStanding?.score ?? 0}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">你的總分</p>
          {isNewBestScore ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                新紀錄！
              </p>
            </div>
          ) : (
            bestScore > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                個人最佳：{bestScore} 分
              </p>
            )
          )}
          <ResultRank
            mode={leaderboardMode}
            submit={leaderboardSubmit}
            className="mt-3"
          />

          <ol className="mt-5 flex flex-col gap-1.5 text-left">
            {game.result.standings.map(s => {
              const seat = game.seats.find(x => x.id === s.seatId)!;
              const Icon = seat.isBot ? Bot : User;
              return (
                <li
                  key={s.seatId}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border-2 px-3 py-2',
                    seat.isBot
                      ? 'border-zinc-100 dark:border-zinc-800'
                      : 'border-primary bg-teal-50 dark:bg-teal-900/20',
                  )}
                >
                  <span className="w-6 font-display text-lg font-black text-muted-foreground">
                    {s.rank}
                  </span>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-foreground">
                      {seat.name}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      牌組 {s.tableScore}
                      {s.wentOutBonus > 0 && ` ＋出完 ${s.wentOutBonus}`}
                      {s.leftoverPenalty > 0 && ` −剩牌 ${s.leftoverPenalty}`}
                    </span>
                  </span>
                  <span className="font-display text-lg font-bold tabular-nums">
                    {s.score} 分
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 flex gap-2">
            <Button
              variant="tactileOutline"
              className="flex-1"
              onClick={onBack}
            >
              返回選單
            </Button>
            <Button
              variant="tactile"
              className="flex-1"
              onClick={() => play.startGame(game.difficulty)}
            >
              再來一局
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── 遊戲中 ──
  const canEdit = play.isPlayerTurn;
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {ruleModal}
      <TabletopHistoryDialog
        open={isOpenHistory}
        onOpenChange={setIsOpenHistory}
        log={play.log}
      />
      <JokerDeclareDialog
        open={pendingJokerId !== null}
        onCancel={() => setPendingJokerId(null)}
        onConfirm={declaration => {
          if (pendingJokerId) play.onAddCard(pendingJokerId, declaration);
          setPendingJokerId(null);
        }}
      />

      <div className="mx-auto flex w-full max-w-lg flex-col gap-3 px-4 pt-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="font-bold text-muted-foreground hover:text-foreground"
            onClick={() => setShowExitConfirm(true)}
          >
            <LogOut className="mr-1 h-4 w-4" />
            離開
          </Button>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              className="font-bold text-muted-foreground hover:text-foreground"
              onClick={() => setIsOpenHistory(true)}
            >
              <History className="mr-1 h-4 w-4" />
              紀錄
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="font-bold text-muted-foreground hover:text-foreground"
              onClick={() => setIsOpenRuleModal(true)}
            >
              <BookOpen className="mr-1 h-4 w-4" />
              規則
            </Button>
          </div>
        </div>

        <TabletopScoreboard
          game={game}
          thinkingSeat={play.thinkingSeat}
          onSkipAnimation={play.onSkipAnimation}
        />

        <TabletopTableArea
          table={draft?.table ?? game.table}
          loose={draft?.loose ?? []}
          highlightSetIds={play.highlightSetIds}
          canEdit={canEdit}
          onBreakSet={play.onBreakSet}
          onPickLoose={cardId => play.onAddCard(cardId)}
        />

        <TabletopComposer
          composer={draft?.composer ?? []}
          preview={play.preview}
          disabled={!canEdit}
          onAddSymbol={play.onAddSymbol}
          onBackspace={play.onBackspace}
          onClear={play.onClearComposer}
          onCommit={play.onCommitComposer}
        />

        <TabletopHand
          hand={draft?.hand ?? game.seats[0].hand}
          disabled={!canEdit}
          onPick={card => {
            if (card.isJoker) setPendingJokerId(card.id);
            else play.onAddCard(card.id);
          }}
        />

        {/* 操作列固定在畫面底部，手機上不必捲到最下面才能結束回合 */}
        <div className="sticky bottom-0 -mx-4 flex flex-col gap-1.5 border-t-2 border-zinc-200 bg-white/90 px-4 pt-2.5 pb-3 backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/90">
          <div className="flex gap-2">
            <Button
              variant="tactileOutline"
              className="h-12 flex-1 gap-1 px-2"
              disabled={!canEdit || !play.hasDraftChanges}
              onClick={play.onResetDraft}
            >
              <RotateCcw className="h-4 w-4" />
              還原桌面
            </Button>
            <Button
              variant="tactileOutline"
              className="h-12 flex-1 gap-1 px-2"
              disabled={!canEdit || play.hasDraftChanges}
              onClick={play.onDraw}
            >
              <Hand className="h-4 w-4" />
              抽牌
            </Button>
            <Button
              variant="tactile"
              className="h-12 flex-[1.3] px-2 text-base"
              disabled={!canEdit || !play.canEndTurn}
              onClick={play.onEndTurn}
            >
              結束回合
            </Button>
          </div>
          <p className="min-h-4 text-center text-xs text-muted-foreground">
            {!canEdit
              ? '電腦出牌中'
              : play.hasDraftChanges
                ? (play.endTurnBlocker ?? '可以結束回合了')
                : '完成一組牌組，或抽 1 張牌'}
          </p>
        </div>
      </div>

      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要離開？</AlertDialogTitle>
            <AlertDialogDescription>
              離開後本局不計分，進度也不會保存。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowExitConfirm(false)}>
              繼續遊戲
            </AlertDialogCancel>
            <AlertDialogAction onClick={onBack}>離開</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
