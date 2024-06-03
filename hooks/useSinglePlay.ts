import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/components/ui/use-toast';
import { Room } from '@/models/Room';
import { SocketEvent } from '@/models/SocketEvent';
import { SelectedCard } from './useGame';

const useSinglePlay = () => {
  const [roomInfo, setRoomInfo] = useState<Room>();
  const [checkAnswerCorrect, setCheckAnswerCorrect] = useState<boolean | null>(
    null,
  );
  const { toast } = useToast();
  const [socket, setSocket] = useState<any>();

  useEffect(() => {
    const roomId = uuidv4();
    const socket = io();
    setSocket(socket);

    socket.emit(SocketEvent.JoinRoom, {
      roomId,
      maxPlayers: 1,
      playerName: 'guest',
    });

    socket.on(SocketEvent.JoinRoomSuccess, () => {
      // 遊戲開始
      socket.emit(SocketEvent.StartGame, { roomId });
    });

    socket.on(SocketEvent.ErrorMessage, message => {
      toast({ variant: 'destructive', title: message });
    });

    // 遊戲開始回傳
    socket.on(SocketEvent.StartGameSuccess, (roomInfo: Room) => {
      setRoomInfo(roomInfo);
    });

    // 房間更新
    socket.on(SocketEvent.RoomUpdate, (roomInfo: Room) => {
      setRoomInfo(roomInfo);
    });

    // 房間更新
    socket.on(SocketEvent.PlayCardResponse, (isCorrect: boolean) => {
      setCheckAnswerCorrect(isCorrect);
    });

    return () => {
      socket.disconnect();
    };
  }, [toast]);

  // 排序
  const onSort = () => {
    if (socket) {
      socket.emit(SocketEvent.SortCard, { roomId: roomInfo?.roomId });
    }
  };

  // 抽牌
  const drawCard = () => {
    if (socket) {
      socket.emit(SocketEvent.DrawCard, { roomId: roomInfo?.roomId });
    }
  };

  // 棄牌
  const discardCard = (cardId: string) => {
    if (socket) {
      socket.emit(SocketEvent.DiscardCard, {
        roomId: roomInfo?.roomId,
        cardId,
      });
    }
  };

  // 出牌
  const playCard = (selectedCards: SelectedCard[]) => {
    if (selectedCards.length === 0) {
      toast({ title: '請組合算式', className: 'bg-amber-300' });
      return;
    }

    if (socket) {
      socket.emit(SocketEvent.PlayCard, {
        roomId: roomInfo?.roomId,
        selectedCards,
      });
    }
  };

  const resetAnswer = () => {
    setCheckAnswerCorrect(null);
  };

  return {
    roomInfo,
    onSort,
    playCard,
    drawCard,
    discardCard,
    checkAnswerCorrect,
    resetAnswer,
  };
};

export default useSinglePlay;
