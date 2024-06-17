import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import { GameMode } from '@/models/GameMode';
import { Message } from '@/models/Message';
import { NumberCard } from '@/models/Player';
import { Room } from '@/models/Room';
import { SocketEvent } from '@/models/SocketEvent';
import { Symbol } from '@/models/Symbol';

const socket = io();

const useMultiplePlay = () => {
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

  const onReadyGame = useCallback((roomId: string) => {
    if (socket.connected) {
      socket.emit(SocketEvent.ReadyGame, { roomId });
    }
  }, []);

  const onStartGame = useCallback((roomId: string) => {
    if (socket.connected) {
      socket.emit(SocketEvent.StartGame, { roomId });
    }
  }, []);

  const editRoomName = useCallback((roomId: string, roomName: string) => {
    if (socket.connected) {
      socket.emit(SocketEvent.EditRoomName, { roomId, roomName });
    }
  }, []);

  const editMaxPlayers = useCallback((roomId: string, maxPlayers: number) => {
    if (socket.connected) {
      socket.emit(SocketEvent.EditMaxPlayers, { roomId, maxPlayers });
    }
  }, []);

  const removePlayer = useCallback((roomId: string, playerId: string) => {
    if (socket.connected) {
      socket.emit(SocketEvent.RemovePlayer, { roomId, playerId });
    }
  }, []);

  // 更新分數並抽牌
  const updateScore = () => {
    if (isGameOver) return;

    if (socket.connected) {
      // 重置狀態
      setCheckAnswerCorrect(null);
      setFinishedAnimations(0);

      socket.emit(SocketEvent.UpdateScore, {
        roomId: roomInfo?.roomId,
      });
    }
  };

  const onFinishedAnimations = () => {
    setFinishedAnimations(state => state + 1);
  };

  const onSelectCardOrSymbol = ({
    number,
    symbol,
  }: {
    number?: NumberCard;
    symbol?: Symbol;
  }) => {
    if (isGameOver) return;

    if (socket.connected) {
      socket.emit(SocketEvent.SelectCard, {
        roomId: roomInfo?.roomId,
        number,
        symbol,
      });
    }
  };

  // 棄牌
  const discardCard = (cardId: string) => {
    if (isGameOver) return;

    if (socket.connected) {
      socket.emit(SocketEvent.DiscardCard, {
        roomId: roomInfo?.roomId,
        cardId,
      });
    }
  };

  // 出牌
  const playCard = () => {
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
  };

  // 重選
  const onReselect = () => {
    if (isGameOver) return;

    if (socket.connected) {
      socket.emit(SocketEvent.ReselectCard, {
        roomId: roomInfo?.roomId,
      });
    }
  };

  // 排序
  const onSort = () => {
    if (isGameOver) return;

    if (socket.connected) {
      socket.emit(SocketEvent.SortCard, { roomId: roomInfo?.roomId });
    }
  };

  // 抽牌
  const drawCard = () => {
    if (isGameOver) return;

    if (socket.connected) {
      // 沒出過牌抽 1 張，反之抽出過牌的數量
      socket.emit(SocketEvent.DrawCard, {
        roomId: roomInfo?.roomId,
        count: playedCard === 0 ? 1 : playedCard,
      });
      setPlayedCard(0);
    }
  };

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
};

export default useMultiplePlay;
