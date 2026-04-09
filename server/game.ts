import { v4 as uuidv4 } from 'uuid';
import { calculateAnswer } from '../lib/utils';
import { ColorRule, validateBoard } from '../lib/rummy-validator';
import { BotDifficulty, findPlayableGroups } from '../lib/rummy-ai';
import { GameMode } from '../models/GameMode';
import { GameStatus } from '../models/GameStatus';
import { CardColor, NumberCard, Player } from '../models/Player';
import { GameResponse } from '../models/Response';
import {
  DeckType,
  Difficulty,
  EquationGroup,
  HAND_CARD_COUNT,
  RUMMY_HAND_CARD_COUNT,
  RUMMY_HAND_CARD_COUNT_EASY,
  RUMMY_TURN_SECONDS,
  Room,
} from '../models/Room';
import { Symbol } from '../models/Symbol';
import { canMake24 } from '../lib/daily-seed';
import {
  createDeckByRandomMode,
  createDeckByStandardMode,
  createRummyDeck,
  draw,
  shuffleArray,
} from './utils';

type JoinRoomResult =
  | { success: true; room: Room }
  | { success: false; error: string; needPassword?: true };

type DrawCardResult =
  | { success: true; room: Room; winner?: Player }
  | { success: false; error: string };

type PlayCardResult =
  | { success: true; room: Room; isCorrect: boolean }
  | { success: false; error: string };

type UpdateScoreResult =
  | { success: true; room: Room; winner?: Player }
  | { success: false; error: string };

type SkipHandResult =
  | { success: true; room: Room; winner?: Player }
  | { success: false; error: string };

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

/** 抽出有解的手牌，若多次嘗試仍無解則直接返回（兜底） */
function _drawSolvableHand(
  roomIndex: number,
  n: number,
  maxAttempts = 20,
): { drawn: NumberCard[]; deck: NumberCard[] } {
  let deck = _rooms[roomIndex].deck;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (deck.length < n) break;
    const { drawn, remaining } = draw(deck, n);
    if (canMake24(drawn.map(c => c.value))) {
      return { drawn, deck: remaining };
    }
    deck = shuffleArray([...remaining, ...drawn]);
  }
  // 兜底：無解時回傳預設有解牌值 [1,2,3,4]（仍消耗牌庫以維持牌庫計數）
  const DEFAULT_SOLVABLE_VALUES = [1, 2, 3, 4];
  if (deck.length >= n) {
    const { drawn: removed, remaining } = draw(deck, n);
    const drawn = removed.map((card, i) => ({
      ...card,
      value: DEFAULT_SOLVABLE_VALUES[i % DEFAULT_SOLVABLE_VALUES.length],
    }));
    return { drawn, deck: remaining };
  }
  // 牌堆不足 n 張：取全部
  return { drawn: deck, deck: [] };
}

const _nextPlayerTurn = (roomIndex: number) => {
  const currentOrder = _rooms[roomIndex].currentOrder;
  const players = _rooms[roomIndex].players;
  const orders = players
    .map(p => p.playerOrder!)
    .filter(o => o !== undefined)
    .sort((a, b) => a - b);
  if (orders.length === 0) return;
  // 找下一個順序（>currentOrder），若無則繞回第一位
  const nextOrder = orders.find(o => o > currentOrder) ?? orders[0];
  _rooms[roomIndex].currentOrder = nextOrder;
};

const _isPlayerTurn = (roomIndex: number, playerIndex: number) => {
  return (
    _rooms[roomIndex].players[playerIndex].playerOrder ===
    _rooms[roomIndex].currentOrder
  );
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
  payload: Pick<Room, 'roomId' | 'maxPlayers' | 'roomName' | 'password'> & {
    difficulty?: Difficulty;
    gameType?: 'classic' | 'rummy';
    remainSeconds?: number | null;
  },
  playerId: string,
  playerName: string,
  mode: GameMode,
): JoinRoomResult {
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
        return { success: true, room: _rooms[roomIndex] };
      }

      // 當房間有設密碼且不是房主需要回傳密碼輸入事件
      if (_rooms[roomIndex].password && !isMaster) {
        if (!payload.password) {
          return { success: false, error: '', needPassword: true };
        }
        if (_rooms[roomIndex].password !== payload.password) {
          return { success: false, error: '密碼錯誤' };
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
        hasMelded: false,
      });

      return { success: true, room: _rooms[roomIndex] };
    } else {
      // 沒有房間名稱，表示房間已經被刪除剛好有玩家加入時
      if (mode === GameMode.Multiple && !payload.roomName) {
        return { success: false, error: '房間不存在' };
      }
      // 建立房間時已經有相同成稱的房間需擋掉
      if (mode === GameMode.Multiple && payload.roomName) {
        const existRoomName = _rooms.find(
          room => room.roomName === payload.roomName,
        );
        if (existRoomName) return { success: false, error: '房間名稱已存在' };
      }
      // 創建新房間
      const newRoom: Room = {
        roomId: payload.roomId,
        maxPlayers: payload.maxPlayers,
        deck: [],
        currentOrder: -1,
        isGameOver: false,
        selectedCards: [],
        board: [],
        roomName: payload.roomName,
        password: payload.password,
        status: GameStatus.Idle,
        settings: {
          deckType: DeckType.Standard,
          remainSeconds: payload.remainSeconds === undefined ? 60 : payload.remainSeconds,
          difficulty: payload.difficulty ?? Difficulty.Normal,
          gameType: payload.gameType ?? 'classic',
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
            hasMelded: false,
          },
        ],
      };
      _rooms.push(newRoom);

      return { success: true, room: newRoom };
    }
  } catch (e) {
    return { success: false, error: '發生錯誤，請稍後再試 (join room)' };
  }
}

