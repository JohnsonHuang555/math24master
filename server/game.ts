import { Room } from '../models/Room';
import { createDeck, draw, shuffleArray } from './utils';

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

const _getCurrentRoomIndex = (roomId: string) => {
  const roomIndex = _rooms.findIndex(room => room.roomId === roomId);
  return roomIndex;
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
  playerName: string,
) {
  try {
    _playerInRoomMap[playerId] = payload.roomId;

    const room = _getCurrentRoom(payload.roomId);
    if (room) {
      // 房間已存在
      _rooms = [
        {
          roomId: payload.roomId,
          maxPlayers: payload.maxPlayers,
          deck: [],
          currentIndex: -1,
          players: [
            ...(room.players || []),
            {
              id: playerId,
              isMaster: false,
              name: playerName,
              handCard: [],
              score: 0,
            },
          ],
        },
      ];
    } else {
      _rooms = [
        ..._rooms,
        {
          roomId: payload.roomId,
          maxPlayers: payload.maxPlayers,
          deck: [],
          currentIndex: -1,
          players: [
            {
              id: playerId,
              isMaster: true,
              name: playerName,
              handCard: [],
              score: 0,
            },
          ],
        },
      ];
    }

    return true;
  } catch (error) {
    return false;
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

export function startGame(roomId: string) {
  const room = _getCurrentRoom(roomId);
  if (!room) return false;

  try {
    let deck: number[] = [];

    switch (room.maxPlayers) {
      case 1:
        deck = createDeck(2);
        break;
      case 2:
        deck = createDeck(4);
        break;
      case 3:
        deck = createDeck(6);
        break;
      case 4:
        deck = createDeck(8);
        break;
      default:
        return false;
    }

    // 洗牌
    const shuffledDeck = shuffleArray(deck);
    const roomIndex = _getCurrentRoomIndex(roomId);

    // [1,2,3,4...]
    const playerOrders = Array.from(Array(room.players.length).keys()).map(
      i => i + 1,
    );

    // 隨機玩家順序
    const shuffledPlayerOrder = shuffleArray(playerOrders);
    if (shuffledPlayerOrder.length !== room.players.length) return false;

    shuffledPlayerOrder.forEach((order, index) => {
      _rooms[roomIndex].players[index].playerOrder = order;
      _rooms[roomIndex].players[index].score = 0;
      if (shuffledDeck.length) {
        // 抽牌並改變牌庫牌數
        _rooms[roomIndex].players[index].handCard = draw(shuffledDeck, 5);
      }
    });

    // 寫入牌庫
    _rooms[roomIndex].deck = shuffledDeck;
    // 從玩家1開始
    _rooms[roomIndex].currentIndex = 1;

    return _rooms[roomIndex];
  } catch (error) {
    console.log(error);
    return false;
  }
}
