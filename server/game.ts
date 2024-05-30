import { Room } from '../models/Room';

// 所有房間資訊
let _rooms: Room[] = [];
// 玩家在房間資訊
const _playerInRoomMap: { [key: string]: string } = {};

export function getCurrentRooms() {
  return _rooms;
}

const _getCurrentRoom = (roomId: string) => {
  const room = _rooms.find(room => room.roomId === roomId);
  return room;
};

export function checkCanJoinRoom(roomId: string, playerId: string) {
  const room = _getCurrentRoom(roomId);
  if (room) {
    // 人數已滿
    if (room.maxPlayers === room.players.length) return false;

    const player = room.players.find(player => player.id === playerId);
    // 玩家已存在
    if (player) return false;

    return true;
  }

  return true;
}

export function joinRoom(
  payload: Pick<Room, 'roomId' | 'maxPlayers'>,
  playerId: string,
) {
  _playerInRoomMap[playerId] = payload.roomId;

  const room = _getCurrentRoom(payload.roomId);
  if (room) {
    // 房間已存在
    _rooms = [
      {
        roomId: payload.roomId,
        maxPlayers: payload.maxPlayers,
        players: [...(room.players || []), { id: playerId, isMaster: false }],
      },
    ];
  } else {
    _rooms = [
      ..._rooms,
      {
        roomId: payload.roomId,
        maxPlayers: payload.maxPlayers,
        players: [{ id: playerId, isMaster: true }],
      },
    ];
  }
}

export function leaveRoom(playerId: string) {
  const roomId = _playerInRoomMap[playerId];
  const room = _getCurrentRoom(roomId);
  // 找不到房間
  if (!room || !roomId) return;

  // 房間剩下最後一人直接移除房間
  if (room.players.length === 1) {
    _rooms = _rooms.filter(room => room.roomId !== roomId);
  } else {
    const newPlayers = room.players.filter(player => player.id !== playerId);
    const hasMaster = newPlayers.find(player => player.isMaster);

    if (!hasMaster) {
      newPlayers[0].isMaster = true;
    }

    _rooms = _rooms.map(room => {
      if (room.roomId === roomId) {
        return {
          ...room,
          players: newPlayers,
        };
      }
      return room;
    });
  }
}
