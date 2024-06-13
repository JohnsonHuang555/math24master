import { useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import { GameMode } from '@/models/GameMode';
import { SocketEvent } from '@/models/SocketEvent';

const socket = io();

const useMultiplePlay = () => {
  useEffect(() => {
    socket.emit(SocketEvent.SearchRooms, '');

    socket.on(SocketEvent.ErrorMessage, message => {
      toast.error(message);
    });
  }, []);

  const searchRooms = useCallback((roomName: string) => {
    if (socket) {
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

  return { searchRooms, joinRoom, socket };
};

export default useMultiplePlay;
