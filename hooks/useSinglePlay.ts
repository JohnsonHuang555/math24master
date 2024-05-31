import { useEffect, useState } from 'react';
import { generate } from 'short-uuid';
import { io } from 'socket.io-client';
import { useToast } from '@/components/ui/use-toast';
import { Room } from '@/models/Room';
import { SocketEvent } from '@/models/SocketEvent';

const useSinglePlay = () => {
  const [roomInfo, setRoomInfo] = useState<Room>();
  const { toast } = useToast();
  const [socket, setSocket] = useState<any>();

  useEffect(() => {
    const roomId = generate();
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

    return () => {
      socket.disconnect();
    };
  }, [toast]);

  return {
    roomInfo,
  };
};

export default useSinglePlay;