// 離開房間
export function leaveRoom(
  playerId: string,
): { room: Room; playerName: string; wasPlaying: boolean; remainingCount: number } | undefined {
  const roomId = _playerInRoomMap[playerId];
  const room = _getCurrentRoom(roomId);
  // 房間不存在
  if (!room || !roomId) return;

  // 離開的玩家資訊
  const leavingPlayer = room.players.find(player => player.id === playerId);
  const leftPlayerName = leavingPlayer?.name;
  const wasPlaying = room.status === GameStatus.Playing;
  const wasCurrentTurn = leavingPlayer?.playerOrder === room.currentOrder;

  const newPlayers = room.players.filter(player => player.id !== playerId);

  // 若剩下的全是 Bot（無人類），直接刪除房間
  const humanPlayersLeft = newPlayers.filter(p => !p.isBot);
  if (humanPlayersLeft.length === 0) {
    _rooms = _rooms.filter(r => r.roomId !== roomId);
    delete _playerInRoomMap[playerId];
    return;
  }

  const hasMaster = newPlayers.find(player => player.isMaster);

  // 如果房主已離開房間，則第一位玩家為房主
  if (!hasMaster) {
    newPlayers[0].isMaster = true;
  }

  // 遊戲中且剩餘 ≥ 2 人：繼續遊戲；否則回到等待狀態
  const newStatus =
    wasPlaying && newPlayers.length >= 2 ? GameStatus.Playing : GameStatus.Idle;

  _rooms = _rooms.map(room => {
    if (room.roomId === roomId) {
      return {
        ...room,
        players: newPlayers,
        status: newStatus,
        isGameOver: newStatus === GameStatus.Idle ? false : room.isGameOver,
      };
    }
    return room;
  });

  const roomIndex = _getCurrentRoomIndex(roomId);

  // 若遊戲中且是該玩家的回合，自動前進到下一位玩家
  if (wasPlaying && wasCurrentTurn && newPlayers.length >= 2) {
    _nextPlayerTurn(roomIndex);
  }

  const newRoom = _rooms.find(room => room.roomId === roomId) as Room;

  // 移除 mapping 表
  delete _playerInRoomMap[playerId];

  return {
    room: newRoom,
    playerName: leftPlayerName || 'player?',
    wasPlaying,
    remainingCount: newPlayers.length,
  };
}

// 開始遊戲
export function startGame(roomId: string): GameResponse {
  const room = _getCurrentRoom(roomId);
  if (!room) return { success: false, error: '房間不存在' };

  try {
    let tempDeck: number[] = [];
    const roomIndex = _getCurrentRoomIndex(roomId);

    // 依難度決定牌值範圍
    const difficulty = room.settings.difficulty ?? Difficulty.Normal;
    let maxValue = 10;
    if (difficulty === Difficulty.Easy) {
      maxValue = 6;
    } else if (difficulty === Difficulty.Hard) {
      maxValue = 13;
    }

    switch (room.players.length) {
      case 1:
        tempDeck = createDeckByRandomMode(40, maxValue);
        break;
      case 2:
        if (room.settings.deckType === DeckType.Random) {
          tempDeck = createDeckByRandomMode(60, maxValue);
        } else {
          tempDeck = createDeckByStandardMode(6, maxValue);
        }
        break;
      case 3:
        if (room.settings.deckType === DeckType.Random) {
          tempDeck = createDeckByRandomMode(90, maxValue);
        } else {
          tempDeck = createDeckByStandardMode(9, maxValue);
        }
        break;
      case 4:
        if (room.settings.deckType === DeckType.Random) {
          tempDeck = createDeckByRandomMode(120, maxValue);
        } else {
          tempDeck = createDeckByStandardMode(12, maxValue);
        }
        break;
      default:
        return { success: false, error: '開始遊戲失敗' };
    }

    // 洗牌
    const shuffledDeck: NumberCard[] = shuffleArray(tempDeck).map(d => ({
      id: uuidv4(),
      value: d,
    }));

    // [1,2,3,4...]
    const playerOrders = Array.from(Array(room.players.length).keys()).map(
      i => i + 1,
    );

    // 隨機玩家順序
    const shuffledPlayerOrder = shuffleArray(playerOrders);
    if (shuffledPlayerOrder.length !== room.players.length)
      return { success: false, error: '發生錯誤，請稍後再試 (shuffle)' };

    let remainingDeck = shuffledDeck;
    shuffledPlayerOrder.forEach((order, index) => {
      _rooms[roomIndex].players[index].playerOrder = order;
      _rooms[roomIndex].players[index].score = 0;
      _rooms[roomIndex].players[index].isLastRoundPlayer = false;
      if (remainingDeck.length) {
        // 抽牌並改變牌庫牌數
        const { drawn, remaining } = draw(remainingDeck, HAND_CARD_COUNT);
        _rooms[roomIndex].players[index].handCard = drawn;
        remainingDeck = remaining;
      }
    });

    // 寫入牌庫
    _rooms[roomIndex].deck = remainingDeck;
    // 從玩家1開始
    _rooms[roomIndex].currentOrder = 1;
    // 初始化
    _rooms[roomIndex].status = GameStatus.Playing;
    _rooms[roomIndex].isGameOver = false;
    _rooms[roomIndex].selectedCards = [];
    _rooms[roomIndex].board = [];

    return { success: true, room: _rooms[roomIndex] };
  } catch (e) {
    return { success: false, error: '發生錯誤，請稍後再試 (start game)' };
  }
}

