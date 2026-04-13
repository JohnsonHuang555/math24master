import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { unlockAchievement } from '@/lib/achievement-manager';
import { calcRoundScore } from '@/lib/scoring';
import { generateSolvablePuzzles } from '@/lib/puzzle-generator';
import { calculateAnswer } from '@/lib/utils';
import { useTimer } from '@/hooks/useTimer';
import { SelectedCard } from '@/models/SelectedCard';
import { NumberCard } from '@/models/Player';
import { useStatsStore } from '@/stores/stats-store';

const TOTAL_ROUNDS = 10;
const WRONG_PENALTY_SECONDS = 10;
const LOCAL_STORAGE_KEY = 'math24_v2_normal_records';
const MAX_RECORDS = 100;

export type NormalPlayStatus = 'idle' | 'playing' | 'finished';

export interface NormalRecord {
  date: string;
  totalSeconds: number;
  totalScore: number;
}

function loadRecords(): NormalRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as NormalRecord[];
  } catch {
    return [];
  }
}

function saveRecord(record: NormalRecord) {
  try {
    const records = loadRecords();
    records.unshift(record);
    if (records.length > MAX_RECORDS) records.length = MAX_RECORDS;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // localStorage 不可用時靜默失敗
  }
}

export function useNormalPlay() {
  const [status, setStatus] = useState<NormalPlayStatus>('idle');
  const [puzzles, setPuzzles] = useState<number[][]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [selectedCards, setSelectedCards] = useState<SelectedCard[]>([]);
  const [records, setRecords] = useState<NormalRecord[]>([]);
  const [penaltyCount, setPenaltyCount] = useState(0);

  const { seconds, isRunning, start, pause, reset: resetTimer, addSeconds } =
    useTimer({ mode: 'stopwatch' });

  // 當前題目的數字牌
  const currentNumbers: NumberCard[] = (puzzles[currentRound] ?? []).map(
    (v, i) => ({ id: `${currentRound}-${i}`, value: v }),
  );

  // 初始化：載入歷史紀錄
  useEffect(() => {
    setRecords(loadRecords());
  }, []);

  const startGame = useCallback(() => {
    let generated: number[][];
    try {
      generated = generateSolvablePuzzles(TOTAL_ROUNDS);
    } catch {
      toast.error('無法產生題目，請重試');
      return;
    }
    setPuzzles(generated);
    setCurrentRound(0);
    setTotalScore(0);
    setSelectedCards([]);
    setPenaltyCount(0);
    resetTimer();
    setStatus('playing');
    // resetTimer 後才 start，讓 seconds 先歸 0
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
      addSeconds(WRONG_PENALTY_SECONDS);
      setPenaltyCount(prev => prev + 1);
      return;
    }

    if (Math.abs(answer - 24) > 1e-9) {
      toast.error(`答案 ${answer} 不等於 24，+${WRONG_PENALTY_SECONDS}s 懲罰`);
      addSeconds(WRONG_PENALTY_SECONDS);
      setPenaltyCount(prev => prev + 1);
      return;
    }

    // 答對
    const symbolCards = selectedCards.filter(c => c.symbol);
    const roundScore = calcRoundScore(symbolCards);
    toast.success(`答對！+${roundScore}pt`);
    setTotalScore(prev => prev + roundScore);
    setSelectedCards([]);

    const nextRound = currentRound + 1;
    if (nextRound >= TOTAL_ROUNDS) {
      // 遊戲結束
      pause();
      const finalSeconds = seconds + 1; // +1 因為這一秒還未 tick
      const record: NormalRecord = {
        date: new Date().toISOString(),
        totalSeconds: finalSeconds,
        totalScore: totalScore + roundScore,
      };
      saveRecord(record);
      setRecords(loadRecords());

      // 統計與成就
      const statsStore = useStatsStore.getState();
      statsStore.incrementNormalPlays();
      statsStore.updateNormalBest(finalSeconds);
      unlockAchievement('normal_first');
      if (penaltyCount === 0) {
        statsStore.incrementNormalPerfectRuns();
        unlockAchievement('normal_perfect');
      }

      setStatus('finished');
    } else {
      setCurrentRound(nextRound);
    }
  }, [selectedCards, currentRound, totalScore, seconds, penaltyCount, addSeconds, pause]);

  const skipPuzzle = useCallback(() => {
    setSelectedCards([]);
    const nextRound = currentRound + 1;
    if (nextRound >= TOTAL_ROUNDS) {
      pause();
      const finalSeconds = seconds + 1;
      const record: NormalRecord = {
        date: new Date().toISOString(),
        totalSeconds: finalSeconds,
        totalScore,
      };
      saveRecord(record);
      setRecords(loadRecords());
      const statsStore = useStatsStore.getState();
      statsStore.incrementNormalPlays();
      statsStore.updateNormalBest(finalSeconds);
      unlockAchievement('normal_first');
      setStatus('finished');
    } else {
      setCurrentRound(nextRound);
    }
  }, [currentRound, seconds, totalScore, pause]);

  const quitGame = useCallback(() => {
    pause();
    setStatus('idle');
    setSelectedCards([]);
    resetTimer();
  }, [pause, resetTimer]);

  return {
    status,
    currentRound,
    totalRounds: TOTAL_ROUNDS,
    currentNumbers,
    selectedCards,
    totalScore,
    seconds,
    isRunning,
    records,
    startGame,
    selectCard,
    removeCard,
    clearSelection,
    submitAnswer,
    skipPuzzle,
    quitGame,
  };
}
