import { useEffect, useState } from 'react';
import { generate } from 'short-uuid';
import { io } from 'socket.io-client';
import { Room } from '@/models/Room';
import { SocketEvent } from '@/models/SocketEvent';

const useSinglePlay = () => {
  const [roomInfo, setRoomInfo] = useState<Room>();
  console.log(roomInfo);

  useEffect(() => {
    const roomId = generate();
    const socket = io();

    socket.emit(SocketEvent.JoinRoom, {
      roomId,
      maxPlayers: 1,
      playerName: 'guest',
    });

    socket.on(SocketEvent.JoinRoomSuccess, () => {
      // 遊戲開始
      socket.emit(SocketEvent.StartGame, { roomId });
    });

    socket.on(SocketEvent.ErrorMessage, (roomInfo: Room) => {
      setRoomInfo(roomInfo);
    });

    // 遊戲開始回傳
    socket.on(SocketEvent.StartGameSuccess, message => {
      console.log(message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return {};
};

export default useSinglePlay;
