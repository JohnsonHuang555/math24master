import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  BookOpen,
  Check,
  ChevronLeft,
  Delete,
  Flag,
  Hourglass,
  RotateCcw,
  Timer,
  TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { ExpressionBar } from '@/components/game/expression-bar';
import { LeaveGameDialog } from '@/components/game/leave-game-dialog';
import { NumberCard } from '@/components/game/number-card';
import { ScoreBreakdown } from '@/components/game/score-breakdown';
import MainLayout from '@/components/layouts/main-layout';
import { RuleModal } from '@/components/modals/rule-modal';
import Symbols from '@/components/symbols';
import { Button } from '@/components/ui/button';
import { useHardNavigate } from '@/i18n/navigation';
import { calculateAnswer, cn } from '@/lib/utils';
import { MAX_CARD_COUNT } from '@/models/Room';
import { useMultiplePlay } from '@/providers/multiple-play-provider';

// 操作列的次要按鈕：與單人模式相同的平面樣式
const ACTION_BUTTON_CLASS =
  'h-14 w-[52px] shrink-0 rounded-xl border border-line-strong bg-surface text-ink shadow-none hover:bg-sunken hover:text-ink';

const MultiplePlayingArea = () => <ClassicPlayingArea />;

/**
 * 多人傳統對戰：頂部是對手，中間是自己的回合狀態與出牌回饋，
 * 手牌、算式、符號與操作集中在底部，與單人經典模式同一套操作方式
 */
