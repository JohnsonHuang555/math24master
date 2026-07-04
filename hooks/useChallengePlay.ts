import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTimer } from '@/hooks/useTimer';
import { unlockAchievement } from '@/lib/achievement-manager';
import { generateOnePuzzle } from '@/lib/puzzle-generator';
import { calcRoundScore } from '@/lib/scoring';
import { calculateAnswer } from '@/lib/utils';
import { NumberCard } from '@/models/Player';
import { SelectedCard } from '@/models/SelectedCard';
import { useAchievementStore } from '@/stores/achievement-store';
import { useStatsStore } from '@/stores/stats-store';

const INITIAL_SECONDS = 5 * 60; // 5 分鐘
// 答對加時隨關卡遞減：第 1 關 +60s，每關 -3s，下限 15s
export function getStageBonus(stage: number): number {
  return Math.max(15, 60 - (stage - 1) * 3);
}
// 跳過懲罰遞增：同一關內第 1 次 -15s、第 2 次 -30s、第 3 次起 -60s（答對後重置）
const SKIP_PENALTIES = [15, 30] as const;
const SKIP_PENALTY_MAX = 60;
export function getSkipPenalty(skipsSinceCorrect: number): number {
  return SKIP_PENALTIES[skipsSinceCorrect] ?? SKIP_PENALTY_MAX;
}
const LOCAL_STORAGE_KEY = 'math24_v2_challenge_best';

export type ChallengePlayStatus = 'idle' | 'playing' | 'finished';
export type ChallengeFinishReason = 'timeout' | 'early';

export interface ChallengeBest {
  stage: number;
  totalScore: number;
  date: string;
}

function loadBest(): ChallengeBest | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ChallengeBest;
  } catch {
    return null;
  }
}

function saveBest(candidate: ChallengeBest) {
  try {
    const current = loadBest();
    if (!current || candidate.stage > current.stage) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(candidate));
    }
  } catch {
    // localStorage 不可用時靜默失敗
  }
}

function generateNextPuzzle(nextStage: number): NumberCard[] {
  let nums: number[];
  try {
    nums = generateOnePuzzle();
  } catch {
    nums = [2, 3, 4, 6]; // 2*3*4=24，極罕見 fallback
  }
  return nums.map((v, i) => ({ id: `s${nextStage}-${i}`, value: v }));
}

