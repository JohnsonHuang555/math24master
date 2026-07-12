'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  QuickMathQuestion,
  TOTAL_QUESTIONS,
  generateQuestionSet,
} from '@/lib/quick-math-generator';
import { playSound } from '@/lib/sound-manager';

export const WRONG_PENALTY_SECONDS = 3;
const MAX_INPUT_LENGTH = 3;
const COUNTDOWN_START = 3;
const WRONG_FLASH_MS = 600;

export type QuickMathState = 'idle' | 'countdown' | 'playing' | 'completed';

const round10 = (x: number) => Math.round(x * 10) / 10;

export function useQuickMath() {
  const [gameState, setGameState] = useState<QuickMathState>('idle');
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [questions, setQuestions] = useState<QuickMathQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [finalSeconds, setFinalSeconds] = useState<number | null>(null);
  const [penaltySeconds, setPenaltySeconds] = useState(0);
  const [wrongFlash, setWrongFlash] = useState(false);
  // 本次 session 完賽才提交排行榜
  const [justFinished, setJustFinished] = useState(false);

  // 計時基準：timestamp diff 而非 interval 累加，背景分頁節流也不會變慢
  const startTimeRef = useRef(0);
  const penaltyRef = useRef(0);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const wrongFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const elapsedSeconds = useCallback(
    () =>
      round10(
        (performance.now() - startTimeRef.current) / 1000 + penaltyRef.current,
      ),
    [],
  );

  // 進行中每 100ms 從 timestamp diff 重算顯示時間
  useEffect(() => {
    if (gameState !== 'playing') return;
    const id = setInterval(() => setDisplaySeconds(elapsedSeconds()), 100);
    return () => clearInterval(id);
  }, [gameState, elapsedSeconds]);

  // unmount 清理倒數與提示 timer
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (wrongFlashTimeoutRef.current) {
        clearTimeout(wrongFlashTimeoutRef.current);
      }
    };
  }, []);

  const startGame = useCallback(() => {
    setQuestions(generateQuestionSet());
    setCurrentIndex(0);
    setInputValue('');
    setDisplaySeconds(0);
    setFinalSeconds(null);
    setPenaltySeconds(0);
    setJustFinished(false);
    penaltyRef.current = 0;
    setGameState('countdown');
    setCountdownValue(COUNTDOWN_START);
    playSound('select');

    countdownIntervalRef.current = setInterval(() => {
      setCountdownValue(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          startTimeRef.current = performance.now();
          setGameState('playing');
          return null;
        }
        playSound('select');
        return prev - 1;
      });
    }, 1000);
  }, []);

  const pressDigit = useCallback(
    (digit: number) => {
      if (gameState !== 'playing') return;
      setInputValue(prev => {
        if (prev.length >= MAX_INPUT_LENGTH) return prev;
        playSound('select');
        return prev === '0' ? String(digit) : prev + String(digit);
      });
    },
    [gameState],
  );

  const clearInput = useCallback(() => {
    if (gameState !== 'playing') return;
    setInputValue('');
  }, [gameState]);

  const backspace = useCallback(() => {
    if (gameState !== 'playing') return;
    setInputValue(prev => prev.slice(0, -1));
  }, [gameState]);

  const submitAnswer = useCallback(() => {
    if (gameState !== 'playing' || inputValue === '') return;
    const question = questions[currentIndex];
    if (!question) return;

    if (parseInt(inputValue, 10) !== question.answer) {
      // 答錯：+3 秒罰時、清空輸入、原題重試
      playSound('wrong');
      penaltyRef.current += WRONG_PENALTY_SECONDS;
      setPenaltySeconds(penaltyRef.current);
      setInputValue('');
      setDisplaySeconds(elapsedSeconds());
      setWrongFlash(false);
      requestAnimationFrame(() => setWrongFlash(true));
      if (wrongFlashTimeoutRef.current) {
        clearTimeout(wrongFlashTimeoutRef.current);
      }
      wrongFlashTimeoutRef.current = setTimeout(
        () => setWrongFlash(false),
        WRONG_FLASH_MS,
      );
      return;
    }

    // 答對
    setInputValue('');
    // 快答節奏快，縮短顯示時間避免 toast 堆疊
    toast.success('答對！', { duration: 1200 });
    if (currentIndex + 1 < TOTAL_QUESTIONS) {
      playSound('correct');
      setCurrentIndex(currentIndex + 1);
      return;
    }

    // 全部完成：當下定格總時間（不等 interval tick）
    const final = elapsedSeconds();
    setFinalSeconds(final);
    setDisplaySeconds(final);
    setJustFinished(true);
    setGameState('completed');
    playSound('gameOverWin');
  }, [gameState, inputValue, questions, currentIndex, elapsedSeconds]);

  const restart = useCallback(() => {
    setGameState('idle');
    setCountdownValue(null);
    setFinalSeconds(null);
    setJustFinished(false);
  }, []);

  return {
    gameState,
    countdownValue,
    questions,
    currentIndex,
    currentQuestion: questions[currentIndex] ?? null,
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
  };
}