// 準備遊戲
export function readyGame(roomId: string, playerId: string): GameResponse {
  const roomIndex = _getCurrentRoomIndex(roomId);
  if (roomIndex === -1) return { success: false, error: '房間不存在' };

  const playerIndex = _getCurrentPlayerIndex(
    _rooms[roomIndex].players,
    playerId,
  );
  if (playerIndex === -1) return { success: false, error: '玩家不存在' };

  try {
    _rooms[roomIndex].players[playerIndex].isReady =
      !_rooms[roomIndex].players[playerIndex].isReady;

    return { success: true, room: _rooms[roomIndex] };
  } catch (e) {
    return { success: false, error: '發生錯誤，請稍後再試 (ready game)' };
  }
}

// 抽一張牌並結束回合換下一位玩家
export function drawCard(
  roomId: string,
  playerId: string,
  count: number,
): DrawCardResult {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { success: false, error: '房間不存在' };

    const playerIndex = _getCurrentPlayerIndex(
      _rooms[roomIndex].players,
      playerId,
    );
    if (playerIndex === -1) return { success: false, error: '玩家不存在' };

    // 回合驗證：防止計時器 race condition 觸發重複抽牌
    if (!_isPlayerTurn(roomIndex, playerIndex)) {
      return { success: false, error: 'NOT_YOUR_TURN' };
    }

    const gameOver = _checkGameOver(roomIndex, playerIndex);
    if (gameOver) {
      return { success: true, room: gameOver.room, winner: gameOver.winner };
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
        const result = _drawSolvableHand(roomIndex, count);
        _rooms[roomIndex].players[playerIndex].handCard.push(...result.drawn);
        _rooms[roomIndex].deck = result.deck;
      }
    }

    // 切換下一位玩家
    _nextPlayerTurn(roomIndex);

    return { success: true, room: _rooms[roomIndex] };
  } catch (e) {
    return { success: false, error: '發生錯誤，請稍後再試 (draw card)' };
  }
}

// 棄牌
export function discardCard(
  roomId: string,
  playerId: string,
  cardId: string,
): GameResponse {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { success: false, error: '房間不存在' };

    const playerIndex = _getCurrentPlayerIndex(
      _rooms[roomIndex].players,
      playerId,
    );
    if (playerIndex === -1) return { success: false, error: '玩家不存在' };

    const newCards = _rooms[roomIndex].players[playerIndex].handCard.filter(
      c => c.id !== cardId,
    );
    _rooms[roomIndex].players[playerIndex].handCard = newCards;

    return { success: true, room: _rooms[roomIndex] };
  } catch (e) {
    return { success: false, error: '發生錯誤，請稍後再試 (discard card)' };
  }
}

// 出牌
export function playCard(
  roomId: string,
  playerId: string,
): PlayCardResult {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { success: false, error: '房間不存在' };

    const playerIndex = _getCurrentPlayerIndex(
      _rooms[roomIndex].players,
      playerId,
    );
    if (playerIndex === -1) return { success: false, error: '玩家不存在' };

    const selectedCards = _rooms[roomIndex].selectedCards;
    const answer = calculateAnswer(selectedCards);

    // 使用的數字牌
    const numberCards = selectedCards
      .filter(c => c.number)
      .map(c => c.number?.id);

    // 經典模式：必須用完所有手牌
    const handCardCount = _rooms[roomIndex].players[playerIndex].handCard.length;
    if (answer === 24 && numberCards.length === handCardCount) {
      // 移除數字牌
      const newCards = _rooms[roomIndex].players[playerIndex].handCard.filter(
        c => !numberCards.includes(c.id),
      );
      _rooms[roomIndex].players[playerIndex].handCard = newCards;

      return { success: true, room: _rooms[roomIndex], isCorrect: true };
    }
    return { success: true, room: _rooms[roomIndex], isCorrect: false };
  } catch (e) {
    return { success: false, error: '算式有誤 (play card)' };
  }
}

