'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createSocketListeners } from '@/lib/socket-listeners';
import { NumberCard } from '@/models/Player';
import { BuzzerPlayerState } from '@/models/Room';
import { SelectedCard } from '@/models/SelectedCard';
import { SocketEvent } from '@/models/SocketEvent';
import { useMultiplePlay } from './multiple-play-provider';

// ── 型別 ─────────────────────────────────────────────────────────────────────

export type BuzzerAnswerResultData = {
  isCorrect: boolean;
  playerId: string;
  scoreDelta: number;
  newScore: number;
  streak: number;
  streakBonus: number;
};

export type BuzzerGameOverData = {
  winner: { id: string; name: string; score: number };
  players: { id: string; name: string; score: number }[];
};

type BuzzerPlayContextType = {
  // 回合狀態
  publicCards: NumberCard[];
  roundNumber: number;
  roundSeconds: number | null;
  roundRemaining: number | null;
  roundTimerPaused: boolean;

  // 搶答狀態
  isBuzzerOpen: boolean;
  countdownValue: number | null;
  currentAnswerPlayerId: string | null;
  answerSeconds: number;
  answerRemaining: number | null;

  // 玩家狀態
  playerStates: { [playerId: string]: BuzzerPlayerState };

  // 無解投票
  noSolutionVotes: string[];
  totalPlayers: number;

  // 最後答題結果（短暫顯示後清除）
  lastAnswerResult: BuzzerAnswerResultData | null;
  roundTimeoutNotification: { penaltyPoints: number } | null;

  // 作答者目前選牌進度（供旁觀者即時查看）
  answerSelectedCards: SelectedCard[];

  // Actions
  buzzIn: (roomId: string) => void;
  submitAnswer: (roomId: string, selectedCards: SelectedCard[]) => void;
  voteNoSolution: (roomId: string) => void;
  updateSelection: (roomId: string, selectedCards: SelectedCard[]) => void;
};

// ── Context ───────────────────────────────────────────────────────────────────

const BuzzerPlayContext = createContext<BuzzerPlayContextType | null>(null);

