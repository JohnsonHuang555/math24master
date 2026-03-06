'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'react-toastify';
import { Socket, io } from 'socket.io-client';
import { useGameActions } from '@/hooks/useGameActions';
import { unlockAchievement } from '@/lib/achievement-manager';
import { useStatsStore } from '@/stores/stats-store';
import { playSound } from '@/lib/sound-manager';
import { GameMode } from '@/models/GameMode';
import { GameStatus } from '@/models/GameStatus';
import { Message } from '@/models/Message';
import { NumberCard, Player } from '@/models/Player';
import { EquationGroup, GameType, Room, RoomSettings } from '@/models/Room';
import { SelectedCard } from '@/models/SelectedCard';
import { SocketEvent } from '@/models/SocketEvent';
import { Symbol } from '@/models/Symbol';

const socket = io();

/**
 * 1. 建立 Context
 */
// 定義 Context 中 value 的型別
type GameOverData = {
  name: string;
  score: number;
  players: Player[];
  isPenaltyGameOver?: boolean;
};

type GameAbortedData = {
  playerName: string;
};

type MultiplePlayContextData = {
  searchRooms: (payload?: { roomName: string; showEmpty: boolean }) => void;
  joinRoom: (
    playerName: string,
    roomId: string,
    roomName?: string,
    maxPlayers?: number,
    password?: string,
    gameType?: GameType,
    remainSeconds?: number | null,
  ) => void;
  socket: Socket;
  roomInfo?: Room;
  playerId?: string;
  onReadyGame: () => void;
  onStartGame: () => void;
  messages: Message[];
  editRoom: (roomName: string, password?: string) => void;
  editRoomSettings: (
    settings: Partial<RoomSettings> & { maxPlayers?: number },
  ) => void;
  // 拉密模式
  onRummyDraw: () => void;
  onRummySubmit: (submittedBoard: EquationGroup[], playedCardIds: string[]) => void;
  onSwapJoker: (handCardId: string, jokerCardId: string) => void;
  removePlayer: (playerId: string) => void;
  checkAnswerCorrect: boolean | null;
  isSymbolScoreAnimationFinished: boolean;
  selectedCardSymbols: SelectedCard[];
  selectedCardNumbers: SelectedCard[];
  onFinishedSymbolScoreAnimation: () => void;
  onUpdateScore: () => void;
  onSelectCardOrSymbol: ({
    number,
    symbol,
  }: {
    number?: NumberCard;
    symbol?: Symbol;
  }) => void;
  onDiscardCard: (cardId: string) => void;
  onPlayCard: () => void;
  onReselect: () => void;
  onDrawCard: () => void;
  currentPlayer?: Player;
  isYourTurn: boolean;
  onBack: () => void;
  isLastRound: boolean;
  countdown?: number;
  sendMessage: (message: string) => void;
  gameOverData: GameOverData | null;
  onCloseGameOver: () => void;
  gameAbortedData: GameAbortedData | null;
  addBot: (difficulty: 'easy' | 'normal' | 'hard') => void;
};
const MultiplePlayContext = createContext<MultiplePlayContextData | undefined>(
  undefined,
);

/**
 * 2. 建立 Provider 元件
 */