export function backCard(roomId: string): GameResponse {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { success: false, error: '房間不存在' };

    _rooms[roomIndex].selectedCards.pop();

    return { success: true, room: _rooms[roomIndex] };
  } catch (error) {
    return { success: false, error: '發生錯誤，請稍後再試 (back card)' };
  }
}

// 更新分數並換下一位玩家
export function updateScore(
  roomId: string,
  playerId: string,
): UpdateScoreResult {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { success: false, error: '房間不存在' };

    const playerIndex = _getCurrentPlayerIndex(
      _rooms[roomIndex].players,
      playerId,
    );
    if (playerIndex === -1) return { success: false, error: '玩家不存在' };

    if (!_isPlayerTurn(roomIndex, playerIndex)) {
      return { success: false, error: 'NOT_YOUR_TURN' };
    }

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

    // 寫入分數
    _rooms[roomIndex].players[playerIndex].score += score;
    _rooms[roomIndex].selectedCards = [];

    const drawResult = drawCard(roomId, playerId, numberCards.length);
    if (!drawResult.success) {
      return { success: false, error: drawResult.error };
    }
    return { success: true, room: drawResult.room, winner: drawResult.winner };
  } catch (e) {
    return { success: false, error: '發生錯誤，請稍後再試 (update score)' };
  }
}

export function selectCard(
  roomId: string,
  number: NumberCard,
  symbol: Symbol,
): GameResponse {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { success: false, error: '房間不存在' };

    const selectedCards = _rooms[roomIndex].selectedCards;

    if (selectedCards.length === 0 && symbol && symbol !== Symbol.LeftBracket) {
      return { success: false, error: '第一個只能用左括號或數字' };
    }

    if (number) {
      const currentSelect = selectedCards[selectedCards.length - 1];

      // 如果前一個是數字則不能選
      if (currentSelect?.number && currentSelect?.number.id !== number.id) {
        return { success: false, error: '數字牌不能連續使用' };
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
        return { success: false, error: '減號不能連續用' };
      }

      if (lastCard?.symbol === Symbol.Plus && symbol === Symbol.Plus) {
        return { success: false, error: '加號不能連續用' };
      }

      if (lastCard?.symbol === Symbol.Times && symbol === Symbol.Times) {
        return { success: false, error: '乘號不能連續用' };
      }

      if (lastCard?.symbol === Symbol.Divide && symbol === Symbol.Divide) {
        return { success: false, error: '除號不能連續用' };
      }

      // if (lastCard.symbol === Symbol.Minus && symbol === Symbol.LeftBracket) {
      //   return { success: false, error: '減號後面無法使用左括號' };
      // }

      if (
        lastCard?.symbol === Symbol.LeftBracket &&
        [Symbol.Plus, Symbol.Minus].includes(symbol)
      ) {
        return { success: false, error: '左括號後面無法使用減號或加號' };
      }

      if (symbol === Symbol.LeftBracket && lastCard?.number) {
        _rooms[roomIndex].selectedCards.push({ symbol: Symbol.Times });
      }
      _rooms[roomIndex].selectedCards.push({ symbol });
    }

    return { success: true, room: _rooms[roomIndex] };
  } catch (e) {
    return { success: false, error: '發生錯誤，請稍後再試 (select card)' };
  }
}

export function reselectCard(roomId: string): GameResponse {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { success: false, error: '房間不存在' };

    _rooms[roomIndex].selectedCards = [];

    return { success: true, room: _rooms[roomIndex] };
  } catch (e) {
    return { success: false, error: '發生錯誤，請稍後再試 (reselect card)' };
  }
}

export function editRoom(
  roomId: string,
  newRoomName: string,
  newPassword: string,
): GameResponse {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { success: false, error: '房間不存在' };

    _rooms[roomIndex].roomName = newRoomName;
    _rooms[roomIndex].password = newPassword;

    return { success: true, room: _rooms[roomIndex] };
  } catch (e) {
    return { success: false, error: '發生錯誤，請稍後再試 (edit room)' };
  }
}

export function editRoomSettings(
  roomId: string,
  maxPlayers?: number,
  deckType?: DeckType,
  remainSeconds?: number | null,
  difficulty?: Difficulty,
  gameType?: 'classic' | 'rummy',
): GameResponse {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { success: false, error: '房間不存在' };

    if (maxPlayers) {
      _rooms[roomIndex].maxPlayers = maxPlayers;
    }

    if (deckType) {
      _rooms[roomIndex].settings.deckType = deckType;
    }

    if (remainSeconds !== undefined) {
      _rooms[roomIndex].settings.remainSeconds = remainSeconds;
    }

    if (difficulty) {
      _rooms[roomIndex].settings.difficulty = difficulty;
    }

    if (gameType) {
      _rooms[roomIndex].settings.gameType = gameType;
    }

    return { success: true, room: _rooms[roomIndex] };
  } catch (e) {
    return { success: false, error: '發生錯誤，請稍後再試 (edit room settings)' };
  }
}

