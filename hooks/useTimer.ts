import { useCallback, useEffect, useRef, useState } from 'react';

type TimerMode = 'stopwatch' | 'countdown';

interface UseTimerOptions {
  mode: TimerMode;
  /** countdown 模式的初始秒數（stopwatch 忽略） */
  initialSeconds?: number;
  /** countdown 模式到 0 時觸發 */
  onExpire?: () => void;
}

interface UseTimerReturn {
  seconds: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
  /** 加秒（stopwatch 加懲罰時間，countdown 加獎勵時間） */
  addSeconds: (delta: number) => void;
}

export function useTimer({
  mode,
  initialSeconds = 0,
  onExpire,
}: UseTimerOptions): UseTimerReturn {
  const [seconds, setSeconds] = useState(
    mode === 'countdown' ? initialSeconds : 0,
  );
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (mode === 'countdown') {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setIsRunning(false);
            onExpireRef.current?.();
            return 0;
          }
          return prev - 1;
        }
        // stopwatch
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isRunning, mode]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setSeconds(mode === 'countdown' ? initialSeconds : 0);
  }, [mode, initialSeconds]);

  const addSeconds = useCallback((delta: number) => {
    setSeconds(prev => Math.max(0, prev + delta));
  }, []);

  return { seconds, isRunning, start, pause, reset, addSeconds };
}
