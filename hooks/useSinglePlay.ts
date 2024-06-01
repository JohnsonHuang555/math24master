import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/components/ui/use-toast';
import { Room } from '@/models/Room';
import { SocketEvent } from '@/models/SocketEvent';

const useSinglePlay = () => {
  const [roomInfo, setRoomInfo] = useState<Room>();
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

    return () => {
      socket.disconnect();
    };
  }, [toast]);

  const onSort = () => {
    if (socket) {
      socket.emit(SocketEvent.SortCard, { roomId: roomInfo?.roomId });
    }
  };

  return {
    roomInfo,
    onSort,
  };
};

export default useSinglePlay;
