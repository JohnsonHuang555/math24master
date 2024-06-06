import { evaluate } from 'mathjs';
import { v4 as uuidv4 } from 'uuid';
import { SelectedCard } from '../hooks/useSinglePlay';
import { NumberCard, Player } from '../models/Player';
import { HAND_CARD_COUNT, MAX_CARD_COUNT, Room } from '../models/Room';
import { Symbol } from '../models/Symbol';
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

const _getCurrentPlayer = (players: Player[], playerId: string) => {
  const player = players.find(player => player.id === playerId);
  return player;
};

const _getCurrentRoomIndex = (roomId: string) => {
  const roomIndex = _rooms.findIndex(room => room.roomId === roomId);
  return roomIndex;
};

const _getCurrentPlayerIndex = (players: Player[], playerId: string) => {
  const playerIndex = players.findIndex(player => player.id === playerId);
  return playerIndex;
};

const _nextPlayerTurn = (roomIndex: number) => {
  const activePlayer = _rooms[roomIndex].currentIndex;
  const playerCount = _rooms[roomIndex].players.length;
  const nextPlayer = activePlayer + 1;
  if (nextPlayer < playerCount) {
    _rooms[roomIndex].currentIndex = nextPlayer;
  } else {
    // 回到第一個玩家
    _rooms[roomIndex].currentIndex = 0;
  }
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
    let tempDeck: number[] = [];

    switch (room.maxPlayers) {
      case 1:
        tempDeck = createDeck(2);
        break;
      case 2:
        tempDeck = createDeck(4);
        break;
      case 3:
        tempDeck = createDeck(6);
        break;
      case 4:
        tempDeck = createDeck(8);
        break;
      default:
        return false;
    }

    // 洗牌
    const shuffledDeck: NumberCard[] = shuffleArray(tempDeck).map(d => ({
      id: uuidv4(),
      value: d,
    }));
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
        _rooms[roomIndex].players[index].handCard = draw(
          shuffledDeck,
          HAND_CARD_COUNT,
        );
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

export function sortCard(roomId: string, playerId: string) {
  const roomIndex = _getCurrentRoomIndex(roomId);
  if (roomIndex === -1) return;

  const playerIndex = _getCurrentPlayerIndex(
    _rooms[roomIndex].players,
    playerId,
  );
  if (playerIndex === -1) return;

  // 使用 sort 方法將陣列排序
  const sortedArray = _rooms[roomIndex].players[playerIndex].handCard.sort(
    (a, b) => a.value - b.value,
  );
  _rooms[roomIndex].players[playerIndex].handCard = sortedArray;

  return _rooms[roomIndex];
}

export function drawCard(roomId: string, playerId: string) {
  const roomIndex = _getCurrentRoomIndex(roomId);
  if (roomIndex === -1) return;

  const playerIndex = _getCurrentPlayerIndex(
    _rooms[roomIndex].players,
    playerId,
  );
  if (playerIndex === -1) return;

  const currentHandCardsCount =
    _rooms[roomIndex].players[playerIndex].handCard.length;
  if (currentHandCardsCount > MAX_CARD_COUNT) return;

  // 抽到的牌
  const newCard = _rooms[roomIndex].deck[_rooms[roomIndex].deck.length - 1];
  _rooms[roomIndex].deck.pop();
  _rooms[roomIndex].players[playerIndex].handCard.push(newCard);

  // 切換下一位玩家
  _nextPlayerTurn(roomIndex);

  return _rooms[roomIndex];
}

export function discardCard(roomId: string, playerId: string, cardId: string) {
  const roomIndex = _getCurrentRoomIndex(roomId);
  if (roomIndex === -1) return;

  const playerIndex = _getCurrentPlayerIndex(
    _rooms[roomIndex].players,
    playerId,
  );
  if (playerIndex === -1) return;

  const newCards = _rooms[roomIndex].players[playerIndex].handCard.filter(
    c => c.id !== cardId,
  );
  _rooms[roomIndex].players[playerIndex].handCard = newCards;

  return _rooms[roomIndex];
}

export function playCard(
  roomId: string,
  playerId: string,
  selectedCards: SelectedCard[],
): { isCorrect: boolean; room?: Room } | undefined {
  const roomIndex = _getCurrentRoomIndex(roomId);
  if (roomIndex === -1) return;

  const playerIndex = _getCurrentPlayerIndex(
    _rooms[roomIndex].players,
    playerId,
  );
  if (playerIndex === -1) return;

  const expression = selectedCards.map(s => {
    if (s.number) {
      return s.number.value;
    }
    if (s.symbol) {
      return s.symbol;
    }
  });

  try {
    const answer = evaluate(expression.join(''));

    if (answer === 24) {
      // 使用的數字牌
      const numberCards = selectedCards
        .filter(c => c.number)
        .map(c => c.number?.id);

      // 移除數字牌
      const newCards = _rooms[roomIndex].players[playerIndex].handCard.filter(
        c => !numberCards.includes(c.id),
      );
      _rooms[roomIndex].players[playerIndex].handCard = newCards;

      return {
        isCorrect: true,
        room: _rooms[roomIndex],
      };
    }
    return {
      isCorrect: false,
    };
  } catch (error) {
    return {
      isCorrect: false,
    };
  }
}

export function updateAndDraw(
  roomId: string,
  playerId: string,
  selectedCards: SelectedCard[],
) {
  const roomIndex = _getCurrentRoomIndex(roomId);
  if (roomIndex === -1) return;

  const playerIndex = _getCurrentPlayerIndex(
    _rooms[roomIndex].players,
    playerId,
  );
  if (playerIndex === -1) return;

  // 使用的數字牌
  const numberCards = selectedCards
    .filter(c => c.number)
    .map(c => c.number?.id);

  const newCards = _rooms[roomIndex].players[playerIndex].handCard.filter(
    c => !numberCards.includes(c.id),
  );

  // 補牌 -假設剩餘牌庫不夠補的話就直接抽完剩下的
  if (_rooms[roomIndex].deck.length < numberCards.length) {
    _rooms[roomIndex].players[playerIndex].handCard = [
      ...newCards,
      ..._rooms[roomIndex].deck,
    ];
  } else {
    _rooms[roomIndex].players[playerIndex].handCard = [
      ...newCards,
      ...draw(_rooms[roomIndex].deck, numberCards.length),
    ];
  }

  // 計算分數
  let score = 0;
  // +, - 各加一分
  const plusAndMinusCount =
    selectedCards.filter(
      c => c.symbol && [Symbol.Plus, Symbol.Minus].includes(c.symbol),
    ).length || 0;
  score += plusAndMinusCount;

  // *, / 各加兩分
  const timesCount =
    selectedCards.filter(c => c.symbol === Symbol.Times).length || 0;
  const timesDivideCount =
    selectedCards.filter(c => c.symbol === Symbol.Divide).length || 0;
  score += timesCount * 2;
  score += timesDivideCount * 2;

  // 如果有兩個 * 額外加一分
  if (timesCount >= 2) {
    score += 1;
  }

  // 如果有兩個 / 額外加一分
  if (timesDivideCount >= 2) {
    score += 2;
  }

  // 用到四張數字牌 額外加一分
  if (numberCards.length === 4) {
    score += 1;
  }

  // 用到五張數字牌 額外加兩分
  if (numberCards.length === 5) {
    score += 2;
  }

  // 寫入暫存分數
  _rooms[roomIndex].players[playerIndex].score += score;

  // 切換下一位玩家
  _nextPlayerTurn(roomIndex);

  return _rooms[roomIndex];
}
