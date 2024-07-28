import { v4 as uuidv4 } from 'uuid';
import { calculateAnswer, calculateNumbersScore } from '../lib/utils';
import { GameMode } from '../models/GameMode';
import { GameStatus } from '../models/GameStatus';
import { NumberCard, Player } from '../models/Player';
import { DeckType, HAND_CARD_COUNT, Room } from '../models/Room';
import { Symbol } from '../models/Symbol';
import {
  createDeckByRandomMode,
  createDeckByStandardMode,
  draw,
  shuffleArray,
} from './utils';

type Response = {
  msg?: string;
  room?: Room;
};

// 所有房間資訊
let _rooms: Room[] = [];
// 玩家在房間資訊
const _playerInRoomMap: { [key: string]: string } = {};

// 取得當前房間 需濾掉單人遊戲
export function getCurrentRooms(payload?: {
  roomName: string;
  showEmpty: boolean;
}) {
  let tempRooms = _rooms;
  // 依房名篩選
  if (payload?.roomName) {
    tempRooms = _rooms.filter(r => r?.roomName === payload?.roomName);
  }
  if (payload?.showEmpty) {
    tempRooms = _rooms.filter(r => r?.maxPlayers > r.players.length);
  }
  return tempRooms.filter(r => r.maxPlayers > 1);
}

const _getCurrentRoom = (roomId: string) => {
  const room = _rooms.find(room => room.roomId === roomId);
  return room;
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
  const activePlayer = _rooms[roomIndex].currentOrder;
  const playerCount = _rooms[roomIndex].players.length;
  const nextPlayer = activePlayer + 1;
  if (nextPlayer <= playerCount) {
    _rooms[roomIndex].currentOrder = nextPlayer;
  } else {
    // 回到第一個玩家
    _rooms[roomIndex].currentOrder = 1;
  }
};

const _checkGameOver = (
  roomIndex: number,
  playerIndex: number,
): { winner: Player; room: Room } | undefined => {
  // 輪到最後一位玩家結束回合
  if (_rooms[roomIndex].players[playerIndex].isLastRoundPlayer) {
    // 遊戲結束
    _rooms[roomIndex].isGameOver = true;
    _rooms[roomIndex].status = GameStatus.Idle;
    _rooms[roomIndex].players.forEach((_, i) => {
      if (!_rooms[roomIndex].players[i].isMaster) {
        _rooms[roomIndex].players[i].isReady = false;
      }
    });

    const playersScoreRank = _rooms[roomIndex].players.sort(
      (a, b) => a.score - b.score,
    );
    const winner = playersScoreRank[playersScoreRank.length - 1];

    return {
      winner,
      room: _rooms[roomIndex],
    };
  }
};

export function getPlayerName(roomId: string, playerId: string) {
  const roomIndex = _getCurrentRoomIndex(roomId);
  if (roomIndex === -1) return;

  const playerIndex = _getCurrentPlayerIndex(
    _rooms[roomIndex].players,
    playerId,
  );
  if (playerIndex === -1) return;

  return _rooms[roomIndex].players[playerIndex].name;
}

export function checkCanJoinRoom(
  roomId: string,
  playerId: string,
  mode: GameMode,
) {
  if (mode === GameMode.Single) {
    return true;
  }

  if (mode === GameMode.Multiple) {
    const room = _getCurrentRoom(roomId);

    if (room) {
      // 人數已滿
      if (room.maxPlayers === room.players.length) return false;

      const player = room.players.find(
        player => player.id === playerId && !player.isMaster,
      );
      // 玩家不是房主且已存在
      if (player) return false;

      return true;
    }

    return true;
  }

  return false;
}