// 跳過（換 4 張新牌，無得分）
export function skipHand(roomId: string, playerId: string): SkipHandResult {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { success: false, error: '房間不存在' };

    const playerIndex = _getCurrentPlayerIndex(
      _rooms[roomIndex].players,
      playerId,
    );
    if (playerIndex === -1) return { success: false, error: '玩家不存在' };

    if (!_isPlayerTurn(roomIndex, playerIndex)) {
      return { success: false, error: 'NOT_YOUR_TURN' };
    }

    // 抽牌前先檢查（與 drawCard 一致），確保 isLastRoundPlayer 已在上一輪出牌後設置的情況下才結算
    const gameOver = _checkGameOver(roomIndex, playerIndex);
    if (gameOver) {
      return { success: true, room: gameOver.room, winner: gameOver.winner };
    }

    // 清空手牌
    _rooms[roomIndex].players[playerIndex].handCard = [];
    // 重置已選牌
    _rooms[roomIndex].selectedCards = [];

    const deckCount = _rooms[roomIndex].deck.length;

    if (deckCount <= HAND_CARD_COUNT) {
      // 牌庫不足，拿走剩餘牌
      _rooms[roomIndex].players[playerIndex].handCard = _rooms[roomIndex].deck;
      _rooms[roomIndex].deck = [];
      const hasLastTag = _rooms[roomIndex].players.find(p => p.isLastRoundPlayer);
      if (!hasLastTag) {
        _rooms[roomIndex].players[playerIndex].isLastRoundPlayer = true;
      }
    } else {
      const result = _drawSolvableHand(roomIndex, HAND_CARD_COUNT);
      _rooms[roomIndex].players[playerIndex].handCard = result.drawn;
      _rooms[roomIndex].deck = result.deck;
    }

    // 切換下一位玩家
    _nextPlayerTurn(roomIndex);

    return { success: true, room: _rooms[roomIndex] };
  } catch (e) {
    return { success: false, error: '發生錯誤，請稍後再試 (skip hand)' };
  }
}

export function removePlayer(roomId: string, playerId: string): GameResponse {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { success: false, error: '房間不存在' };

    const playerIndex = _rooms[roomIndex].players.findIndex(
      p => p.id === playerId,
    );

    _rooms[roomIndex].players.splice(playerIndex, 1);

    // 移除 mapping 表
    delete _playerInRoomMap[playerId];

    return { success: true, room: _rooms[roomIndex] };
  } catch (e) {
    return { success: false, error: '發生錯誤，請稍後再試 (remove player)' };
  }
}

// ============================================================
// 拉密模式函數
// ============================================================

/** 拉密：開始遊戲（需在 startGame 之後，依 gameType 決定是否呼叫） */
export function rummyStartGame(roomId: string): GameResponse {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { success: false, error: '房間不存在' };

    const rummyDeck = createRummyDeck();

    const playerOrders = Array.from(
      Array(_rooms[roomIndex].players.length).keys(),
    ).map(i => i + 1);
    const shuffledPlayerOrder = shuffleArray(playerOrders);

    const difficulty = _rooms[roomIndex].settings.difficulty ?? Difficulty.Normal;
    const handCount = difficulty === Difficulty.Easy
      ? RUMMY_HAND_CARD_COUNT_EASY
      : RUMMY_HAND_CARD_COUNT;

    let remainingDeck = rummyDeck;
    shuffledPlayerOrder.forEach((order, index) => {
      _rooms[roomIndex].players[index].playerOrder = order;
      _rooms[roomIndex].players[index].score = 0;
      _rooms[roomIndex].players[index].isLastRoundPlayer = false;
      _rooms[roomIndex].players[index].hasMelded = false;

      const { drawn, remaining } = draw(remainingDeck, handCount);
      _rooms[roomIndex].players[index].handCard = drawn;
      remainingDeck = remaining;
    });

    _rooms[roomIndex].deck = remainingDeck;
    _rooms[roomIndex].board = [];
    _rooms[roomIndex].currentOrder = 1;
    _rooms[roomIndex].status = GameStatus.Playing;
    _rooms[roomIndex].isGameOver = false;
    _rooms[roomIndex].selectedCards = [];
    _rooms[roomIndex].rummyFinalRoundStartOrder = undefined;

    return { success: true, room: _rooms[roomIndex] };
  } catch (e) {
    return { success: false, error: '發生錯誤，請稍後再試 (rummy start game)' };
  }
}