export function useChallengePlay() {
  const [status, setStatus] = useState<ChallengePlayStatus>('idle');
  const [finishReason, setFinishReason] =
    useState<ChallengeFinishReason>('timeout');
  const [stage, setStage] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [currentNumbers, setCurrentNumbers] = useState<NumberCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<SelectedCard[]>([]);
  const [best, setBest] = useState<ChallengeBest | null>(null);
  // 下一次跳過會扣的秒數（供 UI 顯示）
  const [nextSkipPenalty, setNextSkipPenalty] = useState(getSkipPenalty(0));

  // Refs 讓 onExpire 閉包始終拿到最新值
  const stageRef = useRef(stage);
  const totalScoreRef = useRef(totalScore);
  // 跳過計數，僅用於產生唯一 card ID，不影響 stage
  const skipCountRef = useRef(0);
  // 同一關內連續跳過次數，決定遞增懲罰，答對後歸零
  const skipsSinceCorrectRef = useRef(0);
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);
  useEffect(() => {
    totalScoreRef.current = totalScore;
  }, [totalScore]);

  // finishGame ref：onExpire 透過 ref 呼叫，避免 stale closure
  const finishGameRef = useRef<(s: number, sc: number) => void>(() => {});

  const {
    seconds,
    isRunning,
    start,
    pause,
    reset: resetTimer,
    addSeconds,
  } = useTimer({
    mode: 'countdown',
    initialSeconds: INITIAL_SECONDS,
    onExpire: () =>
      finishGameRef.current(stageRef.current, totalScoreRef.current),
  });

  // 定義 finishGame，並同步到 ref
  const finishGame = useCallback(
    (
      finalStage: number,
      finalScore: number,
      reason: ChallengeFinishReason = 'timeout',
    ) => {
      pause();
      setFinishReason(reason);
      const record: ChallengeBest = {
        stage: finalStage,
        totalScore: finalScore,
        date: new Date().toISOString(),
      };
      saveBest(record);
      setBest(loadBest());

      // 統計與成就
      const answeredCount = Math.max(0, finalStage - 1);
      const statsStore = useStatsStore.getState();
      statsStore.incrementChallengePlays();
      statsStore.updateChallengeBestStage(answeredCount);
      useAchievementStore.getState().updateChallengeBestStage(answeredCount);
      if (answeredCount >= 1) unlockAchievement('challenge_first');
      if (answeredCount >= 10) unlockAchievement('challenge_stage_10');

      setStatus('finished');
    },
    [pause],
  );
  finishGameRef.current = finishGame;

  useEffect(() => {
    setBest(loadBest());
  }, []);

  const startGame = useCallback(() => {
    setCurrentNumbers(generateNextPuzzle(1));
    setStage(1);
    setTotalScore(0);
    setSelectedCards([]);
    skipsSinceCorrectRef.current = 0;
    setNextSkipPenalty(getSkipPenalty(0));
    resetTimer();
    setStatus('playing');
    requestAnimationFrame(() => start());
  }, [resetTimer, start]);

  const selectCard = useCallback((card: SelectedCard) => {
    if (card.number) {
      setSelectedCards(prev => {
        const idx = prev.findIndex(c => c.number?.id === card.number!.id);
        if (idx >= 0) return prev.filter((_, i) => i !== idx);
        return [...prev, card];
      });
    } else {
      setSelectedCards(prev => [...prev, card]);
    }
  }, []);

  const removeCard = useCallback((index: number) => {
    setSelectedCards(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCards([]);
  }, []);

  const submitAnswer = useCallback(() => {
    let answer: number;
    try {
      answer = calculateAnswer(selectedCards);
    } catch {
      toast.error('算式有誤');
      return;
    }

    if (Math.abs(answer - 24) > 1e-9) {
      toast.error(`答案 ${answer} 不等於 24`);
      return;
    }

    // 答對：計分 + 加時（隨關卡遞減）+ 下一關
    const symbolCards = selectedCards.filter(c => c.symbol);
    const roundScore = calcRoundScore(symbolCards);
    const bonus = getStageBonus(stageRef.current);
    toast.success(`答對！+${roundScore}pt +${bonus}秒`);
    setTotalScore(prev => prev + roundScore);
    setSelectedCards([]);
    addSeconds(bonus);
    skipsSinceCorrectRef.current = 0;
    setNextSkipPenalty(getSkipPenalty(0));
    setStage(prev => {
      const next = prev + 1;
      setCurrentNumbers(generateNextPuzzle(next));
      return next;
    });
  }, [selectedCards, addSeconds]);

  const skipPuzzle = useCallback((): number => {
    // 跳過扣時（懲罰遞增）、不計關數，只換一組新牌
    const penalty = getSkipPenalty(skipsSinceCorrectRef.current);
    addSeconds(-penalty);
    skipsSinceCorrectRef.current += 1;
    setNextSkipPenalty(getSkipPenalty(skipsSinceCorrectRef.current));
    skipCountRef.current += 1;
    const key = `skip${skipCountRef.current}`;
    let nums: number[];
    try {
      nums = generateOnePuzzle();
    } catch {
      nums = [2, 3, 4, 6];
    }
    setCurrentNumbers(nums.map((v, i) => ({ id: `${key}-${i}`, value: v })));
    setSelectedCards([]);
    return penalty;
  }, [addSeconds]);

  const endGameEarly = useCallback(() => {
    finishGame(stageRef.current, totalScoreRef.current, 'early');
  }, [finishGame]);

  const quitGame = useCallback(() => {
    pause();
    setStatus('idle');
    setSelectedCards([]);
  }, [pause]);

  return {
    status,
    finishReason,
    stage,
    totalScore,
    currentNumbers,
    selectedCards,
    seconds,
    isRunning,
    best,
    nextSkipPenalty,
    startGame,
    selectCard,
    removeCard,
    clearSelection,
    submitAnswer,
    skipPuzzle,
    quitGame,
    endGameEarly,
  };
}
