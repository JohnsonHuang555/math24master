import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const useRoomSocket = () => {
  const [socket, setSocket] = useState<any>();

  useEffect(() => {
    const socket = io();
    setSocket(socket);
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('connect', () => {
        console.log(socket.id); // x8WIv7-mJelg7on_ALbx
      });

      socket.on('disconnect', () => {
        console.log(socket.id); // undefined
      });

      socket.on('hello', (arg: any) => {
        console.log(arg); // world
      });
    }
  }, [socket]);

  const createOrJoinRoom = async () => {
    if (!socket) return;
  };

  const getRooms = async () => {
    if (!socket) return;
  };

  return {
    socket,
    createOrJoinRoom,
    getRooms,
  };
};

export default useRoomSocket;