// 定義 Provider 元件 Props 的型別
type MultiplePlayProviderProps = {
  defaultCount?: number;
  children: React.ReactNode;
};
export function MultiplePlayProvider({ children }: MultiplePlayProviderProps) {
  // 答案是否正確
  const [checkAnswerCorrect, setCheckAnswerCorrect] = useState<boolean | null>(
    null,
  );

  const [roomInfo, setRoomInfo] = useState<Room>();
  const [playerId, setPlayerId] = useState<string>();
  const playerIdRef = useRef<string | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [remainRoundTime, setRemainRoundTime] = useState<{
    countdown: number;
    needDrawPlayerId: string;
  }>();
  const [gameOverData, setGameOverData] = useState<GameOverData | null>(null);
  const [gameAbortedData, setGameAbortedData] = useState<GameAbortedData | null>(null);
  const hadMeldedRef = useRef<boolean>(false);

  const {
    selectedCardSymbols,
    selectedCardNumbers,
    isSymbolScoreAnimationFinished,
    onFinishedSymbolScoreAnimation,
    resetAnimations,
    handlePlayCardResponse,
    markTurnStart,
  } = useGameActions(roomInfo, checkAnswerCorrect, setCheckAnswerCorrect);

  // 當前玩家
  const currentPlayer = useMemo(
    () => roomInfo?.players.find(p => p.id === playerId),
    [playerId, roomInfo?.players],
  );

  const isLastRound = useMemo(
    () =>
      roomInfo?.status === GameStatus.Playing && roomInfo?.deck.length === 0,
    [roomInfo?.deck.length, roomInfo?.status],
  );

  const isYourTurn = currentPlayer?.playerOrder === roomInfo?.currentOrder;

  const resetState = useCallback(() => {
    setCheckAnswerCorrect(null);
    resetAnimations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    socket.emit(SocketEvent.SearchRooms);
    console.log('????');

    socket.on(SocketEvent.ErrorMessage, message => {
      toast.error(message);
    });

    socket.on(SocketEvent.JoinRoomSuccess, (room: Room) => {
      setRoomInfo(room);
    });

    socket.on(SocketEvent.GetMessage, (message: Message) => {
      setMessages(state => [...state, message]);
    });

    socket.on(SocketEvent.GetPlayerId, (id: string) => {
      setPlayerId(id);
      playerIdRef.current = id;
    });

    socket.on(
      SocketEvent.RoomUpdate,
      ({
        room,
        extra,
      }: {
        room: Room;
        extra?: { event: SocketEvent; data: boolean };
      }) => {
        setRoomInfo(room);
        if (room.status === GameStatus.Playing && !room.isGameOver) {
          setGameOverData(null);
        }
        if (extra?.event === SocketEvent.UpdateScore) {
          resetState();
        }
        if (extra?.event === SocketEvent.PlayCardResponse) {
          handlePlayCardResponse(extra.data);
        }
        // 成就：拉密破冰（hasMelded 首次變 true）
        if (playerIdRef.current && !hadMeldedRef.current) {
          const me = room.players.find(p => p.id === playerIdRef.current);
          if (me?.hasMelded) {
            hadMeldedRef.current = true;
            unlockAchievement('rummy_meld');
          }
        }
      },
    );

    socket.on(SocketEvent.PlayerLeaveRoom, (playerName: string) => {
      toast.info(`${playerName} 已離開房間`);
    });

    socket.on(
      SocketEvent.CountdownTimeResponse,
      (res: { countdown: number; needDrawPlayerId: string }) => {
        setRemainRoundTime(res);
      },
    );

    socket.on(
      SocketEvent.GameOver,
      ({
        name,
        score,
        players,
        isPenaltyGameOver,
      }: {
        name: string;
        score: number;
        players: Player[];
        isPenaltyGameOver?: boolean;
      }) => {
        playSound('gameOverWin');
        setGameOverData({ name, score, players, isPenaltyGameOver });
        useStatsStore.getState().incrementMultiPlays();
        if (playerIdRef.current) {
          const isRummy = players.some(p => p.hasMelded !== undefined);
          if (isRummy) useStatsStore.getState().incrementRummyPlays();
          const winnerPlayer = players.find(p => p.name === name);
          if (winnerPlayer?.id === playerIdRef.current) {
            unlockAchievement('multiplayer_win');
            useStatsStore.getState().incrementMultiWins();
            if (isRummy) useStatsStore.getState().incrementRummyWins();
          }
        }
      },
    );

    socket.on(SocketEvent.GameAborted, (playerName: string) => {
      setGameAbortedData({ playerName });
    });
  }, [resetState]);

  useEffect(() => {
    if (isLastRound) {
      toast.warning('最後一回合囉');
    }
  }, [isLastRound]);

  const searchRooms = useCallback(
    (payload?: { roomName: string; showEmpty: boolean }) => {
      if (socket) {
        socket.emit(SocketEvent.SearchRooms, payload);
      }
    },
    [],
  );

  const joinRoom = useCallback(
    (
      playerName: string,
      roomId: string,
      roomName?: string,
      maxPlayers?: number,
      password?: string,
      gameType?: GameType,
      remainSeconds?: number | null,
    ) => {
      if (socket) {
        socket.emit(SocketEvent.JoinRoom, {
          playerName,
          roomId,
          roomName,
          maxPlayers,
          password,
          gameType,
          remainSeconds,
          mode: GameMode.Multiple,
        });
      }
    },
    [],
  );

  const onReadyGame = useCallback(() => {
    if (socket) {
      socket.emit(SocketEvent.ReadyGame, { roomId: roomInfo?.roomId });
    }
  }, [roomInfo?.roomId]);

  const onStartGame = useCallback(() => {
    if (socket) {
      socket.emit(SocketEvent.StartGame, { roomId: roomInfo?.roomId });
    }
  }, [roomInfo?.roomId]);

  const editRoom = useCallback(
    (roomName: string, password?: string) => {
      if (socket) {
        socket.emit(SocketEvent.EditRoomName, {
          roomId: roomInfo?.roomId,
          roomName,
          password,
        });
      }
    },
    [roomInfo?.roomId],
  );

  const editRoomSettings = useCallback(
    ({
      maxPlayers,
      deckType,
      remainSeconds,
      gameType,
      difficulty,
    }: Partial<RoomSettings> & { maxPlayers?: number }) => {
      if (socket) {
        socket.emit(SocketEvent.EditRoomSettings, {
          roomId: roomInfo?.roomId,
          maxPlayers,
          deckType,
          remainSeconds,
          gameType,
          difficulty,
        });
      }
    },
    [roomInfo?.roomId],
  );

  const removePlayer = useCallback(
    (playerId: string) => {
      if (socket) {
        socket.emit(SocketEvent.RemovePlayer, {
          roomId: roomInfo?.roomId,
          playerId,
        });
      }
    },
    [roomInfo?.roomId],
  );

  // 更新分數
  const onUpdateScore = useCallback(() => {
    if (roomInfo?.isGameOver || !isYourTurn) return;

    if (socket) {
      socket.emit(SocketEvent.UpdateScore, {
        roomId: roomInfo?.roomId,
      });
    }
  }, [roomInfo?.isGameOver, isYourTurn, roomInfo?.roomId]);

  // 選擇牌
  const onSelectCardOrSymbol = useCallback(
    ({ number, symbol }: { number?: NumberCard; symbol?: Symbol }) => {
      if (roomInfo?.isGameOver || !isYourTurn) return;

      playSound('select');
      if (socket) {
        socket.emit(SocketEvent.SelectCard, {
          roomId: roomInfo?.roomId,
          number,
          symbol,
        });
      }
    },
    [roomInfo?.isGameOver, isYourTurn, roomInfo?.roomId],
  );

  // 棄牌
  const onDiscardCard = useCallback(
    (cardId: string) => {
      if (roomInfo?.isGameOver) return;

      if (socket) {
        socket.emit(SocketEvent.DiscardCard, {
          roomId: roomInfo?.roomId,
          cardId,
        });
      }
    },
    [roomInfo?.isGameOver, roomInfo?.roomId],
  );

  // 出牌
  const onPlayCard = useCallback(() => {
    if (roomInfo?.isGameOver || !isYourTurn) return;

    if (roomInfo?.selectedCards.length === 0) {
      toast.warning('請組合算式');
      return;
    }

    if (socket) {
      socket.emit(SocketEvent.PlayCard, {
        roomId: roomInfo?.roomId,
      });
    }
  }, [
    roomInfo?.isGameOver,
    isYourTurn,
    roomInfo?.roomId,
    roomInfo?.selectedCards,
  ]);

  // 重選
  const onReselect = useCallback(() => {
    if (roomInfo?.isGameOver || !isYourTurn) return;

    if (socket) {
      socket.emit(SocketEvent.ReselectCard, {
        roomId: roomInfo?.roomId,
      });
    }
  }, [roomInfo?.isGameOver, roomInfo?.roomId, isYourTurn]);

  // 結束回合並抽牌
  const onDrawCard = useCallback(() => {
    if (roomInfo?.isGameOver || !isYourTurn || checkAnswerCorrect !== null)
      return;

    playSound('skip');
    useStatsStore.getState().incrementSkips();
    if (socket) {
      // 沒出過牌抽 1 張
      socket.emit(SocketEvent.DrawCard, {
        roomId: roomInfo?.roomId,
      });
    }
  }, [checkAnswerCorrect, isYourTurn, roomInfo?.isGameOver, roomInfo?.roomId]);

  // 退回鍵
  const onBack = useCallback(() => {
    if (roomInfo?.isGameOver || !isYourTurn) return;

    if (socket && roomInfo?.selectedCards.length) {
      socket.emit(SocketEvent.BackCard, {
        roomId: roomInfo?.roomId,
      });
    }
  }, [
    isYourTurn,
    roomInfo?.isGameOver,
    roomInfo?.roomId,
    roomInfo?.selectedCards.length,
  ]);

  const sendMessage = useCallback(
    (message: string) => {
      if (socket) {
        socket.emit(SocketEvent.SendMessage, {
          roomId: roomInfo?.roomId,
          message,
        });
      }
    },
    [roomInfo?.roomId],
  );

  const onCloseGameOver = useCallback(() => {
    setGameOverData(null);
  }, []);

  // 拉密：抽 1 張牌
  const onRummyDraw = useCallback(() => {
    if (roomInfo?.isGameOver || !isYourTurn) return;
    socket.emit(SocketEvent.RummyDrawCard, { roomId: roomInfo?.roomId });
  }, [isYourTurn, roomInfo?.isGameOver, roomInfo?.roomId]);

  // 拉密：提交桌面
  const onRummySubmit = useCallback(
    (submittedBoard: EquationGroup[], playedCardIds: string[]) => {
      if (roomInfo?.isGameOver || !isYourTurn) return;
      socket.emit(SocketEvent.RummySubmitTurn, {
        roomId: roomInfo?.roomId,
        submittedBoard,
        playedCardIds,
      });
    },
    [isYourTurn, roomInfo?.isGameOver, roomInfo?.roomId],
  );

  const addBot = useCallback(
    (difficulty: 'easy' | 'normal' | 'hard') => {
      if (!roomInfo?.roomId) return;
      socket.emit(SocketEvent.AddBotToRoom, { roomId: roomInfo.roomId, difficulty });
    },
    [roomInfo?.roomId],
  );

  // 拉密：換取桌面 Joker
  const onSwapJoker = useCallback(
    (handCardId: string, jokerCardId: string) => {
      if (roomInfo?.isGameOver || !isYourTurn) return;
      socket.emit(SocketEvent.RummySwapJoker, {
        roomId: roomInfo?.roomId,
        handCardId,
        jokerCardId,
      });
    },
    [isYourTurn, roomInfo?.isGameOver, roomInfo?.roomId],
  );

  useEffect(() => {
    if (
      remainRoundTime?.countdown === 0 &&
      remainRoundTime.needDrawPlayerId === playerId
    ) {
      if (roomInfo?.settings.gameType === 'rummy') {
        onRummyDraw();
      } else {
        onDrawCard();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDrawCard, onRummyDraw, playerId, remainRoundTime?.countdown, roomInfo?.settings.gameType]);

  const multiplePlayContextData: MultiplePlayContextData = useMemo(() => {
    return {
      searchRooms,
      joinRoom,
      socket,
      roomInfo,
      playerId,
      onReadyGame,
      onStartGame,
      messages,
      editRoom,
      editRoomSettings,
      removePlayer,
      checkAnswerCorrect,
      isSymbolScoreAnimationFinished,
      selectedCardSymbols,
      selectedCardNumbers,
      onFinishedSymbolScoreAnimation,
      onUpdateScore,
      onSelectCardOrSymbol,
      onDiscardCard,
      onPlayCard,
      onReselect,
      onDrawCard,
      currentPlayer,
      isYourTurn,
      onBack,
      isLastRound,
      countdown: remainRoundTime?.countdown,
      sendMessage,
      gameOverData,
      onCloseGameOver,
      gameAbortedData,
      onRummyDraw,
      onRummySubmit,
      onSwapJoker,
      addBot,
    };
  }, [
    checkAnswerCorrect,
    currentPlayer,
    editRoom,
    editRoomSettings,
    gameAbortedData,
    gameOverData,
    isLastRound,
    isSymbolScoreAnimationFinished,
    isYourTurn,
    joinRoom,
    messages,
    onBack,
    onCloseGameOver,
    onDiscardCard,
    onDrawCard,
    onFinishedSymbolScoreAnimation,
    onPlayCard,
    onReadyGame,
    onReselect,
    addBot,
    onRummyDraw,
    onRummySubmit,
    onSelectCardOrSymbol,
    onStartGame,
    onSwapJoker,
    onUpdateScore,
    playerId,
    remainRoundTime?.countdown,
    removePlayer,
    roomInfo,
    searchRooms,
    selectedCardNumbers,
    selectedCardSymbols,
    sendMessage,
  ]);

  return (
    <MultiplePlayContext.Provider value={multiplePlayContextData}>
      {/* 這裡用到 component composition 的優化技巧 */}
      {children}
    </MultiplePlayContext.Provider>
  );
}

/**
 * 3. 建立使用 Context 資料的 hook
 */
export function useMultiplePlay() {
  const multiplePlayContextData = useContext(MultiplePlayContext);

  // 確保 counterContext 不會是空的
  if (multiplePlayContextData === undefined) {
    throw new Error(
      'useMultiplePlay must be used within a MultiplePlayProvider',
    );
  }

  return multiplePlayContextData;
}
