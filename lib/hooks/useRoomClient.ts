import { useEffect, useState } from 'react';
import { Client } from 'colyseus.js';

const useRoomClient = () => {
  const [client, setClient] = useState<Client>();

  useEffect(() => {
    const client = new Client('ws://localhost:2567');
    console.log('init')
    setClient(client);
  }, []);

  const createOrJoinRoom = async () => {
    if (!client) return;
    const room = await client.joinOrCreate('my_room');
    return room.id;
  };

  const getRooms = async () => {
    if (!client) return;
    const rooms = await client.getAvailableRooms();
    return rooms;
  };

  return {
    client,
    createOrJoinRoom,
    getRooms,
  };
};

export default useRoomClient;
