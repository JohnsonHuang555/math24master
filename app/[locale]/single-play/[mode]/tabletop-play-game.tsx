'use client';

import { useEffect, useState } from 'react';
import {
  BookOpen,
  Bot,
  ChevronLeft,
  CircleCheck,
  FastForward,
  Flag,
  Hand,
  History,
  Info,
  RotateCcw,
  Shapes,
  TriangleAlert,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { GameDesktopBar } from '@/components/game/game-hud';
import {
  GameResultScreen,
  RecordBadge,
} from '@/components/game/game-result-screen';
import { GameStartScreen } from '@/components/game/game-start-screen';
import { LeaveGameDialog } from '@/components/game/leave-game-dialog';
import { RankMedal } from '@/components/leaderboard/rank-medal';
import { ResultRank } from '@/components/leaderboard/result-rank';
import { LoginPromptModal } from '@/components/modals/login-prompt-modal';
import { RuleModal } from '@/components/modals/rule-modal';
import { JokerDeclareDialog } from '@/components/tabletop/joker-declare-dialog';
import { TabletopComposer } from '@/components/tabletop/tabletop-composer';
import { TabletopHand } from '@/components/tabletop/tabletop-hand';
import { TabletopHistoryDialog } from '@/components/tabletop/tabletop-history-dialog';
import { TabletopScoreboard } from '@/components/tabletop/tabletop-scoreboard';
import { TabletopTableArea } from '@/components/tabletop/tabletop-table-area';
import { Button } from '@/components/ui/button';
import { useGameKeyboard } from '@/hooks/useGameKeyboard';
import { useLeaderboardSubmit } from '@/hooks/useLeaderboardSubmit';
import useTabletopPlay from '@/hooks/useTabletopPlay';
import type { LeaderboardMode } from '@/lib/leaderboard';
import { cn } from '@/lib/utils';
import { NumberCard } from '@/models/Player';
import { useGuestStore } from '@/stores/guest-store';
import { useLoginPromptPreferenceStore } from '@/stores/login-prompt-preference-store';
import { usePendingScoreStore } from '@/stores/pending-score-store';
import { useStatsStore } from '@/stores/stats-store';

// 牌桌模式只有一種難度，沿用原本「困難」的排行榜 collection（見 docs/adr/0010）
const LEADERBOARD_MODE: LeaderboardMode = 'tabletop_hard';

interface TabletopPlayGameProps {
  onBack: () => void;
  /** 從模式選單進入時直接開局，和其他單人模式一致 */
  autoStart?: boolean;
}

export default function TabletopPlayGame({
  onBack,
  autoStart,
}: TabletopPlayGameProps) {
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isOpenHistory, setIsOpenHistory] = useState(false);
  const [pendingJokerId, setPendingJokerId] = useState<string | null>(null);

  const play = useTabletopPlay();
  const { game, draft } = play;

  useEffect(() => {
    if (autoStart) play.startGame();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 桌機：Esc 打開離開確認（對話框開著時 useGameKeyboard 不攔截）
  useGameKeyboard(game?.status === 'playing', {
    onEscape: () => setShowExitConfirm(true),
  });

  const { status: sessionStatus } = useSession();
  const { guestId } = useGuestStore();
  const { setPendingScore, clearPendingScore } = usePendingScoreStore();
  const { skipLoginPrompt, setSkipLoginPrompt } =
    useLoginPromptPreferenceStore();
  const isAuthenticated = sessionStatus === 'authenticated' || !!guestId;
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const {
    tabletopBestScore: bestScore,
    updateTabletopBestScore,
    incrementTabletopPlays,
  } = useStatsStore();

  // 只有正常結束的一局才計分；中途離開不會走到 ended
  const isEnded = game?.status === 'ended';
  const playerScore =
    game?.result?.standings.find(s => s.seatId === game.seats[0].id)?.score ??
    0;
  const isNewBestScore = isEnded && playerScore > 0 && playerScore >= bestScore;

  useEffect(() => {
    if (!isEnded || !game) return;
    incrementTabletopPlays();
    updateTabletopBestScore(playerScore);
  }, [isEnded]); // eslint-disable-line react-hooks/exhaustive-deps

  // 剩牌扣分可能讓最終分數變成 0 以下，這種成績不上榜（API 也會拒絕負分）
  const canSubmit = isAuthenticated && isEnded && playerScore > 0;
  const leaderboardSubmit = useLeaderboardSubmit(
    LEADERBOARD_MODE,
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
    setPendingScore({
      mode: LEADERBOARD_MODE,
      payload: { score: playerScore },
    });
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

  // ── 開始畫面 ──
  if (!game) {
    return (
      <>
        {ruleModal}
        <GameStartScreen
          icon={Shapes}
          title="牌桌模式"
          tagline="改編自拉密 · 和 2 個電腦搶先出完手牌"
          description="每回合湊一組 24，可以拆開桌上的算式重新組合"
          stats={
            bestScore > 0
              ? [{ label: '個人最佳', value: `${bestScore} 分` }]
              : undefined
          }
          onBack={onBack}
          onOpenRules={() => setIsOpenRuleModal(true)}
          onStart={play.startGame}
        />
      </>
    );
  }

  // ── 結算畫面 ──
  if (game.status === 'ended' && game.result) {
    const playerStanding = game.result.standings.find(
      s => s.seatId === game.seats[0].id,
    );
    const rank = playerStanding?.rank ?? 3;
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
        <div className="h-full overflow-y-auto">
          <GameResultScreen
            className="h-auto min-h-full"
            hero={<RankMedal rank={rank} size={56} />}
            eyebrow={rank === 1 ? '你贏了！' : `第 ${rank} 名`}
            label="你的總分"
            value={playerStanding?.score ?? 0}
            badge={
              isNewBestScore ? (
                <RecordBadge>新紀錄！</RecordBadge>
              ) : bestScore > 0 ? (
                <span className="text-sm text-ink-2">
                  個人最高：
                  <b className="font-display font-extrabold text-ink">
                    {bestScore} 分
                  </b>
                </span>
              ) : null
            }
            backLabel="返回選單"
            onBack={onBack}
            retryLabel="再來一局"
            onRetry={play.startGame}
          >
            <table className="w-full overflow-hidden rounded-2xl border border-line bg-surface text-[13px]">
              <thead className="bg-sunken text-ink-2">
                <tr>
                  <th className="px-3 py-2.5 text-left font-bold">玩家</th>
                  <th className="px-1 py-2.5 text-right font-bold">牌組</th>
                  <th className="px-1 py-2.5 text-right font-bold">出完</th>
                  <th className="px-1 py-2.5 text-right font-bold">剩牌</th>
                  <th className="py-2.5 pr-3 pl-1 text-right font-bold">
                    總分
                  </th>
                </tr>
              </thead>
              <tbody className="font-display text-base tabular-nums">
                {game.result.standings.map(s => {
                  const seat = game.seats.find(x => x.id === s.seatId)!;
                  return (
                    <tr
                      key={s.seatId}
                      className={cn(
                        'border-t border-line',
                        !seat.isBot && 'font-bold',
                      )}
                    >
                      <td className="px-3 py-2.5 font-noto text-[13px]">
                        {seat.name}
                      </td>
                      <td className="px-1 py-2.5 text-right">{s.tableScore}</td>
                      <td
                        className={cn(
                          'px-1 py-2.5 text-right',
                          s.wentOutBonus > 0
                            ? 'text-primary-ink'
                            : 'text-ink-2',
                        )}
                      >
                        {s.wentOutBonus > 0 ? `+${s.wentOutBonus}` : '—'}
                      </td>
                      <td
                        className={cn(
                          'px-1 py-2.5 text-right',
                          s.leftoverPenalty > 0 && 'text-danger-ink',
                        )}
                      >
                        {s.leftoverPenalty > 0 ? `−${s.leftoverPenalty}` : 0}
                      </td>
                      <td className="py-2.5 pr-3 pl-1 text-right text-lg font-extrabold">
                        {s.score}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-center text-xs text-ink-2">
              剩牌：數字牌每張 −1、Joker 每張 −5
            </p>
            <ResultRank mode={LEADERBOARD_MODE} submit={leaderboardSubmit} />
          </GameResultScreen>
        </div>
      </>
    );
  }

  // ── 遊戲中 ──
  const canEdit = play.isPlayerTurn;
  const isBotTurn = game.status === 'playing' && game.currentSeat !== 0;
  const round = Math.floor(game.turnsTaken / game.seats.length) + 1;
  // Joker 不論來自手牌或拆開的牌組，加進組裝列前都要先宣告
  const pickCard = (card: NumberCard) => {
    if (card.isJoker) setPendingJokerId(card.id);
    else play.onAddCard(card.id);
  };
  const statusText = !canEdit
    ? '電腦出牌中'
    : play.hasDraftChanges
      ? (play.endTurnBlocker ?? '可以結束回合了')
      : '完成一組牌組，或抽 1 張牌';
  const StatusIcon = !canEdit
    ? Bot
    : play.hasDraftChanges
      ? play.endTurnBlocker
        ? TriangleAlert
        : CircleCheck
      : Info;

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
      <LeaveGameDialog
        open={showExitConfirm}
        onOpenChange={setShowExitConfirm}
        onLeave={onBack}
        description="離開後本局不計分，進度也不會保存。"
      />

      {/* 頂部列：手機 */}
      <header className="flex items-center gap-0.5 px-2 pt-1.5 lg:hidden">
        <Button
          variant="ghost"
          className="h-11 w-11 shrink-0 px-0 text-ink"
          onClick={() => setShowExitConfirm(true)}
          aria-label="離開"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="flex-1 text-[13px] font-bold text-ink-2">
          {game.finalRoundTurnsLeft !== undefined ? (
            <span className="inline-flex items-center gap-1 text-amber-ink">
              <Flag aria-hidden className="h-4 w-4" />
              最後一圈
            </span>
          ) : (
            <>
              第{' '}
              <span className="font-display text-[15px] text-ink">{round}</span>{' '}
              圈
            </>
          )}{' '}
          · 牌庫剩{' '}
          <span className="font-display text-[15px] text-ink">
            {game.deck.length}
          </span>{' '}
          張
        </span>
        <Button
          variant="ghost"
          className="h-11 w-11 shrink-0 px-0 text-ink"
          onClick={() => setIsOpenHistory(true)}
          aria-label="紀錄"
        >
          <History className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          className="h-11 w-11 shrink-0 px-0 text-ink"
          onClick={() => setIsOpenRuleModal(true)}
          aria-label="規則"
        >
          <BookOpen className="h-5 w-5" />
        </Button>
      </header>

      {/* 頂部列：桌機，和其他單人模式共用 */}
      <GameDesktopBar
        className="hidden lg:flex"
        title="牌桌模式"
        escHint
        score={game.seats[0].score}
        remaining={game.deck.length}
        isLastRound={game.finalRoundTurnsLeft !== undefined}
        center={
          game.finalRoundTurnsLeft === undefined && (
            <span className="ml-2 inline-flex h-[34px] items-center rounded-full bg-sunken px-3 text-sm font-bold whitespace-nowrap text-ink">
              第&nbsp;<span className="font-display text-base">{round}</span>
              &nbsp;圈
            </span>
          )
        }
        onExit={() => setShowExitConfirm(true)}
        onOpenRules={() => setIsOpenRuleModal(true)}
        actions={
          <Button
            variant="ghost"
            className="h-11 gap-1.5 px-3 text-sm font-semibold text-ink"
            onClick={() => setIsOpenHistory(true)}
          >
            <History className="h-5 w-5" />
            紀錄
          </Button>
        }
      />

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-2.5 px-3 pt-1.5 lg:grid lg:max-w-none lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-5 lg:px-6 lg:pt-5">
        <aside className="lg:flex lg:flex-col lg:gap-2.5">
          <h2 className="hidden text-[13px] font-extrabold text-ink-2 lg:block">
            計分板
          </h2>
          <TabletopScoreboard game={game} thinkingSeat={play.thinkingSeat} />
        </aside>

        <main className="flex min-w-0 flex-col gap-2.5 lg:gap-3">
          <TabletopTableArea
            table={draft?.table ?? game.table}
            loose={draft?.loose ?? []}
            highlightSetIds={play.highlightSetIds}
            canEdit={canEdit}
            onBreakSet={play.onBreakSet}
            onPickLoose={pickCard}
            headerAction={
              isBotTurn && (
                <Button
                  variant="ghost"
                  className="h-9 gap-1 px-2.5 text-sm font-bold text-primary-ink hover:bg-primary-tint hover:text-primary-ink"
                  onClick={play.onSkipAnimation}
                >
                  <FastForward className="h-4 w-4" />
                  略過動畫
                </Button>
              )
            }
          />

          <div className="lg:mt-auto">
            <TabletopComposer
              composer={draft?.composer ?? []}
              preview={play.preview}
              disabled={!canEdit}
              onAddSymbol={play.onAddSymbol}
              onBackspace={play.onBackspace}
              onClear={play.onClearComposer}
              onCommit={play.onCommitComposer}
            />
          </div>
        </main>

        <div className={cn('lg:col-span-2', !canEdit && 'opacity-50')}>
          <TabletopHand
            hand={draft?.hand ?? game.seats[0].hand}
            disabled={!canEdit}
            onPick={pickCard}
          />
        </div>
      </div>

      {/* 操作列固定在畫面底部，手機上不必捲到最下面才能結束回合 */}
      <div className="sticky bottom-0 mt-2 border-t border-line bg-surface">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-2 px-3 pt-2.5 pb-4 lg:max-w-none lg:flex-row lg:items-center lg:gap-3 lg:px-6 lg:py-3">
          <p
            role="status"
            className={cn(
              'flex items-center gap-1.5 text-[13px] font-semibold lg:flex-1 lg:text-sm',
              canEdit && play.hasDraftChanges && play.endTurnBlocker
                ? 'text-amber-ink'
                : canEdit && play.hasDraftChanges
                  ? 'text-primary-ink'
                  : 'text-ink-2',
            )}
          >
            <StatusIcon aria-hidden className="h-4 w-4 shrink-0" />
            {statusText}
          </p>
          <div className="flex gap-2">
            <Button
              variant="tactileOutline"
              className="h-[52px] flex-1 gap-1 px-2 text-base lg:flex-none lg:px-4"
              disabled={!canEdit || !play.hasDraftChanges}
              onClick={play.onResetDraft}
            >
              <RotateCcw className="h-4 w-4" />
              還原桌面
            </Button>
            <Button
              variant="tactileOutline"
              className="h-[52px] flex-[0.8] gap-1 px-2 text-base lg:flex-none lg:px-4"
              disabled={!canEdit || play.hasDraftChanges}
              onClick={play.onDraw}
            >
              <Hand className="h-4 w-4" />
              抽牌
            </Button>
            <Button
              variant="tactile"
              className="h-[52px] flex-[1.1] px-2 text-[17px] lg:flex-none lg:px-6"
              disabled={!canEdit || !play.canEndTurn}
              onClick={play.onEndTurn}
            >
              結束回合
              {play.turnScorePreview !== null && (
                <span className="font-display text-base font-extrabold tabular-nums">
                  +{play.turnScorePreview}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