/** 最後一圈結束檢查：若所有人都已輪過，計算懲罰分並回傳獲勝者 */
function _checkRummyFinalRoundOver(roomIndex: number): Player | null {
  const room = _rooms[roomIndex];
  if (room.rummyFinalRoundStartOrder === undefined) return null;
  if (room.currentOrder !== room.rummyFinalRoundStartOrder) return null;

  // 所有人都輪過，計算殘局懲罰（手牌扣分）
  for (const player of _rooms[roomIndex].players) {
    let penalty = 0;
    for (const card of player.handCard) {
      penalty += card.isJoker ? 20 : card.value;
    }
    player.score -= penalty;
  }

  _rooms[roomIndex].isGameOver = true;
  _rooms[roomIndex].status = GameStatus.Idle;

  // 負分最少（分數最高）者獲勝
  return [..._rooms[roomIndex].players].sort((a, b) => b.score - a.score)[0];
}

/** 拉密：抽 1 張牌並結束回合 */
export function rummyDrawCard(
  roomId: string,
  playerId: string,
): RummyDrawCardResult {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { success: false, error: '房間不存在' };

    const playerIndex = _getCurrentPlayerIndex(
      _rooms[roomIndex].players,
      playerId,
    );
    if (playerIndex === -1) return { success: false, error: '玩家不存在' };

    if (!_isPlayerTurn(roomIndex, playerIndex)) {
      return { success: false, error: 'NOT_YOUR_TURN' };
    }

    if (_rooms[roomIndex].deck.length === 0) {
      // 最後一圈：無牌可抽，直接 Pass（換人）
      _nextPlayerTurn(roomIndex);
      const penaltyWinner = _checkRummyFinalRoundOver(roomIndex);
      if (penaltyWinner) {
        return { success: true, room: _rooms[roomIndex], penaltyWinner };
      }
      return { success: true, room: _rooms[roomIndex] };
    }

    const { drawn, remaining } = draw(_rooms[roomIndex].deck, 1);
    _rooms[roomIndex].players[playerIndex].handCard.push(...drawn);
    _rooms[roomIndex].deck = remaining;

    _nextPlayerTurn(roomIndex);

    // 抽完後牌庫剛好耗盡：觸發最後一圈
    if (
      _rooms[roomIndex].deck.length === 0 &&
      _rooms[roomIndex].rummyFinalRoundStartOrder === undefined
    ) {
      _rooms[roomIndex].rummyFinalRoundStartOrder = _rooms[roomIndex].currentOrder;
    }

    return { success: true, room: _rooms[roomIndex] };
  } catch (e) {
    return { success: false, error: '發生錯誤，請稍後再試 (rummy draw card)' };
  }
}

type RummyDrawCardResult =
  | { success: true; room: Room; penaltyWinner?: Player }
  | { success: false; error: string };

type RummySubmitResult =
  | { success: true; room: Room; winner?: Player; penaltyWinner?: Player }
  | { success: false; error: string };

