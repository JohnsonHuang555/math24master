import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import { GameMode } from '@/models/GameMode';
import { Room } from '@/models/Room';
import { SocketEvent } from '@/models/SocketEvent';

const useMultiplePlay = () => {
  const [socket, setSocket] = useState<any>();
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    const socket = io();
    setSocket(socket);

    socket.emit(SocketEvent.SearchRooms, '');

    socket.on(SocketEvent.ErrorMessage, message => {
      toast.error(message);
    });

    socket.on(SocketEvent.GetRoomsResponse, (r: Room[]) => {
      console.log(r);
      setRooms(r || []);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const searchRooms = (roomName: string) => {
    if (socket) {
      socket.emit(SocketEvent.SearchRooms, roomName);
    }
  };

  const joinRoom = (
    playerName: string,
    roomId: string,
    roomName: string,
    maxPlayers: number,
    password: string,
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
  };

  return { rooms, searchRooms, joinRoom };
};

export default useMultiplePlay;
