import { useEffect, useState } from 'react';
import { generate } from 'short-uuid';
import { io } from 'socket.io-client';
import { SocketEvent } from '@/models/SocketEvent';

const useSinglePlay = () => {
  useEffect(() => {
    const roomId = generate();
    const socket = io();

    socket.emit(SocketEvent.JoinRoom, { roomId: '1', maxPlayers: 5 });
    socket.on(SocketEvent.JoinRoomMessage, message => {
      console.log(message);
    });
    socket.on(SocketEvent.ErrorMessage, message => {
      console.log(message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return {};
};

export default useSinglePlay;
