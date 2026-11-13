import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type OnboardingExitReason,
  type QuickPlaySource,
  trackFirstPuzzleSolved,
  trackOnboardingComplete,
  trackOnboardingExit,
  trackQuickPlayStart,
} from '@/lib/analytics';
import { type AnswerError, checkAnswer } from '@/lib/answer-check';
import {
  QUICK_PLAY_ROUNDS,
  pickQuickPlayPuzzles,
  simplestSolution,
} from '@/lib/onboarding-puzzles';
import {
  dismissOnboardingTips,
  loadOnboarding,
  markFirstPuzzleSolved,
  markOnboardingCompleted,
} from '@/lib/onboarding-storage';
import { playSound } from '@/lib/sound-manager';
import { NumberCard } from '@/models/Player';
import { SelectedCard } from '@/models/SelectedCard';

/** loading：還在掛載（題目是隨機的，只在 client 產生，避免 hydration 不一致） */
export type QuickPlayPhase = 'loading' | 'playing' | 'completed';

export type QuickPlayFeedback = { error: AnswerError; value?: number };

/** 0 = 沒用提示；1 = 看過用到的運算符號；2 = 看過完整解法 */
export type HintLevel = 0 | 1 | 2;

const now = () =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

/**
 * 快速試玩／新手引導：三題、不用登入、不寫入統計、成就與排行榜。
 * 第一次玩時題目由簡單到一般，並顯示可關閉的操作提示；完成過後改為三題一般難度。
 */