// 加入房間
export function joinRoom(
  payload: Pick<Room, 'roomId' | 'maxPlayers' | 'roomName' | 'password'>,
  playerId: string,
  playerName: string,
  mode: GameMode,
): Response & { needPassword?: boolean } {
  try {
    _playerInRoomMap[playerId] = payload.roomId;
    const roomIndex = _getCurrentRoomIndex(payload.roomId);

    if (roomIndex !== -1) {
      const playerIndex = _getCurrentPlayerIndex(
        _rooms[roomIndex].players,
        playerId,
      );
      const isMaster = _rooms[roomIndex].players[playerIndex]?.isMaster;
      if (isMaster) {
        return {
          room: _rooms[roomIndex],
        };
      }

      // 當房間有設密碼且不是房主需要回傳密碼輸入事件
      if (_rooms[roomIndex].password && !isMaster) {
        if (!payload.password) {
          return {
            needPassword: true,
          };
        }
        if (_rooms[roomIndex].password !== payload.password) {
          return { msg: '密碼錯誤' };
        }
      }

      // 房間已存在且不是房主
      _rooms[roomIndex].players.push({
        id: playerId,
        isMaster: false,
        name: playerName,
        handCard: [],
        score: 0,
        isLastRoundPlayer: false,
        isReady: false,
      });

      return {
        room: _rooms[roomIndex],
      };
    } else {
      // 沒有房間名稱，表示房間已經被刪除剛好有玩家加入時
      if (mode === GameMode.Multiple && !payload.roomName) {
        return {
          msg: '房間不存在',
        };
      }
      // 建立房間時已經有相同成稱的房間需擋掉
      if (mode === GameMode.Multiple && payload.roomName) {
        const existRoomName = _rooms.find(
          room => room.roomName === payload.roomName,
        );
        if (existRoomName) return { msg: '房間名稱已存在' };
      }
      // 創建新房間
      const newRoom: Room = {
        roomId: payload.roomId,
        maxPlayers: payload.maxPlayers,
        deck: [],
        currentOrder: -1,
        isGameOver: false,
        selectedCards: [],
        roomName: payload.roomName,
        password: payload.password,
        status: GameStatus.Idle,
        settings: {
          deckType: DeckType.Standard,
          remainSeconds: 60,
        },
        players: [
          {
            id: playerId,
            isMaster: true,
            name: playerName,
            handCard: [],
            score: 0,
            isLastRoundPlayer: false,
            isReady: true,
          },
        ],
      };
      _rooms.push(newRoom);

      return {
        room: newRoom,
      };
    }
  } catch (e) {
    return { msg: '發生錯誤，請稍後再試 (join room)' };
  }
}

// 離開房間
export function leaveRoom(
  playerId: string,
): (Response & { playerName: string }) | undefined {
  const roomId = _playerInRoomMap[playerId];
  const room = _getCurrentRoom(roomId);
  // 房間不存在
  if (!room || !roomId) return;

  // 房間剩下最後一人直接移除房間
  if (room.players.length === 1) {
    _rooms = _rooms.filter(room => room.roomId !== roomId);
  } else {
    // 離開的玩家名稱
    const leftPlayerName = room.players.find(
      player => player.id === playerId,
    )?.name;
    const newPlayers = room.players.filter(player => player.id !== playerId);
    const hasMaster = newPlayers.find(player => player.isMaster);

    // 如果房主已離開房間，則第一位玩家為房主
    if (!hasMaster) {
      newPlayers[0].isMaster = true;
    }

    _rooms = _rooms.map(room => {
      if (room.roomId === roomId) {
        return {
          ...room,
          players: newPlayers,
          status: GameStatus.Idle, // 切換為等待狀態
          isGameOver: false,
        };
      }
      return room;
    });

    const newRoom = _rooms.find(room => room.roomId === roomId);

    // 移除 mapping 表
    delete _playerInRoomMap[playerId];

    return { room: newRoom, playerName: leftPlayerName || 'player?' };
  }
}

