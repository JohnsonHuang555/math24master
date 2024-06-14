import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import { GameMode } from '@/models/GameMode';
import { Message } from '@/models/Message';
import { Room } from '@/models/Room';
import { SocketEvent } from '@/models/SocketEvent';

const socket = io();

const useMultiplePlay = () => {
  const [roomInfo, setRoomInfo] = useState<Room>();
  const [playerId, setPlayerId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);

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

    // 房間更新
    socket.on(SocketEvent.RoomUpdate, (roomInfo: Room) => {
      setRoomInfo(roomInfo);
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

  return {
    searchRooms,
    joinRoom,
    socket,
    roomInfo,
    playerId,
    onReadyGame,
    onStartGame,
    messages,
  };
};

export default useMultiplePlay;