export function useQuickPlay(
  /** 有傳入時，掛載後自動開第一輪；回傳 GA4 的入口代碼 */
  initialSource?: () => QuickPlaySource,
) {
  const [phase, setPhase] = useState<QuickPlayPhase>('loading');
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [puzzles, setPuzzles] = useState<NumberCard[][]>([]);
  const [step, setStep] = useState(0);
  const [selectedCards, setSelectedCards] = useState<SelectedCard[]>([]);
  const [feedback, setFeedback] = useState<QuickPlayFeedback | null>(null);
  const [hintLevel, setHintLevel] = useState<HintLevel>(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showTips, setShowTips] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [bestMs, setBestMs] = useState<number | undefined>(undefined);

  // 事件與計時用 ref，避免 pagehide／unmount 的閉包拿到舊值
  const roundRef = useRef(0);
  const startedAtRef = useRef(0);
  const phaseRef = useRef<QuickPlayPhase>('loading');
  const stepRef = useRef(0);
  const isFirstTimeRef = useRef(true);
  const exitSentRef = useRef(false);
  const hintLevelRef = useRef<HintLevel>(0);

  const setPhaseSynced = (next: QuickPlayPhase) => {
    phaseRef.current = next;
    setPhase(next);
  };
  const setStepSynced = (next: number) => {
    stepRef.current = next;
    setStep(next);
  };
  const setHintLevelSynced = (next: HintLevel) => {
    hintLevelRef.current = next;
    setHintLevel(next);
  };

  const start = useCallback((source: QuickPlaySource) => {
    const record = loadOnboarding();
    const firstTime = !record.completedAt;
    const round = roundRef.current + 1;
    roundRef.current = round;

    isFirstTimeRef.current = firstTime;
    setIsFirstTime(firstTime);
    setShowTips(firstTime && !record.tipsDismissed);
    setBestMs(record.bestMs);
    setPuzzles(
      pickQuickPlayPuzzles(firstTime).map((nums, p) =>
        nums.map((value, i) => ({ id: `r${round}-p${p}-${i}`, value })),
      ),
    );
    setStepSynced(0);
    setSelectedCards([]);
    setFeedback(null);
    setHintLevelSynced(0);
    setHintsUsed(0);
    setDurationMs(0);
    exitSentRef.current = false;
    startedAtRef.current = now();
    setPhaseSynced('playing');
    trackQuickPlayStart({ source, isFirstTime: firstTime });
  }, []);

  /** 完成前離開：每一輪最多送一次 onboarding_exit */
  const reportExit = useCallback((reason: OnboardingExitReason) => {
    if (phaseRef.current !== 'playing' || exitSentRef.current) return;
    exitSentRef.current = true;
    trackOnboardingExit({
      step: stepRef.current + 1,
      elapsedMs: now() - startedAtRef.current,
      reason,
      isFirstTime: isFirstTimeRef.current,
    });
  }, []);

  // 掛載時開第一輪。用 ref 防止 Strict Mode 的 setup → cleanup → setup 重複開局，
  // 讓 quick_play_start 每次進頁只送一次
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!initialSource || autoStartedRef.current) return;
    autoStartedRef.current = true;
    start(initialSource());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 真正的離開只認明確的瀏覽器事件：關閉分頁／切走 App（pagehide）與上一頁（popstate）。
  // effect cleanup 只解除監聽、不送事件，因為 Strict Mode 的模擬卸載也會跑 cleanup；
  // 站內的離開按鈕由頁面呼叫 reportExit('back_button')
  useEffect(() => {
    const onPageHide = () => reportExit('page_hide');
    const onPopState = () => reportExit('navigate');
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('popstate', onPopState);
    };
  }, [reportExit]);

  const updateSelection = (
    updater: (prev: SelectedCard[]) => SelectedCard[],
  ) => {
    setSelectedCards(updater);
    setFeedback(null);
  };

  const selectCard = useCallback((card: SelectedCard) => {
    if (phaseRef.current !== 'playing') return;
    playSound('select');
    updateSelection(prev => {
      if (card.number) {
        const idx = prev.findIndex(c => c.number?.id === card.number!.id);
        if (idx >= 0) return prev.filter((_, i) => i !== idx);
      }
      return [...prev, card];
    });
  }, []);

  const removeCard = useCallback((index: number) => {
    updateSelection(prev => prev.filter((_, i) => i !== index));
  }, []);

  const backStep = useCallback(() => {
    updateSelection(prev => prev.slice(0, -1));
  }, []);

  const clearSelection = useCallback(() => {
    updateSelection(() => []);
  }, []);

  const dismissTips = useCallback(() => {
    setShowTips(false);
    dismissOnboardingTips();
  }, []);

  const currentNumbers = useMemo(() => puzzles[step] ?? [], [puzzles, step]);

  // 提示要用的解法：只在玩家按下提示時才計算
  const solution = useMemo(
    () =>
      hintLevel > 0 ? simplestSolution(currentNumbers.map(c => c.value)) : null,
    [hintLevel, currentNumbers],
  );

  const requestHint = useCallback(() => {
    if (phaseRef.current !== 'playing' || hintLevelRef.current >= 2) return;
    setHintLevelSynced((hintLevelRef.current + 1) as HintLevel);
    setHintsUsed(n => n + 1);
  }, []);

  /** 回傳這題是否答對，讓頁面決定要不要提示「第 N 題答對」 */
  const submit = useCallback((): boolean => {
    if (phaseRef.current !== 'playing') return false;
    const result = checkAnswer(
      currentNumbers.map(c => c.id),
      selectedCards,
    );
    if (!result.ok) {
      if (result.error !== 'EMPTY') playSound('wrong');
      setFeedback({ error: result.error, value: result.value });
      return false;
    }

    playSound('correct');
    const elapsed = now() - startedAtRef.current;
    if (markFirstPuzzleSolved()) {
      trackFirstPuzzleSolved({
        step: stepRef.current + 1,
        elapsedMs: elapsed,
        hintLevel: hintLevelRef.current,
      });
    }
    // 第一題答對代表已經會操作，操作提示不再出現
    if (showTips) dismissTips();

    const next = stepRef.current + 1;
    setSelectedCards([]);
    setFeedback(null);
    setHintLevelSynced(0);

    if (next < QUICK_PLAY_ROUNDS) {
      setStepSynced(next);
      return true;
    }

    setDurationMs(elapsed);
    markOnboardingCompleted(elapsed);
    setPhaseSynced('completed');
    trackOnboardingComplete({
      durationMs: elapsed,
      hintsUsed,
      isFirstTime: isFirstTimeRef.current,
    });
    return true;
  }, [currentNumbers, selectedCards, showTips, dismissTips, hintsUsed]);

  return {
    phase,
    isFirstTime,
    step,
    totalSteps: QUICK_PLAY_ROUNDS,
    currentNumbers,
    selectedCards,
    feedback,
    hintLevel,
    hintsUsed,
    solution,
    showTips,
    durationMs,
    bestMs,
    start,
    reportExit,
    selectCard,
    removeCard,
    backStep,
    clearSelection,
    dismissTips,
    requestHint,
    submit,
  };
}
