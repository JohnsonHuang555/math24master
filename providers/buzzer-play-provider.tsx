'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { BuzzerPlayerState } from '@/models/Room';
import { NumberCard } from '@/models/Player';
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
  if (!ctx) throw new Error('useBuzzerPlay must be used inside BuzzerPlayProvider');
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function BuzzerPlayProvider({ children }: { children: React.ReactNode }) {
  const { socket, roomInfo } = useMultiplePlay();

  const [publicCards, setPublicCards] = useState<NumberCard[]>([]);
  const [roundNumber, setRoundNumber] = useState(0);
  const [roundSeconds, setRoundSeconds] = useState<number | null>(null);
  const [roundRemaining, setRoundRemaining] = useState<number | null>(null);
  const [roundTimerPaused, setRoundTimerPaused] = useState(false);

  const [isBuzzerOpen, setIsBuzzerOpen] = useState(false);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [currentAnswerPlayerId, setCurrentAnswerPlayerId] = useState<string | null>(null);
  const [answerSeconds, setAnswerSeconds] = useState(15);
  const [answerRemaining, setAnswerRemaining] = useState<number | null>(null);

  const [playerStates, setPlayerStates] = useState<{ [id: string]: BuzzerPlayerState }>({});
  const [noSolutionVotes, setNoSolutionVotes] = useState<string[]>([]);

  const [lastAnswerResult, setLastAnswerResult] = useState<BuzzerAnswerResultData | null>(null);
  const [roundTimeoutNotification, setRoundTimeoutNotification] = useState<{ penaltyPoints: number } | null>(null);
  const [answerSelectedCards, setAnswerSelectedCards] = useState<SelectedCard[]>([]);

  // client-side 倒數計時 refs
  const roundTickRef = useRef<NodeJS.Timeout | null>(null);
  const answerTickRef = useRef<NodeJS.Timeout | null>(null);

  const _clearRoundTick = () => {
    if (roundTickRef.current) { clearInterval(roundTickRef.current); roundTickRef.current = null; }
  };
  const _clearAnswerTick = () => {
    if (answerTickRef.current) { clearInterval(answerTickRef.current); answerTickRef.current = null; }
  };

  const _startRoundTick = (remaining: number) => {
    _clearRoundTick();
    setRoundRemaining(remaining);
    if (remaining <= 0) return;
    roundTickRef.current = setInterval(() => {
      setRoundRemaining(prev => {
        if (prev === null || prev <= 1) { _clearRoundTick(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const _startAnswerTick = (seconds: number) => {
    _clearAnswerTick();
    setAnswerRemaining(seconds);
    answerTickRef.current = setInterval(() => {
      setAnswerRemaining(prev => {
        if (prev === null || prev <= 1) { _clearAnswerTick(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (!socket) return;

    socket.on(SocketEvent.BuzzerRoundStart, ({ publicCards: cards, roundNumber: num, roundSeconds: secs }) => {
      setPublicCards(cards);
      setRoundNumber(num);
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
    });

    socket.on(SocketEvent.BuzzerCountdown, ({ countdown }) => {
      setCountdownValue(countdown);
    });

    socket.on(SocketEvent.BuzzerOpen, () => {
      setCountdownValue(null);
      setIsBuzzerOpen(true);
    });

    socket.on(SocketEvent.BuzzerBuzzInSuccess, ({ playerId, answerSeconds: secs }) => {
      setCurrentAnswerPlayerId(playerId);
      setAnswerSeconds(secs);
      _startAnswerTick(secs);
    });

    socket.on(SocketEvent.BuzzerRoundTimerPaused, ({ elapsedSeconds }) => {
      setRoundTimerPaused(true);
      _clearRoundTick();
      setRoundRemaining(prev => (prev !== null && roundSeconds !== null ? roundSeconds - elapsedSeconds : prev));
    });

    socket.on(SocketEvent.BuzzerRoundTimerResumed, ({ remainingSeconds }) => {
      setRoundTimerPaused(false);
      setCurrentAnswerPlayerId(null);
      setAnswerSelectedCards([]);
      _clearAnswerTick();
      setAnswerRemaining(null);
      _startRoundTick(remainingSeconds);
    });

    socket.on(SocketEvent.BuzzerAnswerResult, (data: BuzzerAnswerResultData) => {
      setLastAnswerResult(data);
      setAnswerSelectedCards([]);
      _clearAnswerTick();
      setAnswerRemaining(null);

      // 更新 playerStates 中的 streak
      setPlayerStates(prev => ({
        ...prev,
        [data.playerId]: {
          ...(prev[data.playerId] ?? { isLocked: false, lockUntil: null, streak: 0 }),
          streak: data.isCorrect ? data.streak : 0,
        },
      }));

      setTimeout(() => setLastAnswerResult(null), 3000);
    });

    socket.on(SocketEvent.BuzzerPlayerLocked, ({ playerId, lockUntil }) => {
      setPlayerStates(prev => ({
        ...prev,
        [playerId]: { ...(prev[playerId] ?? { streak: 0 }), isLocked: true, lockUntil },
      }));
    });

    socket.on(SocketEvent.BuzzerPlayerUnlocked, ({ playerId }) => {
      setPlayerStates(prev => ({
        ...prev,
        [playerId]: { ...(prev[playerId] ?? { streak: 0, lockUntil: null }), isLocked: false, lockUntil: null },
      }));
    });

    socket.on(SocketEvent.BuzzerNoSolutionVoteUpdate, ({ votes }) => {
      setNoSolutionVotes(votes);
    });

    socket.on(SocketEvent.BuzzerNoSolutionPassed, () => {
      setNoSolutionVotes([]);
      setIsBuzzerOpen(false);
      _clearRoundTick();
      _clearAnswerTick();
    });

    socket.on(SocketEvent.BuzzerRoundTimeout, ({ penaltyPoints }: { penaltyPoints: number; players: unknown[] }) => {
      _clearRoundTick();
      setRoundRemaining(0);
      if (penaltyPoints > 0) {
        setRoundTimeoutNotification({ penaltyPoints });
        setTimeout(() => setRoundTimeoutNotification(null), 3000);
      }
    });

    socket.on(SocketEvent.BuzzerSelectionUpdate, ({ selectedCards }) => {
      setAnswerSelectedCards(selectedCards);
    });

    return () => {
      socket.off(SocketEvent.BuzzerRoundStart);
      socket.off(SocketEvent.BuzzerCountdown);
      socket.off(SocketEvent.BuzzerOpen);
      socket.off(SocketEvent.BuzzerBuzzInSuccess);
      socket.off(SocketEvent.BuzzerRoundTimerPaused);
      socket.off(SocketEvent.BuzzerRoundTimerResumed);
      socket.off(SocketEvent.BuzzerAnswerResult);
      socket.off(SocketEvent.BuzzerPlayerLocked);
      socket.off(SocketEvent.BuzzerPlayerUnlocked);
      socket.off(SocketEvent.BuzzerNoSolutionVoteUpdate);
      socket.off(SocketEvent.BuzzerNoSolutionPassed);
      socket.off(SocketEvent.BuzzerRoundTimeout);
      socket.off(SocketEvent.BuzzerGameOver);
      socket.off(SocketEvent.BuzzerSelectionUpdate);
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

  const buzzIn = useCallback((roomId: string) => {
    socket?.emit(SocketEvent.BuzzerBuzzIn, { roomId });
  }, [socket]);

  const submitAnswer = useCallback((roomId: string, selectedCards: SelectedCard[]) => {
    socket?.emit(SocketEvent.BuzzerSubmitAnswer, { roomId, selectedCards });
  }, [socket]);

  const voteNoSolution = useCallback((roomId: string) => {
    socket?.emit(SocketEvent.BuzzerVoteNoSolution, { roomId });
  }, [socket]);

  const updateSelection = useCallback((roomId: string, selectedCards: SelectedCard[]) => {
    socket?.emit(SocketEvent.BuzzerSelectionUpdate, { roomId, selectedCards });
  }, [socket]);

  return (
    <BuzzerPlayContext.Provider value={{
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
    }}>
      {children}
    </BuzzerPlayContext.Provider>
  );
}
