'use client';

import { useState } from 'react';
import { ChevronLeft, Eye, Lightbulb } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { PuzzlePlayArea } from '@/components/areas/puzzle-play-area';
import { GameDesktopBar } from '@/components/game/game-hud';
import { LeaveGameDialog } from '@/components/game/leave-game-dialog';
import { QuickPlayResult } from '@/components/quick-play/quick-play-result';
import { QuickPlayStage } from '@/components/quick-play/quick-play-stage';
import { Button } from '@/components/ui/button';
import { useQuickPlay } from '@/hooks/useQuickPlay';
import { useHardNavigate, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/** 首頁主按鈕帶 ?from=home，用來區分快速試玩的入口 */
function sourceFromUrl() {
  return new URLSearchParams(window.location.search).get('from') === 'home'
    ? 'home_hero'
    : 'direct';
}

export default function QuickPlayPage() {
  const t = useTranslations('QuickPlay');
  const tHud = useTranslations('GameUI.hud');
  const router = useRouter();
  const hardNavigate = useHardNavigate();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const game = useQuickPlay(sourceFromUrl);

  const leave = () => {
    game.reportExit('back_button');
    router.push('/');
  };

  const handleSubmit = () => {
    const solved = game.submit();
    if (solved && game.step + 1 < game.totalSteps) {
      toast.success(t('correct', { step: game.step + 1 }));
    }
  };

  if (game.phase === 'loading') return <div className="h-full" />;

  if (game.phase === 'completed') {
    return (
      <QuickPlayResult
        isFirstTime={game.isFirstTime}
        totalSteps={game.totalSteps}
        durationMs={game.durationMs}
        hintsUsed={game.hintsUsed}
        onRetry={() => game.start('replay')}
        onExplore={() => hardNavigate('/single-play')}
      />
    );
  }

  const progress = (
    <div aria-hidden className="flex gap-1.5">
      {Array.from({ length: game.totalSteps }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 flex-1 rounded-full',
            i < game.step
              ? 'bg-primary'
              : i === game.step
                ? 'bg-primary/45'
                : 'bg-line',
          )}
        />
      ))}
    </div>
  );

  const progressLabel = t('progressPlain', {
    current: game.step + 1,
    total: game.totalSteps,
  });

  return (
    <>
      <LeaveGameDialog
        open={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        onLeave={leave}
      />
      <PuzzlePlayArea
        currentNumbers={game.currentNumbers}
        selectedCards={game.selectedCards}
        onSelectCard={game.selectCard}
        onRemoveCard={game.removeCard}
        onClearSelection={game.clearSelection}
        onBackStep={game.backStep}
        onSubmit={handleSubmit}
        onSkip={() => {}}
        onEmptySubmit={handleSubmit}
        strictExpression
        onEscape={() => setShowLeaveConfirm(true)}
        stage={
          <QuickPlayStage
            feedback={game.feedback}
            hintLevel={game.hintLevel}
            solution={game.solution}
            showTips={game.showTips}
            onDismissTips={game.dismissTips}
          />
        }
        desktopBar={
          <GameDesktopBar
            title={t('title')}
            center={
              <div className="flex w-48 flex-col gap-1.5">
                <span className="text-center text-sm font-bold text-ink-2">
                  {progressLabel}
                </span>
                {progress}
              </div>
            }
            escHint
            onExit={() => setShowLeaveConfirm(true)}
          />
        }
        footerSlot={
          game.hintLevel < 2 && (
            <Button
              variant="ghost"
              className="h-11 gap-1.5 px-3 text-sm font-bold text-ink-2 hover:text-ink lg:h-[60px] lg:rounded-2xl lg:border-2 lg:border-line-strong lg:px-[18px] lg:text-base lg:text-ink"
              onClick={game.requestHint}
              data-testid="quick-play-hint-button"
            >
              {game.hintLevel === 0 ? (
                <Lightbulb aria-hidden className="h-5 w-5" />
              ) : (
                <Eye aria-hidden className="h-5 w-5" />
              )}
              {game.hintLevel === 0 ? t('hint.button') : t('hint.reveal')}
            </Button>
          )
        }
      >
        {/* 手機 HUD：離開、標題與進度 */}
        <div className="flex w-full items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 text-ink"
            onClick={() => setShowLeaveConfirm(true)}
            aria-label={tHud('exit')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-1 flex-col gap-1.5 px-1.5">
            <span className="text-[13px] font-bold text-ink-2">
              {t.rich('progress', {
                current: game.step + 1,
                total: game.totalSteps,
                n: chunks => (
                  <span className="font-display text-[15px] text-ink">
                    {chunks}
                  </span>
                ),
              })}
            </span>
            {progress}
          </div>
          <span className="w-11" />
        </div>
      </PuzzlePlayArea>
    </>
  );
}