const ClassicPlayingArea = () => {
  const hardNavigate = useHardNavigate();
  const {
    roomInfo,
    checkAnswerCorrect,
    isSymbolScoreAnimationFinished,
    onFinishedSymbolScoreAnimation,
    onUpdateScore,
    selectedCardSymbols,
    onSelectCardOrSymbol,
    onDiscardCard,
    onPlayCard,
    onReselect,
    onDrawCard,
    currentPlayer,
    isYourTurn,
    onBack,
    isLastRound,
    countdown,
  } = useMultiplePlay();

  const otherPlayers =
    roomInfo?.players.filter(p => p.id !== currentPlayer?.id) ?? [];
  const turnPlayer = roomInfo?.players.find(
    p => p.playerOrder === roomInfo?.currentOrder,
  );

  // 需要棄牌
  const [needDiscard, setNeedDiscard] = useState(false);
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  // 出牌後已揭曉分數的運算符號數，每 250ms 加一
  const [revealedSymbols, setRevealedSymbols] = useState(0);

  const handCard = currentPlayer?.handCard || [];
  const selectedCards = roomInfo?.selectedCards ?? [];
  const isScoring = checkAnswerCorrect === true;

  const disabledActions =
    needDiscard || !!roomInfo?.isGameOver || isScoring || !isYourTurn;

  useEffect(() => {
    // 如果手牌超過上限須棄牌
    if (handCard.length > MAX_CARD_COUNT) {
      setTimeout(() => {
        toast.error('請點選 1 張牌丟棄');
        setNeedDiscard(true);
      }, 500);
    }
  }, [handCard.length]);

  useEffect(() => {
    if (isYourTurn) {
      toast.info('你的回合');
    }
  }, [isYourTurn]);

  // 出牌正確：每個運算符號依序揭曉分數，全部揭曉 1.5 秒後更新分數並換下一手
  useEffect(() => {
    if (!isScoring || selectedCardSymbols.length === 0) return;
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
  }, [isScoring]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isSymbolScoreAnimationFinished) return;
    const id = setTimeout(() => onUpdateScore(), 1500);
    return () => clearTimeout(id);
  }, [isSymbolScoreAnimationFinished]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedOrder = new Map(
    selectedCards
      .filter(c => c.number)
      .map((c, i) => [c.number!.id, i + 1] as const),
  );

  const liveResult = useMemo(() => {
    if (selectedCards.length === 0) return null;
    try {
      const result = calculateAnswer(selectedCards);
      if (typeof result !== 'number' || !isFinite(result)) return null;
      return Math.round(result * 1e9) / 1e9;
    } catch {
      return null;
    }
  }, [selectedCards]);

  const usedAllCards =
    handCard.length > 0 && selectedOrder.size === handCard.length;
  const isReady =
    selectedOrder.size > 0 &&
    liveResult !== null &&
    Math.abs(liveResult - 24) < 1e-9;
  const maxSeconds = roomInfo?.settings.remainSeconds ?? null;

  return (
    <MainLayout>
      <RuleModal isOpen={isOpenRuleModal} onOpenChange={setIsOpenRuleModal} />
      <LeaveGameDialog
        open={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        onLeave={() => hardNavigate('/multiple-play')}
        description="離開後將退出目前遊戲。"
      />

      <div className="mx-auto flex h-full w-full max-w-md flex-col px-3 pt-2 pb-6 sm:px-4">
        {/* 頂部列 */}
        <header className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 text-ink"
            onClick={() => setShowLeaveConfirm(true)}
            aria-label="離開房間"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="flex-1 text-[13px] font-bold text-ink-2">
            傳統對戰 · 牌庫剩{' '}
            <span className="font-display text-[15px] text-ink">
              {roomInfo?.deck.length ?? 0}
            </span>{' '}
            張
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 text-ink"
            onClick={() => setIsOpenRuleModal(true)}
            aria-label="遊戲規則"
          >
            <BookOpen className="h-5 w-5" />
          </Button>
        </header>

        {/* 對手 */}
        <section
          aria-label="對手"
          className={cn(
            'mt-1.5 grid gap-1.5',
            otherPlayers.length >= 3
              ? 'grid-cols-3'
              : otherPlayers.length === 2
                ? 'grid-cols-2'
                : 'grid-cols-1',
          )}
        >
          {otherPlayers.map(player => {
            const isTurn = player.playerOrder === roomInfo?.currentOrder;
            return (
              <div
                key={player.id}
                className={cn(
                  'flex min-w-0 flex-col gap-0.5 rounded-xl px-2.5 py-1.5',
                  isTurn
                    ? 'border-2 border-amber bg-amber-tint'
                    : 'border border-line bg-surface',
                )}
              >
                {(isTurn || player.isLastRoundPlayer) && (
                  <span className="flex flex-wrap gap-1">
                    {isTurn && (
                      <span className="inline-flex h-5 items-center gap-0.5 rounded-full bg-amber px-1.5 text-[11px] font-bold text-on-amber">
                        <Hourglass aria-hidden className="h-3 w-3" />
                        換他
                      </span>
                    )}
                    {player.isLastRoundPlayer && (
                      <span className="inline-flex h-5 items-center gap-0.5 rounded-full border border-line-strong bg-sunken px-1.5 text-[11px] font-bold text-ink">
                        <Flag aria-hidden className="h-3 w-3" />
                        最後
                      </span>
                    )}
                  </span>
                )}
                <span className="truncate text-[13px] font-bold text-ink">
                  {player.name}
                </span>
                <span className="flex items-center justify-between gap-1 text-xs text-ink-2">
                  <span>
                    <b className="font-display text-[15px] font-extrabold text-ink">
                      {player.score}
                    </b>{' '}
                    分 · {player.handCard.length} 張
                  </span>
                  {isTurn && countdown !== undefined && (
                    <span className="font-display text-[13px] font-extrabold text-amber-ink tabular-nums">
                      {countdown}s
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </section>

        {/* 自己的狀態 */}
        <div
          className={cn(
            'mt-2.5 flex items-center gap-3 rounded-2xl px-3.5 py-3',
            isYourTurn
              ? 'border-2 border-primary bg-primary-tint'
              : 'border border-line bg-surface',
          )}
        >
          {isYourTurn ? (
            <Timer aria-hidden className="h-6 w-6 shrink-0 text-primary-ink" />
          ) : (
            <Hourglass aria-hidden className="h-6 w-6 shrink-0 text-ink-2" />
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <strong
              className={cn(
                'truncate text-base',
                isYourTurn ? 'text-primary-ink' : 'text-ink',
              )}
            >
              {isYourTurn
                ? '你的回合'
                : `等待 ${turnPlayer?.name ?? '其他玩家'} 出牌`}
            </strong>
            <span className="flex items-center gap-1.5 text-xs text-ink-2">
              得分{' '}
              <b className="font-display text-sm font-extrabold text-ink">
                {currentPlayer?.score ?? 0}
              </b>
              {(isLastRound || currentPlayer?.isLastRoundPlayer) && (
                <span className="inline-flex h-5 items-center gap-0.5 rounded-full bg-amber px-1.5 text-[11px] font-bold text-on-amber">
                  <Flag aria-hidden className="h-3 w-3" />
                  終回
                </span>
              )}
            </span>
          </div>
          {isYourTurn && countdown !== undefined && (
            <div
              role="timer"
              className="flex w-24 flex-col items-end gap-1"
              aria-label={`回合剩餘 ${countdown} 秒`}
            >
              <span className="font-display text-2xl leading-none font-extrabold text-ink tabular-nums">
                {countdown}s
              </span>
              {maxSeconds && (
                <span className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.min(100, (countdown / maxSeconds) * 100)}%`,
                    }}
                  />
                </span>
              )}
            </div>
          )}
        </div>

        {/* 出牌回饋與棄牌提示 */}
        <div className="flex min-h-4 flex-1 items-center justify-center py-3">
          {isScoring ? (
            <ScoreBreakdown tokens={selectedCards} revealed={revealedSymbols} />
          ) : needDiscard ? (
            <p
              role="alert"
              className="flex w-full items-center gap-2.5 rounded-2xl border-2 border-danger bg-danger-tint px-4 py-3 text-[15px] font-bold text-danger-ink"
            >
              <TriangleAlert aria-hidden className="h-5 w-5 shrink-0" />
              手牌超過上限，請點選 1 張牌丟棄
            </p>
          ) : null}
        </div>

        {/* 底部操作區 */}
        <div className="flex w-full flex-col gap-3">
          <div className="-mx-3 overflow-x-auto px-3 pt-2 pb-1 sm:-mx-4 sm:px-4">
            <div className="mx-auto flex w-max gap-2">
              {handCard.map(card => {
                const order = selectedOrder.get(card.id);
                const canPick = needDiscard || !disabledActions;
                return (
                  <NumberCard
                    key={card.id}
                    value={card.value}
                    state={
                      !canPick
                        ? 'disabled'
                        : order !== undefined && !needDiscard
                          ? 'selected'
                          : 'idle'
                    }
                    order={order}
                    disabled={!canPick}
                    aria-label={
                      needDiscard ? `丟棄 ${card.value}` : String(card.value)
                    }
                    className={cn(
                      needDiscard &&
                        'border-danger hover:border-danger hover:bg-danger-tint',
                    )}
                    onClick={() => {
                      if (needDiscard) {
                        setNeedDiscard(false);
                        onDiscardCard(card.id);
                      } else {
                        onSelectCardOrSymbol({ number: card });
                      }
                    }}
                  />
                );
              })}
            </div>
          </div>

          {!isScoring && (
            <>
              <ExpressionBar
                className={cn(!isYourTurn && 'opacity-60')}
                tokens={selectedCards}
                result={liveResult}
                isFinal={usedAllCards}
                placeholder={
                  isYourTurn
                    ? '點擊手牌組合出答案為 24 的算式'
                    : '輪到你時才能組算式'
                }
              />
              <div
                className={cn(
                  'flex justify-center gap-2',
                  disabledActions && 'pointer-events-none opacity-45',
                )}
              >
                <Symbols
                  onClick={symbol => {
                    if (disabledActions) return;
                    onSelectCardOrSymbol({ symbol });
                  }}
                />
              </div>
            </>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className={ACTION_BUTTON_CLASS}
              disabled={disabledActions}
              onClick={onReselect}
              aria-label="清除"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={ACTION_BUTTON_CLASS}
              disabled={disabledActions}
              onClick={onBack}
              aria-label="倒退一步"
            >
              <Delete className="h-5 w-5" />
            </Button>
            <Button
              variant="tactileOutline"
              className="min-w-0 flex-1 gap-1.5 px-2 text-base"
              disabled={disabledActions}
              onClick={() => {
                onReselect();
                onDrawCard();
              }}
            >
              {isLastRound ? (
                <Flag aria-hidden className="h-4 w-4" />
              ) : (
                <ArrowRightLeft aria-hidden className="h-4 w-4" />
              )}
              {isLastRound ? '結算' : '跳過 / 換牌'}
            </Button>
            <Button
              variant="tactile"
              className={cn(
                'min-w-0 flex-[1.1] gap-1.5 px-2',
                isReady &&
                  !disabledActions &&
                  'shadow-[0_5px_0_0_var(--primary-edge),0_0_0_4px_var(--primary-tint)]',
              )}
              disabled={disabledActions}
              onClick={onPlayCard}
            >
              {isReady && !disabledActions && (
                <Check aria-hidden className="h-5 w-5" />
              )}
              {isScoring ? '計分中' : '出牌'}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default MultiplePlayingArea;
