'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import { GameMode } from '@/models/GameMode';
import { GameStatus } from '@/models/GameStatus';
import { Message } from '@/models/Message';
import { NumberCard, Player } from '@/models/Player';
import { Room, RoomSettings } from '@/models/Room';
import { SelectedCard } from '@/models/SelectedCard';
import { SocketEvent } from '@/models/SocketEvent';
import { Symbol } from '@/models/Symbol';

const socket = io();

/**
 * 1. 建立 Context
 */
// 定義 Context 中 value 的型別
type MultiplePlayContextData = {
  searchRooms: (payload?: { roomName: string; showEmpty: boolean }) => void;
  joinRoom: (
    playerName: string,
    roomId: string,
    roomName?: string,
    maxPlayers?: number,
    password?: string,
  ) => void;
  socket: any;
  roomInfo?: Room;
  playerId?: string;
  onReadyGame: () => void;
  onStartGame: () => void;
  messages: Message[];
  editRoom: (roomName: string, password?: string) => void;
  editRoomSettings: (
    settings: Partial<RoomSettings> & { maxPlayers?: number },
  ) => void;
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
  // 動畫完成時
  const [finishedAnimations, setFinishedAnimations] = useState<number>(0);

  const [roomInfo, setRoomInfo] = useState<Room>();
  const [playerId, setPlayerId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [remainRoundTime, setRemainRoundTime] = useState<{
    countdown: number;
    needDrawPlayerId: string;
  }>();

  // 已選的符號牌
  const selectedCardSymbols = useMemo(() => {
    return roomInfo?.selectedCards.filter(
      c =>
        c.symbol &&
        [Symbol.Plus, Symbol.Minus, Symbol.Times, Symbol.Divide].includes(
          c.symbol,
        ),
    );
  }, [roomInfo?.selectedCards]);

  // 已選的數字牌
  const selectedCardNumbers = useMemo(() => {
    return roomInfo?.selectedCards.filter(c => c.number);
  }, [roomInfo?.selectedCards]);

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
    setFinishedAnimations(0);
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

    socket.on(SocketEvent.GetPlayerId, (playerId: string) => {
      setPlayerId(playerId);
    });

    socket.on(
      SocketEvent.RoomUpdate,
      ({
        room,
        extra,
      }: {
        room: Room;
        extra?: { event: SocketEvent; data: any };
      }) => {
        setRoomInfo(room);
        // 重置狀態
        if (extra?.event === SocketEvent.UpdateScore) {
          resetState();
        }
        if (extra?.event === SocketEvent.PlayCardResponse) {
          if (extra.data) {
            toast.success('答案正確');
          } else {
            toast.error('答案不等於 24');
          }
          setCheckAnswerCorrect(extra.data as boolean);
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
      ({ name, score }: { name: string; score: number }) => {
        toast.success(`恭喜 ${name} 獲得 ${score} 分，贏得勝利！`);
      },
    );
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
    ) => {
      if (socket) {
        socket.emit(SocketEvent.JoinRoom, {
          playerName,
          roomId,
          roomName,
          maxPlayers,
          password,
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
    }: Partial<RoomSettings> & { maxPlayers?: number }) => {
      if (socket) {
        socket.emit(SocketEvent.EditRoomSettings, {
          roomId: roomInfo?.roomId,
          maxPlayers,
          deckType,
          remainSeconds,
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

  useEffect(() => {
    if (
      remainRoundTime?.countdown === 0 &&
      remainRoundTime.needDrawPlayerId === playerId
    ) {
      onDrawCard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDrawCard, playerId, remainRoundTime?.countdown]);

  const onFinishedSymbolScoreAnimation = () => {
    setFinishedAnimations(state => state + 1);
  };

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
      isSymbolScoreAnimationFinished:
        checkAnswerCorrect === true &&
        finishedAnimations === selectedCardSymbols?.length,
      selectedCardSymbols: selectedCardSymbols || [],
      selectedCardNumbers: selectedCardNumbers || [],
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
    };
  }, [
    checkAnswerCorrect,
    currentPlayer,
    editRoom,
    editRoomSettings,
    finishedAnimations,
    isLastRound,
    isYourTurn,
    joinRoom,
    messages,
    onBack,
    onDiscardCard,
    onDrawCard,
    onPlayCard,
    onReadyGame,
    onReselect,
    onSelectCardOrSymbol,
    onStartGame,
    playerId,
    remainRoundTime?.countdown,
    removePlayer,
    roomInfo,
    searchRooms,
    selectedCardNumbers,
    selectedCardSymbols,
    sendMessage,
    onUpdateScore,
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
