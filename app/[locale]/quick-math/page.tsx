'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeftRight,
  Calculator,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Plus,
  Trophy,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { BackToHomeButton } from '@/components/back-to-home-button';
import { GameDesktopBar } from '@/components/game/game-hud';
import {
  GameResultScreen,
  RecordBadge,
} from '@/components/game/game-result-screen';
import { GameStartScreen } from '@/components/game/game-start-screen';
import { LeaveGameDialog } from '@/components/game/leave-game-dialog';
import { ResultRank } from '@/components/leaderboard/result-rank';
import { LoginPromptModal } from '@/components/modals/login-prompt-modal';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { LeaderboardMode } from '@/hooks/useLeaderboard';
import { useLeaderboardSubmit } from '@/hooks/useLeaderboardSubmit';
import { WRONG_PENALTY_SECONDS, useQuickMath } from '@/hooks/useQuickMath';
import { Link } from '@/i18n/navigation';
import { leaderboardHref } from '@/lib/leaderboard';
import { TOTAL_QUESTIONS } from '@/lib/quick-math-generator';
import { cn, formatTimePrecise } from '@/lib/utils';
import { useGuestStore } from '@/stores/guest-store';
import { useLoginPromptPreferenceStore } from '@/stores/login-prompt-preference-store';
import { usePendingScoreStore } from '@/stores/pending-score-store';
import { useStatsStore } from '@/stores/stats-store';

const KEYPAD_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

// 文案在 messages 的 QuickMath.levels
const QUICK_MATH_MODE_CONFIG = [
  { value: 'basic' as const, glyph: '+−' },
  { value: 'advanced' as const, glyph: 'x²' },
] as const;

// 數字鍵：平面加淺厚度，按下時下沉，觸控區 62px 高
const KEY_CLASS =
  'flex h-[62px] items-center justify-center rounded-[14px] border border-line-strong bg-surface font-display text-[30px] font-bold text-ink shadow-[0_3px_0_0_var(--line-strong)] transition-[translate,box-shadow] duration-[90ms] hover:bg-sunken active:translate-y-0.5 active:shadow-[0_1px_0_0_var(--line-strong)] disabled:opacity-45';

