import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { unlockAchievement } from '@/lib/achievement-manager';
import { calcRoundScore } from '@/lib/scoring';
import { generateOnePuzzle } from '@/lib/puzzle-generator';
import { calculateAnswer } from '@/lib/utils';
import { useTimer } from '@/hooks/useTimer';
import { SelectedCard } from '@/models/SelectedCard';
import { NumberCard } from '@/models/Player';
import { useAchievementStore } from '@/stores/achievement-store';
import { useStatsStore } from '@/stores/stats-store';

const INITIAL_SECONDS = 5 * 60; // 5 分鐘
const CORRECT_BONUS_SECONDS = 60; // 答對 +1 分鐘
const LOCAL_STORAGE_KEY = 'math24_v2_challenge_best';

export type ChallengePlayStatus = 'idle' | 'playing' | 'finished';

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
  const [stage, setStage] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [currentNumbers, setCurrentNumbers] = useState<NumberCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<SelectedCard[]>([]);
  const [best, setBest] = useState<ChallengeBest | null>(null);

  // Refs 讓 onExpire 閉包始終拿到最新值
  const stageRef = useRef(stage);
  const totalScoreRef = useRef(totalScore);
  useEffect(() => { stageRef.current = stage; }, [stage]);
  useEffect(() => { totalScoreRef.current = totalScore; }, [totalScore]);

  // finishGame ref：onExpire 透過 ref 呼叫，避免 stale closure
  const finishGameRef = useRef<(s: number, sc: number) => void>(() => {});

  const { seconds, isRunning, start, pause, reset: resetTimer, addSeconds } =
    useTimer({
      mode: 'countdown',
      initialSeconds: INITIAL_SECONDS,
      onExpire: () => finishGameRef.current(stageRef.current, totalScoreRef.current),
    });

  // 定義 finishGame，並同步到 ref
  const finishGame = useCallback(
    (finalStage: number, finalScore: number) => {
      pause();
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

    // 答對：計分 + 加時 + 下一關
    const symbolCards = selectedCards.filter(c => c.symbol);
    const roundScore = calcRoundScore(symbolCards);
    toast.success(`答對！+${roundScore}pt +1分鐘`);
    setTotalScore(prev => prev + roundScore);
    setSelectedCards([]);
    addSeconds(CORRECT_BONUS_SECONDS);
    setStage(prev => {
      const next = prev + 1;
      setCurrentNumbers(generateNextPuzzle(next));
      return next;
    });
  }, [selectedCards, addSeconds]);

  const skipPuzzle = useCallback(() => {
    // 跳過不加時，直接換題
    setStage(prev => {
      const next = prev + 1;
      setCurrentNumbers(generateNextPuzzle(next));
      return next;
    });
    setSelectedCards([]);
  }, []);

  const quitGame = useCallback(() => {
    pause();
    setStatus('idle');
    setSelectedCards([]);
    resetTimer();
  }, [pause, resetTimer]);

  return {
    status,
    stage,
    totalScore,
    currentNumbers,
    selectedCards,
    seconds,
    isRunning,
    best,
    startGame,
    selectCard,
    removeCard,
    clearSelection,
    submitAnswer,
    skipPuzzle,
    quitGame,
  };
}
