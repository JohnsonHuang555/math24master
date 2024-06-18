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
import { Message } from '@/models/Message';
import { NumberCard } from '@/models/Player';
import { Room } from '@/models/Room';
import { SelectedCard } from '@/models/SelectedCard';
import { SocketEvent } from '@/models/SocketEvent';
import { Symbol } from '@/models/Symbol';

const socket = io();

/**
 * 1. 建立 Context
 */
// 定義 Context 中 value 的型別
type MultiplePlayContextData = {
  searchRooms: (roomName: string) => void;
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
  editRoomName: (roomName: string) => void;
  editMaxPlayers: (maxPlayers: number) => void;
  removePlayer: (playerId: string) => void;
  isGameOver: boolean;
  checkAnswerCorrect: boolean | null;
  isAnimationFinished: boolean;
  selectedCardSymbols: SelectedCard[];
  selectedCardNumbers: SelectedCard[];
  onFinishedAnimations: () => void;
  updateScore: () => void;
  onSelectCardOrSymbol: ({
    number,
    symbol,
  }: {
    number?: NumberCard;
    symbol?: Symbol;
  }) => void;
  discardCard: (cardId: string) => void;
  playCard: () => void;
  onReselect: () => void;
  onSort: () => void;
  drawCard: () => void;
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
  const [roomInfo, setRoomInfo] = useState<Room>();
  const [playerId, setPlayerId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);

  // 動畫完成時
  const [finishedAnimations, setFinishedAnimations] = useState<number>(0);

  // 答案是否正確
  const [checkAnswerCorrect, setCheckAnswerCorrect] = useState<boolean | null>(
    null,
  );

  // 出過牌的數量
  const [playedCard, setPlayedCard] = useState(0);

  const isGameOver = useMemo(
    () => !!roomInfo?.isGameOver,
    [roomInfo?.isGameOver],
  );

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

  useEffect(() => {
    console.log('init');
    socket.emit(SocketEvent.SearchRooms, '');

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

    // 遊戲開始回傳
    socket.on(SocketEvent.StartGameSuccess, (roomInfo: Room) => {
      setRoomInfo(roomInfo);
    });

    // 房間更新
    socket.on(SocketEvent.RoomUpdate, (roomInfo: Room) => {
      setRoomInfo(roomInfo);
    });

    // 檢查答案
    socket.on(SocketEvent.PlayCardResponse, (isCorrect: boolean) => {
      setCheckAnswerCorrect(isCorrect);
    });
  }, []);

  const searchRooms = useCallback((roomName: string) => {
    if (socket.connected) {
      socket.emit(SocketEvent.SearchRooms, roomName);
    }
  }, []);

  const joinRoom = useCallback(
    (
      playerName: string,
      roomId: string,
      roomName?: string,
      maxPlayers?: number,
      password?: string,
    ) => {
      if (socket.connected) {
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
    if (socket.connected) {
      socket.emit(SocketEvent.ReadyGame, { roomId: roomInfo?.roomId });
    }
  }, [roomInfo?.roomId]);

  const onStartGame = useCallback(() => {
    if (socket.connected) {
      socket.emit(SocketEvent.StartGame, { roomId: roomInfo?.roomId });
    }
  }, [roomInfo?.roomId]);

  const editRoomName = useCallback(
    (roomName: string) => {
      if (socket.connected) {
        socket.emit(SocketEvent.EditRoomName, {
          roomId: roomInfo?.roomId,
          roomName,
        });
      }
    },
    [roomInfo?.roomId],
  );

  const editMaxPlayers = useCallback(
    (maxPlayers: number) => {
      if (socket.connected) {
        socket.emit(SocketEvent.EditMaxPlayers, {
          roomId: roomInfo?.roomId,
          maxPlayers,
        });
      }
    },
    [roomInfo?.roomId],
  );

  const removePlayer = useCallback(
    (playerId: string) => {
      if (socket.connected) {
        socket.emit(SocketEvent.RemovePlayer, {
          roomId: roomInfo?.roomId,
          playerId,
        });
      }
    },
    [roomInfo?.roomId],
  );

  // 更新分數並抽牌
  const updateScore = useCallback(() => {
    if (isGameOver) return;

    if (socket.connected) {
      // 重置狀態
      setCheckAnswerCorrect(null);
      setFinishedAnimations(0);

      socket.emit(SocketEvent.UpdateScore, {
        roomId: roomInfo?.roomId,
      });
    }
  }, [isGameOver, roomInfo?.roomId]);

  const onFinishedAnimations = () => {
    setFinishedAnimations(state => state + 1);
  };

  const onSelectCardOrSymbol = useCallback(
    ({ number, symbol }: { number?: NumberCard; symbol?: Symbol }) => {
      if (isGameOver) return;

      if (socket.connected) {
        socket.emit(SocketEvent.SelectCard, {
          roomId: roomInfo?.roomId,
          number,
          symbol,
        });
      }
    },
    [isGameOver, roomInfo?.roomId],
  );

  // 棄牌
  const discardCard = useCallback(
    (cardId: string) => {
      if (isGameOver) return;

      if (socket.connected) {
        socket.emit(SocketEvent.DiscardCard, {
          roomId: roomInfo?.roomId,
          cardId,
        });
      }
    },
    [isGameOver, roomInfo?.roomId],
  );

  // 出牌
  const playCard = useCallback(() => {
    if (isGameOver) return;

    if (roomInfo?.selectedCards.length === 0) {
      toast.warning('請組合算式');
      return;
    }

    if (socket.connected) {
      const usedCardCount =
        roomInfo?.selectedCards.filter(c => c.number).length || 0;
      setPlayedCard(state => state + usedCardCount);

      socket.emit(SocketEvent.PlayCard, {
        roomId: roomInfo?.roomId,
      });
    }
  }, [isGameOver, roomInfo?.roomId, roomInfo?.selectedCards]);

  // 重選
  const onReselect = useCallback(() => {
    if (isGameOver) return;

    if (socket.connected) {
      socket.emit(SocketEvent.ReselectCard, {
        roomId: roomInfo?.roomId,
      });
    }
  }, [isGameOver, roomInfo?.roomId]);

  // 排序
  const onSort = useCallback(() => {
    if (isGameOver) return;

    if (socket.connected) {
      socket.emit(SocketEvent.SortCard, { roomId: roomInfo?.roomId });
    }
  }, [isGameOver, roomInfo?.roomId]);

  // 抽牌
  const drawCard = useCallback(() => {
    if (isGameOver) return;

    if (socket.connected) {
      // 沒出過牌抽 1 張，反之抽出過牌的數量
      socket.emit(SocketEvent.DrawCard, {
        roomId: roomInfo?.roomId,
        count: playedCard === 0 ? 1 : playedCard,
      });
      setPlayedCard(0);
    }
  }, [isGameOver, playedCard, roomInfo?.roomId]);

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
      editRoomName,
      editMaxPlayers,
      removePlayer,
      isGameOver,
      checkAnswerCorrect,
      isAnimationFinished:
        checkAnswerCorrect === true &&
        finishedAnimations === selectedCardSymbols?.length,
      selectedCardSymbols: selectedCardSymbols || [],
      selectedCardNumbers: selectedCardNumbers || [],
      onFinishedAnimations,
      updateScore,
      onSelectCardOrSymbol,
      discardCard,
      playCard,
      onReselect,
      onSort,
      drawCard,
    };
  }, [
    checkAnswerCorrect,
    discardCard,
    drawCard,
    editMaxPlayers,
    editRoomName,
    finishedAnimations,
    isGameOver,
    joinRoom,
    messages,
    onReadyGame,
    onReselect,
    onSelectCardOrSymbol,
    onSort,
    onStartGame,
    playCard,
    playerId,
    removePlayer,
    roomInfo,
    searchRooms,
    selectedCardNumbers,
    selectedCardSymbols,
    updateScore,
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