/** 拉密：提交桌面（驗證 + 結算） */
export function rummySubmitTurn(
  roomId: string,
  playerId: string,
  submittedBoard: EquationGroup[],
  playedCardIds: string[],
): RummySubmitResult {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { success: false, error: '房間不存在' };

    const playerIndex = _getCurrentPlayerIndex(
      _rooms[roomIndex].players,
      playerId,
    );
    if (playerIndex === -1) return { success: false, error: '玩家不存在' };

    if (!_isPlayerTurn(roomIndex, playerIndex)) {
      return { success: false, error: 'NOT_YOUR_TURN' };
    }

    if (playedCardIds.length === 0) {
      return { success: false, error: '至少需打出 1 張牌' };
    }

    const difficulty = _rooms[roomIndex].settings.difficulty ?? Difficulty.Normal;
    const colorRule: ColorRule = difficulty === Difficulty.Easy ? 'none' : 'standard';
    const penaltyCount = difficulty === Difficulty.Easy ? 2 : 3;

    // 取得本輪前手牌 id 集合 + 提交前桌面所有 card id
    const handCardIds = new Set(
      _rooms[roomIndex].players[playerIndex].handCard.map(c => c.id),
    );
    const boardCardIds = new Set(
      _rooms[roomIndex].board.flatMap(g =>
        g.tiles.filter(t => t.type === 'number').map(t => (t as { type: 'number'; card: NumberCard }).card.id),
      ),
    );
    const allowedIds = new Set([...handCardIds, ...boardCardIds]);

    // 卡牌守恆：submittedBoard 中所有 card.id 必須屬於 allowedIds
    const submittedCardIds = submittedBoard.flatMap(g =>
      g.tiles.filter(t => t.type === 'number').map(t => (t as { type: 'number'; card: NumberCard }).card.id),
    );
    const invalidCard = submittedCardIds.find(id => !allowedIds.has(id));
    if (invalidCard) {
      return { success: false, error: '提交牌組包含不合法的牌（非手牌也非原桌面牌）' };
    }

    // 若未破冰：舊 board 中所有牌組必須原樣保留在 submittedBoard 中
    if (!_rooms[roomIndex].players[playerIndex].hasMelded) {
      const oldBoardIds = new Set(
        _rooms[roomIndex].board.flatMap(g =>
          g.tiles.filter(t => t.type === 'number').map(t => (t as { type: 'number'; card: NumberCard }).card.id),
        ),
      );
      const submittedSet = new Set(submittedCardIds);
      for (const id of oldBoardIds) {
        if (!submittedSet.has(id)) {
          // 罰抽並換人
          _penaltyDraw(roomIndex, playerIndex, penaltyCount);
          _nextPlayerTurn(roomIndex);
          return {
            success: false,
            error: `未破冰時不可移動桌面上的既有牌組，已罰抽 ${penaltyCount} 張`,
          };
        }
      }
    }

    // 驗證桌面
    const validation = validateBoard(submittedBoard, colorRule);
    if (!validation.valid) {
      return {
        success: false,
        error: `桌面驗證失敗：${validation.errors.join('；')}`,
      };
    }

    // 成功：更新桌面與手牌
    _rooms[roomIndex].board = submittedBoard;
    const playedSet = new Set(playedCardIds);
    _rooms[roomIndex].players[playerIndex].handCard = _rooms[roomIndex].players[
      playerIndex
    ].handCard.filter(c => !playedSet.has(c.id));
    _rooms[roomIndex].players[playerIndex].hasMelded = true;

    // 判斷勝利（手牌清空）
    if (_rooms[roomIndex].players[playerIndex].handCard.length === 0) {
      // 計算贏家得分：所有其他玩家的剩餘手牌點數加總
      let winScore = 0;
      for (const player of _rooms[roomIndex].players) {
        if (player.id !== _rooms[roomIndex].players[playerIndex].id) {
          for (const card of player.handCard) {
            winScore += card.isJoker ? 20 : card.value;
          }
        }
      }
      _rooms[roomIndex].players[playerIndex].score += winScore;

      _rooms[roomIndex].isGameOver = true;
      _rooms[roomIndex].status = GameStatus.Idle;
      const winner = _rooms[roomIndex].players[playerIndex];
      return { success: true, room: _rooms[roomIndex], winner };
    }

    _nextPlayerTurn(roomIndex);

    // 最後一圈結束檢查
    const penaltyWinner = _checkRummyFinalRoundOver(roomIndex);
    if (penaltyWinner) {
      return { success: true, room: _rooms[roomIndex], penaltyWinner };
    }

    return { success: true, room: _rooms[roomIndex] };
  } catch (e) {
    return { success: false, error: '發生錯誤，請稍後再試 (rummy submit turn)' };
  }
}

/** 罰抽 n 張（內部輔助函數） */
function _penaltyDraw(roomIndex: number, playerIndex: number, n: number) {
  const count = Math.min(n, _rooms[roomIndex].deck.length);
  if (count > 0) {
    const { drawn, remaining } = draw(_rooms[roomIndex].deck, count);
    _rooms[roomIndex].players[playerIndex].handCard.push(...drawn);
    _rooms[roomIndex].deck = remaining;
  }
}

/** 拉密：宣告 Joker 數值與顏色 */
export function rummyDeclareJoker(
  roomId: string,
  jokerCardId: string,
  declaredValue: number,
  declaredColor: CardColor,
): GameResponse {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { success: false, error: '房間不存在' };

    let found = false;
    for (const group of _rooms[roomIndex].board) {
      for (const tile of group.tiles) {
        if (
          tile.type === 'number' &&
          tile.card.isJoker &&
          tile.card.id === jokerCardId
        ) {
          tile.card.jokerDeclaredValue = declaredValue;
          tile.card.jokerDeclaredColor = declaredColor;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      return { success: false, error: '找不到指定的 Joker 牌' };
    }

    return { success: true, room: _rooms[roomIndex] };
  } catch (e) {
    return { success: false, error: '發生錯誤，請稍後再試 (rummy declare joker)' };
  }
}

/** 加入 Bot 玩家到房間 */
export function addBotToRoom(
  roomId: string,
  difficulty: BotDifficulty,
): GameResponse {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { success: false, error: '房間不存在' };

    const room = _rooms[roomIndex];
    if (room.players.length >= room.maxPlayers) {
      return { success: false, error: '房間人數已滿' };
    }

    const botName =
      difficulty === 'easy'
        ? '電腦（簡單）'
        : difficulty === 'normal'
          ? '電腦（普通）'
          : '電腦（困難）';

    const bot: Player = {
      id: `bot-${uuidv4()}`,
      name: botName,
      isBot: true,
      botDifficulty: difficulty,
      handCard: [],
      score: 0,
      isMaster: false,
      isReady: true,
      hasMelded: false,
      isLastRoundPlayer: false,
    };

    _rooms[roomIndex].players.push(bot);
    return { success: true, room: _rooms[roomIndex] };
  } catch (e) {
    return { success: false, error: '發生錯誤，請稍後再試 (add bot)' };
  }
}

export type BotPlayResult =
  | { success: true; room: Room; winner?: Player; penaltyWinner?: Player }
  | { success: false; error: string };