export default function QuickMathPage() {
  const t = useTranslations('QuickMath');
  const tHome = useTranslations('Home');
  const tHud = useTranslations('GameUI.hud');
  const {
    gameState,
    mode,
    selectMode,
    changeMode,
    countdownValue,
    currentIndex,
    currentQuestion,
    inputValue,
    displaySeconds,
    finalSeconds,
    penaltySeconds,
    wrongFlash,
    justFinished,
    startGame,
    pressDigit,
    clearInput,
    backspace,
    submitAnswer,
    restart,
  } = useQuickMath();

  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  // 剛送出的答案；答錯時 hook 會清空輸入，畫面用這個顯示被劃掉的答案
  const [lastSubmitted, setLastSubmitted] = useState('');

  const handleSubmit = useCallback(() => {
    setLastSubmitted(inputValue);
    submitAnswer();
  }, [inputValue, submitAnswer]);

  const { status: sessionStatus } = useSession();
  const { guestId } = useGuestStore();
  const { clearPendingScore } = usePendingScoreStore();
  const { skipLoginPrompt, setSkipLoginPrompt } =
    useLoginPromptPreferenceStore();
  const isAuthenticated = sessionStatus === 'authenticated' || !!guestId;

  // 進階模式資料獨立於初階：各自的排行榜 mode 與本地統計欄位
  // 詳見 CONTEXT.md 的 Mode 定義、docs/adr/0002
  const leaderboardMode: LeaderboardMode =
    mode === 'advanced' ? 'quickmath_advanced' : 'quickmath';

  const quickMathBestSeconds = useStatsStore(s => s.quickMathBestSeconds);
  const incrementQuickMathPlays = useStatsStore(s => s.incrementQuickMathPlays);
  const updateQuickMathBest = useStatsStore(s => s.updateQuickMathBest);
  const quickMathAdvancedBestSeconds = useStatsStore(
    s => s.quickMathAdvancedBestSeconds,
  );
  const incrementQuickMathAdvancedPlays = useStatsStore(
    s => s.incrementQuickMathAdvancedPlays,
  );
  const updateQuickMathAdvancedBest = useStatsStore(
    s => s.updateQuickMathAdvancedBest,
  );

  const bestSeconds =
    mode === 'advanced' ? quickMathAdvancedBestSeconds : quickMathBestSeconds;

  const reduceMotion = useReducedMotion();

  // 完賽：更新本地統計（依模式各自累計）
  useEffect(() => {
    if (!justFinished || finalSeconds === null) return;
    if (mode === 'advanced') {
      incrementQuickMathAdvancedPlays();
      updateQuickMathAdvancedBest(finalSeconds);
    } else {
      incrementQuickMathPlays();
      updateQuickMathBest(finalSeconds);
    }
  }, [justFinished]); // eslint-disable-line react-hooks/exhaustive-deps

  // 完賽：已登入直接提交排行榜
  const leaderboardSubmit = useLeaderboardSubmit(
    leaderboardMode,
    justFinished && finalSeconds !== null ? { seconds: finalSeconds } : null,
  );

  // 完賽：未登入暫存成績並提示登入
  useEffect(() => {
    if (
      !justFinished ||
      isAuthenticated ||
      sessionStatus === 'loading' ||
      skipLoginPrompt
    )
      return;
    if (finalSeconds === null) return;
    const id = setTimeout(() => setShowLoginPrompt(true), 1000);
    return () => clearTimeout(id);
  }, [justFinished, isAuthenticated, sessionStatus, skipLoginPrompt]); // eslint-disable-line react-hooks/exhaustive-deps

  // 實體鍵盤：0-9 / Backspace / Enter
  useEffect(() => {
    if (gameState !== 'playing') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        pressDigit(Number(e.key));
      } else if (e.key === 'Backspace') {
        backspace();
      } else if (e.key === 'Enter') {
        // 阻止焦點停在鍵盤按鈕上時 Enter 觸發該按鈕的 click（造成重複輸入）
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        clearInput();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState, pressDigit, backspace, handleSubmit, clearInput]);

  // ── 模式選擇畫面 ──
  if (gameState === 'mode-select') {
    return (
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-md flex-col px-4 pt-2 pb-8">
          <header className="-mx-2 flex items-center">
            <BackToHomeButton />
            <span className="flex-1" />
            <Link
              href={leaderboardHref('quickmath')}
              aria-label={tHome('leaderboard')}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-ink transition-colors hover:bg-sunken"
            >
              <Trophy className="h-5 w-5" />
            </Link>
          </header>
          <div className="flex flex-col gap-1.5 pt-2">
            <h1 className="text-[28px] font-black text-ink">{t('title')}</h1>
            <p className="text-[15px] text-ink-2">
              {t('subtitle', { count: TOTAL_QUESTIONS })}
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-5">
            <span className="text-sm font-bold text-ink-2">
              {t('chooseLevel')}
            </span>
            {QUICK_MATH_MODE_CONFIG.map(cfg => {
              const best =
                cfg.value === 'advanced'
                  ? quickMathAdvancedBestSeconds
                  : quickMathBestSeconds;
              return (
                <button
                  key={cfg.value}
                  type="button"
                  onClick={() => selectMode(cfg.value)}
                  className="group flex w-full flex-col gap-2.5 rounded-[20px] border border-line bg-surface p-[18px] text-left transition-[border-color,translate] duration-[90ms] hover:border-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus active:translate-y-0.5"
                >
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-primary-tint font-display text-2xl font-extrabold text-primary-ink"
                    >
                      {cfg.glyph}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <strong className="text-[19px] text-ink">
                        {t(`levels.${cfg.value}.label`)}
                      </strong>
                      <span className="text-sm text-ink-2">
                        {t(`levels.${cfg.value}.tagline`)}
                      </span>
                    </span>
                    <ChevronRight
                      aria-hidden
                      className="h-5 w-5 shrink-0 text-ink-2 group-hover:text-primary-ink"
                    />
                  </span>
                  {best > 0 ? (
                    <span className="flex items-center justify-between border-t border-line pt-2.5">
                      <span className="text-[13px] font-semibold text-ink-2">
                        {t('personalBest')}
                      </span>
                      <span className="font-display text-[22px] font-extrabold text-ink tabular-nums">
                        {formatTimePrecise(best)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-[13px] text-ink-2">
                      {t('noRecord')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const modeLabel = t(
    `levels.${mode === 'advanced' ? 'advanced' : 'basic'}.short`,
  );

  // ── 開始畫面 ──
  if (gameState === 'idle') {
    return (
      <GameStartScreen
        icon={Calculator}
        title={t('title')}
        tagline={t('startTagline', {
          count: TOTAL_QUESTIONS,
          level: modeLabel,
        })}
        description={
          <>
            {t.rich('startDescription', {
              penalty: WRONG_PENALTY_SECONDS,
              br: () => <br />,
            })}
            {mode === 'advanced' && (
              <>
                <br />
                {t('advancedNote')}
              </>
            )}
            <br />
            {t('rankedByTime')}
          </>
        }
        stats={
          bestSeconds > 0
            ? [
                {
                  label: t('personalBest'),
                  value: formatTimePrecise(bestSeconds),
                },
              ]
            : undefined
        }
        onBack={changeMode}
        onStart={startGame}
        startLabel={t('start')}
      >
        <div className="mt-1 flex gap-1">
          <Button
            variant="ghost"
            className="h-11 gap-1.5 px-3 font-bold text-primary-ink hover:bg-primary-tint hover:text-primary-ink"
            asChild
          >
            <Link href={leaderboardHref(leaderboardMode)}>
              <Trophy className="h-4 w-4" />
              {tHome('leaderboard')}
            </Link>
          </Button>
          <Button
            variant="ghost"
            className="h-11 gap-1.5 px-3 font-bold text-primary-ink hover:bg-primary-tint hover:text-primary-ink"
            onClick={changeMode}
          >
            <ArrowLeftRight className="h-4 w-4" />
            {t('changeLevel')}
          </Button>
        </div>
      </GameStartScreen>
    );
  }

  // ── 3-2-1 倒數 ──
  if (gameState === 'countdown') {
    return (
      <div className="h-full">
        <AnimatePresence>
          {countdownValue !== null && (
            <motion.div
              key="fullscreen-countdown"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-ink/85 backdrop-blur-md"
            >
              <motion.span
                key={countdownValue}
                initial={reduceMotion ? false : { scale: 1.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={reduceMotion ? undefined : { scale: 0.7, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                className="font-display text-[120px] leading-none font-extrabold text-white"
              >
                {countdownValue}
              </motion.span>
              <motion.p
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="mt-4 font-display text-2xl font-extrabold tracking-widest text-white/70"
              >
                Ready ?
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── 結算畫面 ──
  if (gameState === 'completed') {
    const isBest =
      bestSeconds > 0 && finalSeconds !== null && finalSeconds <= bestSeconds;
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
          eyebrow={t('completed', { level: modeLabel })}
          label={t('finishTime', { count: TOTAL_QUESTIONS })}
          value={finalSeconds !== null ? formatTimePrecise(finalSeconds) : '—'}
          badge={
            <span className="flex flex-col items-center gap-2">
              {penaltySeconds > 0 ? (
                <span className="text-sm text-ink-2">
                  {t.rich('penaltyIncluded', {
                    seconds: penaltySeconds,
                    b: chunks => (
                      <b className="font-display font-extrabold text-danger-ink">
                        {chunks}
                      </b>
                    ),
                  })}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm font-bold text-primary-ink">
                  <CircleCheck aria-hidden className="h-4 w-4" />
                  {t('flawless')}
                </span>
              )}
              {isBest && <RecordBadge>{t('personalRecord')}</RecordBadge>}
            </span>
          }
          backLabel={t('changeLevel')}
          onBack={changeMode}
          retryLabel={t('playAgain')}
          onRetry={() => {
            restart();
            startGame();
          }}
        >
          <ResultRank mode={leaderboardMode} submit={leaderboardSubmit} />
        </GameResultScreen>
      </>
    );
  }

  // ── 遊戲中 ──
  const showWrong = wrongFlash && inputValue === '' && lastSubmitted !== '';

  const penaltyPill = penaltySeconds > 0 && (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[13px] font-bold lg:h-[34px] lg:px-3 lg:text-sm',
        wrongFlash ? 'bg-danger text-white' : 'bg-danger-tint text-danger-ink',
      )}
    >
      {t('penalty')}
      <span className="font-display text-[15px] lg:text-[17px]">
        {t('penaltyValue', { seconds: penaltySeconds })}
      </span>
    </span>
  );

  return (
    <div className="flex h-full flex-col">
      <GameDesktopBar
        className="hidden lg:flex"
        title={t('desktopTitle', { level: modeLabel })}
        onExit={() => setShowLeaveConfirm(true)}
        center={
          <span className="flex items-center gap-2.5">
            <span
              role="timer"
              className="font-display text-[34px] font-extrabold text-ink tabular-nums"
            >
              {formatTimePrecise(displaySeconds)}
            </span>
            {penaltyPill}
          </span>
        }
      />
      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col lg:max-w-none lg:flex-row lg:items-center lg:justify-center lg:gap-14 lg:p-6">
        <LeaveGameDialog
          open={showLeaveConfirm}
          onOpenChange={setShowLeaveConfirm}
          onLeave={() => {
            restart();
            changeMode();
          }}
        />
        <div className="flex flex-col lg:w-[600px] lg:gap-5">
          <header className="flex items-center gap-1 px-2 pt-2.5 lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0 text-ink"
              onClick={() => setShowLeaveConfirm(true)}
              aria-label={tHud('exit')}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span
              role="timer"
              className="flex-1 font-display text-[30px] font-extrabold text-ink tabular-nums"
            >
              {formatTimePrecise(displaySeconds)}
            </span>
            <span className="mr-2">{penaltyPill}</span>
          </header>

          <div className="flex flex-col gap-1.5 px-4 pt-2 lg:gap-2 lg:px-0 lg:pt-0">
            <span className="text-[13px] font-bold text-ink-2 lg:text-sm">
              {t('progress', {
                current: currentIndex + 1,
                total: TOTAL_QUESTIONS,
              })}
            </span>
            <div aria-hidden className="flex gap-1">
              {Array.from({ length: TOTAL_QUESTIONS }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 flex-1 rounded-[3px]',
                    i < currentIndex
                      ? 'bg-primary'
                      : i === currentIndex
                        ? 'bg-primary/45'
                        : 'bg-line',
                  )}
                />
              ))}
            </div>
          </div>

          {/* 題目卡；答錯時短暫晃動，reduced-motion 不晃 */}
          <motion.div
            animate={
              wrongFlash && !reduceMotion
                ? { x: [0, -6, 6, -4, 4, 0] }
                : { x: 0 }
            }
            transition={{ duration: 0.4 }}
            className="relative mx-4 mt-[22px] rounded-[22px] border border-line bg-surface px-4 py-7 text-center lg:mx-0 lg:mt-0 lg:rounded-[26px] lg:py-12"
          >
            <p className="font-display text-[clamp(36px,12vw,52px)] leading-none font-extrabold text-ink lg:text-[84px]">
              {currentQuestion?.display} = ?
            </p>
            <AnimatePresence>
              {wrongFlash && (
                <motion.span
                  key="penalty-flash"
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute -top-3.5 right-3.5 inline-flex h-[30px] items-center gap-1 rounded-full bg-danger px-2.5 text-white"
                >
                  <Plus aria-hidden className="h-4 w-4" />
                  <span className="font-display text-base font-extrabold">
                    {t('penaltyFlash', { seconds: WRONG_PENALTY_SECONDS })}
                  </span>
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

          {/* 答案框 */}
          {showWrong ? (
            <div
              role="alert"
              className="mx-4 mt-3.5 flex h-[72px] items-center justify-center gap-2.5 rounded-[18px] border-2 border-danger bg-danger-tint text-danger-ink lg:mx-0 lg:mt-0 lg:h-[92px] lg:rounded-[22px] lg:border-[3px]"
            >
              <CircleX aria-hidden className="h-6 w-6" />
              <span className="font-display text-[40px] font-extrabold line-through decoration-[3px]">
                {lastSubmitted}
              </span>
              <span className="text-sm font-bold">{t('tryAgain')}</span>
            </div>
          ) : (
            <div
              aria-label={t('yourAnswer')}
              className="relative mx-4 mt-3.5 flex h-[72px] items-center justify-center gap-0.5 rounded-[18px] border-2 border-primary bg-surface lg:mx-0 lg:mt-0 lg:h-[92px] lg:rounded-[22px] lg:border-[3px]"
            >
              {inputValue ? (
                <span className="font-display text-[44px] font-extrabold text-ink tabular-nums">
                  {inputValue}
                </span>
              ) : (
                <span className="text-[15px] text-ink-2">
                  {t('enterAnswer')}
                </span>
              )}
              <span
                aria-hidden
                className="h-10 w-[3px] animate-pulse rounded-sm bg-primary motion-reduce:animate-none lg:h-[52px] lg:w-1"
              />
              <span className="absolute right-5 hidden items-center gap-1.5 text-[13px] text-ink-2 lg:flex">
                {t.rich('submitHint', { kbd: chunks => <Kbd>{chunks}</Kbd> })}
              </span>
            </div>
          )}
          <p className="hidden items-center justify-center gap-1.5 text-[13px] text-ink-2 lg:flex">
            {t.rich('keyboardHint', { kbd: chunks => <Kbd>{chunks}</Kbd> })}
          </p>
        </div>

        {/* 數字鍵盤：固定在底部，像原生計算機 */}
        <div className="mt-auto border-t border-line bg-sunken px-4 pt-3.5 pb-6 lg:mt-0 lg:w-[300px] lg:rounded-[22px] lg:border lg:p-[18px]">
          <div
            aria-label={t('keypad')}
            className="grid grid-cols-3 gap-2 lg:gap-2.5"
          >
            {KEYPAD_DIGITS.map(digit => (
              <button
                key={digit}
                type="button"
                onClick={() => pressDigit(digit)}
                className={KEY_CLASS}
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={clearInput}
              disabled={inputValue === ''}
              aria-label={t('clearInput')}
              className={cn(
                KEY_CLASS,
                'font-noto text-base font-bold text-ink-2',
              )}
            >
              {t('clear')}
            </button>
            <button
              type="button"
              onClick={() => pressDigit(0)}
              className={KEY_CLASS}
            >
              0
            </button>
            <button
              type="button"
              disabled={inputValue === ''}
              onClick={handleSubmit}
              aria-label={t('submitAnswer')}
              className={cn(
                KEY_CLASS,
                'border-primary-edge bg-primary font-noto text-xl font-extrabold text-primary-foreground shadow-[0_3px_0_0_var(--primary-edge)] hover:bg-primary',
              )}
            >
              {t('submit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