// 開始遊戲
export function startGame(roomId: string): Response {
  const room = _getCurrentRoom(roomId);
  if (!room) return { msg: '房間不存在' };

  try {
    let tempDeck: number[] = [];

    switch (room.players.length) {
      case 1:
        tempDeck = createDeckByRandomMode(40, 10);
        break;
      case 2:
        if (room.settings.deckType === DeckType.Random) {
          tempDeck = createDeckByRandomMode(60, 10);
        } else {
          tempDeck = createDeckByStandardMode(6);
        }
        break;
      case 3:
        if (room.settings.deckType === DeckType.Random) {
          tempDeck = createDeckByRandomMode(90, 10);
        } else {
          tempDeck = createDeckByStandardMode(9);
        }
        break;
      case 4:
        if (room.settings.deckType === DeckType.Random) {
          tempDeck = createDeckByRandomMode(120, 10);
        } else {
          tempDeck = createDeckByStandardMode(12);
        }
        break;
      default:
        return {
          msg: '開始遊戲失敗',
        };
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
    if (shuffledPlayerOrder.length !== room.players.length)
      return { msg: '發生錯誤，請稍後再試 (shuffle)' };

    shuffledPlayerOrder.forEach((order, index) => {
      _rooms[roomIndex].players[index].playerOrder = order;
      _rooms[roomIndex].players[index].score = 0;
      _rooms[roomIndex].players[index].isLastRoundPlayer = false;
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
    _rooms[roomIndex].currentOrder = 1;
    // 初始化
    _rooms[roomIndex].status = GameStatus.Playing;
    _rooms[roomIndex].isGameOver = false;
    _rooms[roomIndex].selectedCards = [];

    return {
      room: _rooms[roomIndex],
    };
  } catch (e) {
    return { msg: '發生錯誤，請稍後再試 (start game)' };
  }
}

// 準備遊戲
export function readyGame(roomId: string, playerId: string): Response {
  const roomIndex = _getCurrentRoomIndex(roomId);
  if (roomIndex === -1) return { msg: '房間不存在' };

  const playerIndex = _getCurrentPlayerIndex(
    _rooms[roomIndex].players,
    playerId,
  );
  if (playerIndex === -1) return { msg: '玩家不存在' };

  try {
    _rooms[roomIndex].players[playerIndex].isReady =
      !_rooms[roomIndex].players[playerIndex].isReady;

    return {
      room: _rooms[roomIndex],
    };
  } catch (e) {
    return { msg: '發生錯誤，請稍後再試 (ready game)' };
  }
}

// 抽一張牌並結束回合換下一位玩家
export function drawCard(
  roomId: string,
  playerId: string,
  count: number,
): Response & { winner?: Player } {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { msg: '房間不存在' };

    const playerIndex = _getCurrentPlayerIndex(
      _rooms[roomIndex].players,
      playerId,
    );
    if (playerIndex === -1) return { msg: '玩家不存在' };

    const gameOver = _checkGameOver(roomIndex, playerIndex);
    if (gameOver) {
      return gameOver;
    } else {
      if (_rooms[roomIndex].deck.length <= count) {
        _rooms[roomIndex].players[playerIndex].handCard.push(
          ..._rooms[roomIndex].deck,
        );
        _rooms[roomIndex].deck = [];
        const hasLastTag = _rooms[roomIndex].players.find(
          p => p.isLastRoundPlayer,
        );
        if (!hasLastTag) {
          // 標記為最後一位玩家
          _rooms[roomIndex].players[playerIndex].isLastRoundPlayer = true;
        }
      } else {
        _rooms[roomIndex].players[playerIndex].handCard.push(
          ...draw(_rooms[roomIndex].deck, count),
        );
      }
    }

    // 切換下一位玩家
    _nextPlayerTurn(roomIndex);

    return {
      room: _rooms[roomIndex],
    };
  } catch (e) {
    return { msg: '發生錯誤，請稍後再試 (draw card)' };
  }
}

// 棄牌
export function discardCard(
  roomId: string,
  playerId: string,
  cardId: string,
): Response {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { msg: '房間不存在' };

    const playerIndex = _getCurrentPlayerIndex(
      _rooms[roomIndex].players,
      playerId,
    );
    if (playerIndex === -1) return { msg: '玩家不存在' };

    const newCards = _rooms[roomIndex].players[playerIndex].handCard.filter(
      c => c.id !== cardId,
    );
    _rooms[roomIndex].players[playerIndex].handCard = newCards;

    return {
      room: _rooms[roomIndex],
    };
  } catch (e) {
    return { msg: '發生錯誤，請稍後再試 (discard card)' };
  }
}

// 出牌
export function playCard(
  roomId: string,
  playerId: string,
): Response & { isCorrect?: boolean } {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { msg: '房間不存在' };

    const playerIndex = _getCurrentPlayerIndex(
      _rooms[roomIndex].players,
      playerId,
    );
    if (playerIndex === -1) return { msg: '玩家不存在' };

    const selectedCards = _rooms[roomIndex].selectedCards;
    const answer = calculateAnswer(selectedCards);

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
      isCorrect: true,
      room: _rooms[roomIndex],
    };
  } catch (e) {
    return { msg: '算式有誤 (play card)' };
  }
}