/** Bot 自動行動（出牌或抽牌） */
export function rummyBotPlay(roomId: string, botPlayerId: string): BotPlayResult {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { success: false, error: '房間不存在' };

    const room = _rooms[roomIndex];
    if (room.status !== GameStatus.Playing) {
      return { success: false, error: 'Game not playing' };
    }

    const playerIndex = _getCurrentPlayerIndex(room.players, botPlayerId);
    if (playerIndex === -1) return { success: false, error: '玩家不存在' };

    if (!_isPlayerTurn(roomIndex, playerIndex)) {
      return { success: false, error: 'NOT_YOUR_TURN' };
    }

    const bot = room.players[playerIndex];
    const difficulty = (bot.botDifficulty as BotDifficulty) ?? 'normal';

    const playableGroups = findPlayableGroups(bot.handCard, difficulty);

    if (playableGroups.length > 0) {
      // 組裝 submittedBoard = 現有桌面 + Bot 新牌組
      const submittedBoard = [...room.board, ...playableGroups];
      const boardCardIds = new Set(
        room.board.flatMap(g =>
          g.tiles
            .filter(t => t.type === 'number')
            .map(t => (t as { type: 'number'; card: NumberCard }).card.id),
        ),
      );
      const playedCardIds = playableGroups
        .flatMap(g =>
          g.tiles
            .filter(t => t.type === 'number')
            .map(t => (t as { type: 'number'; card: NumberCard }).card.id),
        )
        .filter(id => !boardCardIds.has(id));

      return rummySubmitTurn(roomId, botPlayerId, submittedBoard, playedCardIds);
    } else {
      const drawResult = rummyDrawCard(roomId, botPlayerId);
      if (!drawResult.success) return drawResult;
      return {
        success: true,
        room: drawResult.room,
        penaltyWinner: drawResult.penaltyWinner,
      };
    }
  } catch (e) {
    return { success: false, error: '發生錯誤，請稍後再試 (bot play)' };
  }
}

/** 取得目前輪到的 Bot 玩家（若不是 Bot 則回傳 null） */
export function getCurrentBotPlayer(roomId: string): Player | null {
  const room = _getCurrentRoom(roomId);
  if (!room || room.status !== GameStatus.Playing) return null;
  return room.players.find(p => p.playerOrder === room.currentOrder && p.isBot) ?? null;
}

/** 拉密：用手牌換取桌面上的 Joker */
export function rummySwapJoker(
  roomId: string,
  playerId: string,
  handCardId: string,
  jokerCardId: string,
): GameResponse {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return { success: false, error: '房間不存在' };

    const playerIndex = _getCurrentPlayerIndex(
      _rooms[roomIndex].players,
      playerId,
    );
    if (playerIndex === -1) return { success: false, error: '玩家不存在' };

    // 找到手牌
    const handCardIndex = _rooms[roomIndex].players[playerIndex].handCard.findIndex(
      c => c.id === handCardId,
    );
    if (handCardIndex === -1) return { success: false, error: '手牌不存在' };

    const handCard = _rooms[roomIndex].players[playerIndex].handCard[handCardIndex];

    // 找到桌面上的 Joker
    let jokerTile: (typeof _rooms[0]['board'][0]['tiles'][0]) | null = null;
    let groupIdx = -1;
    let tileIdx = -1;

    for (let gi = 0; gi < _rooms[roomIndex].board.length; gi++) {
      const group = _rooms[roomIndex].board[gi];
      for (let ti = 0; ti < group.tiles.length; ti++) {
        const tile = group.tiles[ti];
        if (
          tile.type === 'number' &&
          tile.card.isJoker &&
          tile.card.id === jokerCardId
        ) {
          jokerTile = tile;
          groupIdx = gi;
          tileIdx = ti;
          break;
        }
      }
      if (jokerTile) break;
    }

    if (!jokerTile || jokerTile.type !== 'number') {
      return { success: false, error: '找不到指定的 Joker 牌' };
    }

    const jokerCard = jokerTile.card;

    // 驗證手牌符合 Joker 宣告的 value 與 color
    if (
      handCard.value !== jokerCard.jokerDeclaredValue ||
      handCard.color !== jokerCard.jokerDeclaredColor
    ) {
      return {
        success: false,
        error: '手牌的數值或顏色與 Joker 宣告不符',
      };
    }

    // 將手牌放入 Joker 位置
    _rooms[roomIndex].board[groupIdx].tiles[tileIdx] = {
      type: 'number',
      card: handCard,
    };

    // 移除手牌
    _rooms[roomIndex].players[playerIndex].handCard.splice(handCardIndex, 1);

    // Joker 加入玩家手牌（供本回合使用）
    _rooms[roomIndex].players[playerIndex].handCard.push(jokerCard);

    return { success: true, room: _rooms[roomIndex] };
  } catch (e) {
    return { success: false, error: '發生錯誤，請稍後再試 (rummy swap joker)' };
  }
}