export function useBuzzerPlay() {
  const ctx = useContext(BuzzerPlayContext);
  if (!ctx)
    throw new Error('useBuzzerPlay must be used inside BuzzerPlayProvider');
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function BuzzerPlayProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { socket, roomInfo } = useMultiplePlay();

  const [publicCards, setPublicCards] = useState<NumberCard[]>([]);
  const [roundNumber, setRoundNumber] = useState(0);
  const [roundSeconds, setRoundSeconds] = useState<number | null>(null);
  const roomIdRef = useRef<string | undefined>(roomInfo?.roomId);
  roomIdRef.current = roomInfo?.roomId;
  const roundSecondsRef = useRef<number | null>(null);
  roundSecondsRef.current = roundSeconds;
  const [roundRemaining, setRoundRemaining] = useState<number | null>(null);
  const [roundTimerPaused, setRoundTimerPaused] = useState(false);

  const [isBuzzerOpen, setIsBuzzerOpen] = useState(false);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [currentAnswerPlayerId, setCurrentAnswerPlayerId] = useState<
    string | null
  >(null);
  const [answerSeconds, setAnswerSeconds] = useState(15);
  const [answerRemaining, setAnswerRemaining] = useState<number | null>(null);

  const [playerStates, setPlayerStates] = useState<{
    [id: string]: BuzzerPlayerState;
  }>({});
  const [noSolutionVotes, setNoSolutionVotes] = useState<string[]>([]);

  const [lastAnswerResult, setLastAnswerResult] =
    useState<BuzzerAnswerResultData | null>(null);
  const [roundTimeoutNotification, setRoundTimeoutNotification] = useState<{
    penaltyPoints: number;
  } | null>(null);
  const [answerSelectedCards, setAnswerSelectedCards] = useState<
    SelectedCard[]
  >([]);

  // client-side 倒數計時 refs
  const roundTickRef = useRef<NodeJS.Timeout | null>(null);
  const answerTickRef = useRef<NodeJS.Timeout | null>(null);

  const _clearRoundTick = () => {
    if (roundTickRef.current) {
      clearInterval(roundTickRef.current);
      roundTickRef.current = null;
    }
  };
  const _clearAnswerTick = () => {
    if (answerTickRef.current) {
      clearInterval(answerTickRef.current);
      answerTickRef.current = null;
    }
  };

  const _startRoundTick = (remaining: number) => {
    _clearRoundTick();
    setRoundRemaining(remaining);
    if (remaining <= 0) return;
    roundTickRef.current = setInterval(() => {
      setRoundRemaining(prev => {
        if (prev === null || prev <= 1) {
          _clearRoundTick();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const _startAnswerTick = (seconds: number) => {
    _clearAnswerTick();
    setAnswerRemaining(seconds);
    answerTickRef.current = setInterval(() => {
      setAnswerRemaining(prev => {
        if (prev === null || prev <= 1) {
          _clearAnswerTick();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (!socket) return;
    const listeners = createSocketListeners(socket);

    listeners.on(
      SocketEvent.BuzzerRoundStart,
      ({ publicCards: cards, roundNumber: num, roundSeconds: secs }) => {
        setPublicCards(cards);
        setRoundNumber(num);
        roundSecondsRef.current = secs;
        setRoundSeconds(secs);
        setRoundRemaining(secs);
        setRoundTimerPaused(false);
        setIsBuzzerOpen(false);
        setCountdownValue(null);
        setCurrentAnswerPlayerId(null);
        setAnswerRemaining(null);
        setNoSolutionVotes([]);
        setLastAnswerResult(null);
        setAnswerSelectedCards([]);
        _clearRoundTick();
        _clearAnswerTick();
      },
    );

    listeners.on(SocketEvent.BuzzerCountdown, ({ countdown }) => {
      setCountdownValue(countdown);
    });

    listeners.on(SocketEvent.BuzzerOpen, () => {
      setCountdownValue(null);
      setIsBuzzerOpen(true);
    });

    listeners.on(
      SocketEvent.BuzzerBuzzInSuccess,
      ({ playerId, answerSeconds: secs }) => {
        setCurrentAnswerPlayerId(playerId);
        setAnswerSeconds(secs);
        _startAnswerTick(secs);
      },
    );

    listeners.on(SocketEvent.BuzzerRoundTimerPaused, ({ elapsedSeconds }) => {
      setRoundTimerPaused(true);
      _clearRoundTick();
      // 事件監聽只在 socket 變動時註冊，直接讀 roundSeconds 會拿到舊值，改讀 ref
      const total = roundSecondsRef.current;
      setRoundRemaining(prev =>
        prev !== null && total !== null ? total - elapsedSeconds : prev,
      );
    });

    listeners.on(
      SocketEvent.BuzzerRoundTimerResumed,
      ({ remainingSeconds }) => {
        setRoundTimerPaused(false);
        setCurrentAnswerPlayerId(null);
        setAnswerSelectedCards([]);
        _clearAnswerTick();
        setAnswerRemaining(null);
        _startRoundTick(remainingSeconds);
      },
    );

    listeners.on(
      SocketEvent.BuzzerAnswerResult,
      (data: BuzzerAnswerResultData) => {
        setLastAnswerResult(data);
        setAnswerSelectedCards([]);
        _clearAnswerTick();
        setAnswerRemaining(null);

        // 更新 playerStates 中的 streak
        setPlayerStates(prev => ({
          ...prev,
          [data.playerId]: {
            ...(prev[data.playerId] ?? {
              isLocked: false,
              lockUntil: null,
              streak: 0,
            }),
            streak: data.isCorrect ? data.streak : 0,
          },
        }));

        setTimeout(() => setLastAnswerResult(null), 3000);
      },
    );

    listeners.on(SocketEvent.BuzzerPlayerLocked, ({ playerId, lockUntil }) => {
      setPlayerStates(prev => ({
        ...prev,
        [playerId]: {
          ...(prev[playerId] ?? { streak: 0 }),
          isLocked: true,
          lockUntil,
        },
      }));
    });

    listeners.on(SocketEvent.BuzzerPlayerUnlocked, ({ playerId }) => {
      setPlayerStates(prev => ({
        ...prev,
        [playerId]: {
          ...(prev[playerId] ?? { streak: 0, lockUntil: null }),
          isLocked: false,
          lockUntil: null,
        },
      }));
    });

    listeners.on(SocketEvent.BuzzerNoSolutionVoteUpdate, ({ votes }) => {
      setNoSolutionVotes(votes);
    });

    listeners.on(SocketEvent.BuzzerNoSolutionPassed, () => {
      setNoSolutionVotes([]);
      setIsBuzzerOpen(false);
      _clearRoundTick();
      _clearAnswerTick();
    });

    listeners.on(
      SocketEvent.BuzzerRoundTimeout,
      ({ penaltyPoints }: { penaltyPoints: number; players: unknown[] }) => {
        _clearRoundTick();
        setRoundRemaining(0);
        if (penaltyPoints > 0) {
          setRoundTimeoutNotification({ penaltyPoints });
          setTimeout(() => setRoundTimeoutNotification(null), 3000);
        }
      },
    );

    listeners.on(SocketEvent.BuzzerSelectionUpdate, ({ selectedCards }) => {
      setAnswerSelectedCards(selectedCards);
    });

    // 狀態都靠事件累積：畫面剛掛上（重新整理）或斷線重連回來時，向伺服器要目前這一題補齊
    const requestSync = () => {
      const roomId = roomIdRef.current;
      if (roomId) socket.emit(SocketEvent.BuzzerSync, { roomId });
    };
    listeners.on(SocketEvent.PlayerReconnectSuccess, requestSync);
    requestSync();

    return () => {
      // 只移除自己登記的 handler；不帶 handler 的 socket.off 會把 MultiplePlayProvider 的 BuzzerGameOver 一起拿掉
      listeners.off();
      _clearRoundTick();
      _clearAnswerTick();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // buzzerState 初始化：從 roomInfo.buzzerState 同步 playerStates
  useEffect(() => {
    if (roomInfo?.buzzerState?.playerStates) {
      setPlayerStates(roomInfo.buzzerState.playerStates);
    }
  }, [roomInfo?.buzzerState?.playerStates]);

  const buzzIn = useCallback(
    (roomId: string) => {
      socket?.emit(SocketEvent.BuzzerBuzzIn, { roomId });
    },
    [socket],
  );

  const submitAnswer = useCallback(
    (roomId: string, selectedCards: SelectedCard[]) => {
      socket?.emit(SocketEvent.BuzzerSubmitAnswer, { roomId, selectedCards });
    },
    [socket],
  );

  const voteNoSolution = useCallback(
    (roomId: string) => {
      socket?.emit(SocketEvent.BuzzerVoteNoSolution, { roomId });
    },
    [socket],
  );

  const updateSelection = useCallback(
    (roomId: string, selectedCards: SelectedCard[]) => {
      socket?.emit(SocketEvent.BuzzerSelectionUpdate, {
        roomId,
        selectedCards,
      });
    },
    [socket],
  );

  return (
    <BuzzerPlayContext.Provider
      value={{
        publicCards,
        roundNumber,
        roundSeconds,
        roundRemaining,
        roundTimerPaused,
        isBuzzerOpen,
        countdownValue,
        currentAnswerPlayerId,
        answerSeconds,
        answerRemaining,
        playerStates,
        noSolutionVotes,
        totalPlayers: roomInfo?.players.length ?? 0,
        lastAnswerResult,
        roundTimeoutNotification,
        answerSelectedCards,
        buzzIn,
        submitAnswer,
        voteNoSolution,
        updateSelection,
      }}
    >
      {children}
    </BuzzerPlayContext.Provider>
  );
}