export function backCard(roomId: string): Response {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { msg: '房間不存在' };

    _rooms[roomIndex].selectedCards.pop();

    return {
      room: _rooms[roomIndex],
    };
  } catch (error) {
    return { msg: '發生錯誤，請稍後再試 (back card)' };
  }
}

// 更新分數並換下一位玩家
export function updateScore(
  roomId: string,
  playerId: string,
): Response & { winner?: Player } {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { msg: '房間不存在' };

    const playerIndex = _getCurrentPlayerIndex(
      _rooms[roomIndex].players,
      playerId,
    );
    if (playerIndex === -1) return { msg: '玩家不存在' };

    const selectedCards = _rooms[roomIndex].selectedCards;

    // 使用的數字牌
    const numberCards = selectedCards
      .filter(c => c.number)
      .map(c => c.number?.id);

    // 計算分數
    let score = 0;
    // +, - 各加一分
    const plusAndMinusCount =
      selectedCards.filter(
        c => c.symbol && [Symbol.Plus, Symbol.Minus].includes(c.symbol),
      ).length || 0;
    score += plusAndMinusCount;

    // * 兩分, / 三分
    const timesCount =
      selectedCards.filter(c => c.symbol === Symbol.Times).length || 0;
    const divideCount =
      selectedCards.filter(c => c.symbol === Symbol.Divide).length || 0;
    score += timesCount * 2;
    score += divideCount * 3;

    // 如果有兩個 * 額外加一分
    if (timesCount >= 2) {
      score += 1;
    }

    // 如果有兩個 / 額外加一分
    if (divideCount >= 2) {
      score += 1;
    }

    // 使用到的數字牌數量額外加分
    const bonusNumberCardsScore = calculateNumbersScore(numberCards.length);
    if (bonusNumberCardsScore) {
      score += bonusNumberCardsScore;
    }

    // 寫入分數
    _rooms[roomIndex].players[playerIndex].score += score;
    _rooms[roomIndex].selectedCards = [];

    const { room, winner, msg } = drawCard(
      roomId,
      playerId,
      numberCards.length,
    );

    if (msg) {
      return { msg };
    }
    return { room, winner };
  } catch (e) {
    return { msg: '發生錯誤，請稍後再試 (update score)' };
  }
}

export function selectCard(
  roomId: string,
  number: NumberCard,
  symbol: Symbol,
): Response {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { msg: '房間不存在' };

    const selectedCards = _rooms[roomIndex].selectedCards;

    if (selectedCards.length === 0 && symbol && symbol !== Symbol.LeftBracket) {
      return {
        msg: '第一個只能用左括號或數字',
      };
    }

    if (number) {
      const currentSelect = selectedCards[selectedCards.length - 1];

      // 如果前一個是數字則不能選
      if (currentSelect?.number && currentSelect?.number.id !== number.id) {
        return {
          msg: '數字牌不能連續使用',
        };
      }

      if (currentSelect?.symbol === Symbol.RightBracket) {
        _rooms[roomIndex].selectedCards.push({ symbol: Symbol.Times });
      }

      const isExistIndex = selectedCards.findIndex(
        s => s.number?.id === number.id,
      );
      if (isExistIndex !== -1) {
        _rooms[roomIndex].selectedCards.splice(isExistIndex, 1);
      } else {
        _rooms[roomIndex].selectedCards.push({ number });
      }
    }
    if (symbol) {
      const lastCard = selectedCards[selectedCards.length - 1];
      if (lastCard?.symbol === Symbol.Minus && symbol === Symbol.Minus) {
        return {
          msg: '減號不能連續用',
        };
      }

      if (lastCard?.symbol === Symbol.Plus && symbol === Symbol.Plus) {
        return {
          msg: '加號不能連續用',
        };
      }

      if (lastCard?.symbol === Symbol.Times && symbol === Symbol.Times) {
        return {
          msg: '乘號不能連續用',
        };
      }

      if (lastCard?.symbol === Symbol.Divide && symbol === Symbol.Divide) {
        return {
          msg: '除號不能連續用',
        };
      }

      // if (lastCard.symbol === Symbol.Minus && symbol === Symbol.LeftBracket) {
      //   return {
      //     msg: '減號後面無法使用左括號',
      //   };
      // }

      if (
        lastCard?.symbol === Symbol.LeftBracket &&
        [Symbol.Plus, Symbol.Minus].includes(symbol)
      ) {
        return {
          msg: '左括號後面無法使用減號或加號',
        };
      }

      if (symbol === Symbol.LeftBracket && lastCard?.number) {
        _rooms[roomIndex].selectedCards.push({ symbol: Symbol.Times });
      }
      _rooms[roomIndex].selectedCards.push({ symbol });
    }

    return {
      room: _rooms[roomIndex],
    };
  } catch (e) {
    return { msg: '發生錯誤，請稍後再試 (select card)' };
  }
}

export function reselectCard(roomId: string): Response {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { msg: '房間不存在' };

    _rooms[roomIndex].selectedCards = [];

    return {
      room: _rooms[roomIndex],
    };
  } catch (e) {
    return { msg: '發生錯誤，請稍後再試 (reselect card)' };
  }
}

export function editRoom(
  roomId: string,
  newRoomName: string,
  newPassword: string,
): Response {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { msg: '房間不存在' };

    _rooms[roomIndex].roomName = newRoomName;
    _rooms[roomIndex].password = newPassword;

    return {
      room: _rooms[roomIndex],
    };
  } catch (e) {
    return { msg: '發生錯誤，請稍後再試 (edit room)' };
  }
}

export function editRoomSettings(
  roomId: string,
  maxPlayers?: number,
  deckType?: DeckType,
  remainSeconds?: number | null,
): Response {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { msg: '房間不存在' };

    if (maxPlayers) {
      _rooms[roomIndex].maxPlayers = maxPlayers;
    }

    if (deckType) {
      _rooms[roomIndex].settings.deckType = deckType;
    }

    if (remainSeconds !== undefined) {
      _rooms[roomIndex].settings.remainSeconds = remainSeconds;
    }

    return {
      room: _rooms[roomIndex],
    };
  } catch (e) {
    return { msg: '發生錯誤，請稍後再試 (edit room settings)' };
  }
}

export function removePlayer(roomId: string, playerId: string): Response {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { msg: '房間不存在' };

    const playerIndex = _rooms[roomIndex].players.findIndex(
      p => p.id === playerId,
    );

    _rooms[roomIndex].players.splice(playerIndex, 1);

    // 移除 mapping 表
    delete _playerInRoomMap[playerId];

    return {
      room: _rooms[roomIndex],
    };
  } catch (e) {
    return { msg: '發生錯誤，請稍後再試 (remove player)' };
  }
}
