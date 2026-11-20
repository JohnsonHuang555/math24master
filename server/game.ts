import { v4 as uuidv4 } from 'uuid';
import { checkAnswer } from '../lib/answer-check';
import { canMake24, findAllSolutions } from '../lib/daily-seed';
import {
  createDeckByRandomMode,
  createDeckByStandardMode,
  draw,
  shuffleArray,
} from '../lib/deck';
import { ErrorCode } from '../models/ErrorCode';
import { GameMode } from '../models/GameMode';
import { GameStatus } from '../models/GameStatus';
import {
  BotDifficulty,
  HandResult,
  NumberCard,
  Player,
  botPlayerName,
  parseBotPlayerName,
} from '../models/Player';
import { GameResponse } from '../models/Response';
import {
  BuzzerSettings,
  DEFAULT_BUZZER_SETTINGS,
  DeckType,
  Difficulty,
  GameType,
  HAND_CARD_COUNT,
  MAX_CARD_COUNT,
  QUICK_MATCH,
  Room,
} from '../models/Room';
import { SelectedCard } from '../models/SelectedCard';
import { Symbol } from '../models/Symbol';

type JoinRoomResult =
  | { success: true; room: Room; reconnectToken: string }
  | { success: false; error: ErrorCode }
  | { success: false; needPassword: true };

/** 換人的結果；winner 有值代表這一手結束後整局結束 */
export type TurnResult =
  | {
      success: true;
      room: Room;
      winner?: Player;
      handResult?: HandResult;
      /** 這次換人是否把一手已驗證的得分入帳（前端要重置計分動畫） */
      scored?: boolean;
    }
  | { success: false; error: ErrorCode };

type PlayCardResult =
  | { success: true; room: Room; isCorrect: boolean }
  | { success: false; error: ErrorCode };

// 單人經典模式：拿滿該手理論最高分的額外獎勵
const PERFECT_HAND_BONUS = 1;

/** 傳統對戰可用的房間人數與回合秒數範圍 */
const MIN_PLAYERS = 1;
const MAX_PLAYERS = 4;
const MAX_ROUND_SECONDS = 600;

const VALID_SYMBOLS = new Set<string>(Object.values(Symbol));

// 非預期錯誤：玩家只會看到通用訊息，發生在哪個操作記在 server log
function _unexpected(context: string, err?: unknown) {
  console.error(`[game] ${context} failed`, err ?? '');
  return { success: false as const, error: ErrorCode.Unexpected };
}

const _fail = (error: ErrorCode) => ({ success: false as const, error });

// 所有房間資訊
let _rooms: Room[] = [];
// 玩家所在房間（key 為穩定的玩家 id，斷線重連不會改變）
let _playerInRoomMap: { [key: string]: string } = {};
// reconnectToken → { playerId, roomId } 的映射（重連時用）
let _tokenToPlayerMap: Map<string, { playerId: string; roomId: string }> =
  new Map();
// 玩家 → reconnectToken。token 只存在伺服器與玩家本人，不放進 Player 物件，
// 否則會隨 RoomUpdate／房間列表廣播給所有人，任何人都能冒用別人的位置
let _tokenOfPlayer: Map<string, string> = new Map();

/** 測試用：清空所有房間與映射 */
export function resetGameStateForTests() {
  _rooms = [];
  _playerInRoomMap = {};
  _tokenToPlayerMap = new Map();
  _tokenOfPlayer = new Map();
}

function _issueToken(playerId: string, roomId: string): string {
  const existing = _tokenOfPlayer.get(playerId);
  if (existing && _tokenToPlayerMap.get(existing)?.roomId === roomId) {
    return existing;
  }
  if (existing) _tokenToPlayerMap.delete(existing);
  const token = uuidv4();
  _tokenOfPlayer.set(playerId, token);
  _tokenToPlayerMap.set(token, { playerId, roomId });
  return token;
}

function _revokeToken(playerId: string) {
  const token = _tokenOfPlayer.get(playerId);
  if (token) _tokenToPlayerMap.delete(token);
  _tokenOfPlayer.delete(playerId);
}

/** 房間列表給大廳看：不含密碼（只留「有密碼」標記）、牌庫與手牌 */
const PASSWORD_MASK = '******';
function _publicRoom(room: Room): Room {
  return {
    ...room,
    password: room.password ? PASSWORD_MASK : undefined,
    deck: [],
    selectedCards: [],
    players: room.players.map(p => ({ ...p, handCard: [] })),
  };
}

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
  // 快速配對的房間由「快速開始」自動分配，不列在房間列表
  return tempRooms
    .filter(r => r.maxPlayers > 1 && !r.isQuickMatch)
    .map(_publicRoom);
}

const _getCurrentRoom = (roomId: string) => {
  const room = _rooms.find(room => room.roomId === roomId);
  return room;
};

const _getCurrentRoomIndex = (roomId: string) => {
  const roomIndex = _rooms.findIndex(room => room.roomId === roomId);
  return roomIndex;
};

/**
 * 操作者必須真的在這間房裡：房間存在、映射表指向這間房、玩家在名單上。
 * 所有由玩家觸發的操作都先經過這裡，送別間房的 roomId 也沒用
 */
function _member(
  roomId: string,
  playerId: string,
):
  | { ok: true; room: Room; roomIndex: number; player: Player }
  | { ok: false; error: ErrorCode } {
  const roomIndex = _getCurrentRoomIndex(roomId);
  if (roomIndex === -1) return { ok: false, error: ErrorCode.RoomNotFound };
  const room = _rooms[roomIndex];
  const player = room.players.find(p => p.id === playerId);
  if (!player || _playerInRoomMap[playerId] !== roomId) {
    return { ok: false, error: ErrorCode.PlayerNotFound };
  }
  return { ok: true, room, roomIndex, player };
}

/** 房主限定、且只能在等待中（遊戲進行中改設定或踢人會破壞牌局） */
function _masterWhileIdle(roomId: string, playerId: string) {
  const m = _member(roomId, playerId);
  if (!m.ok) return m;
  if (!m.player.isMaster)
    return { ok: false as const, error: ErrorCode.NotRoomMaster };
  if (m.room.status !== GameStatus.Idle) {
    return { ok: false as const, error: ErrorCode.GameInProgress };
  }
  return m;
}

/** 傳統對戰的牌面操作：遊戲進行中、輪到自己 */
function _currentTurn(roomId: string, playerId: string) {
  const m = _member(roomId, playerId);
  if (!m.ok) return m;
  if (m.room.status !== GameStatus.Playing || m.room.isGameOver) {
    return { ok: false as const, error: ErrorCode.GameNotStarted };
  }
  if (m.room.settings.gameType === 'buzzer') {
    return { ok: false as const, error: ErrorCode.GameNotStarted };
  }
  if (m.player.playerOrder !== m.room.currentOrder) {
    return { ok: false as const, error: ErrorCode.NotYourTurn };
  }
  return m;
}

export function isRoomMember(roomId: string, playerId: string): boolean {
  return _member(roomId, playerId).ok;
}

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
  // 換人時清掉上一位沒出完的算式
  _rooms[roomIndex].selectedCards = [];
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
    _rooms[roomIndex].pendingPlay = undefined;
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

export function getCurrentRoomId(playerId: string): string | undefined {
  return _playerInRoomMap[playerId];
}

export function getPlayerName(roomId: string, playerId: string) {
  const m = _member(roomId, playerId);
  return m.ok ? m.player.name : undefined;
}

export function checkCanJoinRoom(
  roomId: string,
  playerId: string,
  mode: GameMode,
) {
  const room = _getCurrentRoom(roomId);
  // 房間不存在：建立新房（單人或多人）
  if (!room) return mode === GameMode.Single || mode === GameMode.Multiple;

  // 房間已存在時一律套用多人規則，送 mode=single 也不能繞過人數上限
  const existing = room.players.find(player => player.id === playerId);
  // 房主重新整理後重新加入：沿用原本的位置
  if (existing?.isMaster) return true;
  // 已在房內的一般玩家不重複加入
  if (existing) return false;
  if (room.maxPlayers <= room.players.length) return false;
  // 遊戲進行中不能中途加入（沒有手牌與順序，會讓回合卡住）
  if (room.status !== GameStatus.Idle) return false;
  return true;
}

// 加入房間
export function joinRoom(
  payload: Pick<Room, 'roomId' | 'maxPlayers' | 'roomName' | 'password'> & {
    difficulty?: Difficulty;
    gameType?: GameType;
    remainSeconds?: number | null;
    buzzerSettings?: BuzzerSettings;
  },
  playerId: string,
  playerName: string,
  mode: GameMode,
): JoinRoomResult {
  try {
    const roomIndex = _getCurrentRoomIndex(payload.roomId);

    if (roomIndex !== -1) {
      const room = _rooms[roomIndex];
      const existing = room.players.find(p => p.id === playerId);
      if (existing?.isMaster) {
        _playerInRoomMap[playerId] = payload.roomId;
        return {
          success: true,
          room,
          reconnectToken: _issueToken(playerId, payload.roomId),
        };
      }
      if (existing) {
        return { success: false, error: ErrorCode.RoomFullOrNotFound };
      }
      if (room.status !== GameStatus.Idle) {
        return { success: false, error: ErrorCode.GameInProgress };
      }
      if (room.players.length >= room.maxPlayers) {
        return { success: false, error: ErrorCode.RoomFull };
      }

      // 當房間有設密碼需要回傳密碼輸入事件
      if (room.password) {
        if (!payload.password) {
          return { success: false, needPassword: true };
        }
        if (room.password !== payload.password) {
          return { success: false, error: ErrorCode.WrongPassword };
        }
      }

      room.players.push({
        id: playerId,
        isMaster: false,
        name: playerName,
        handCard: [],
        score: 0,
        isLastRoundPlayer: false,
        // 快速配對倒數中不需要按準備，時間到就自動開局
        isReady: !!room.quickMatchPending,
      });
      _playerInRoomMap[playerId] = payload.roomId;

      return {
        success: true,
        room,
        reconnectToken: _issueToken(playerId, payload.roomId),
      };
    }

    // 沒有房間名稱，表示房間已經被刪除剛好有玩家加入時
    if (mode === GameMode.Multiple && !payload.roomName) {
      return { success: false, error: ErrorCode.RoomNotFound };
    }
    // 建立房間時已經有相同成稱的房間需擋掉
    if (mode === GameMode.Multiple && payload.roomName) {
      const existRoomName = _rooms.find(
        room => room.roomName === payload.roomName,
      );
      if (existRoomName)
        return { success: false, error: ErrorCode.RoomNameTaken };
    }
    if (
      !_isValidMaxPlayers(payload.maxPlayers) ||
      !_isValidRemainSeconds(payload.remainSeconds)
    ) {
      return { success: false, error: ErrorCode.InvalidRoomSettings };
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
        remainSeconds:
          payload.remainSeconds === undefined ? 60 : payload.remainSeconds,
        difficulty: payload.difficulty ?? Difficulty.Normal,
        gameType: payload.gameType ?? 'classic',
        buzzerSettings:
          payload.gameType === 'buzzer'
            ? (payload.buzzerSettings ?? DEFAULT_BUZZER_SETTINGS)
            : undefined,
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
    _playerInRoomMap[playerId] = payload.roomId;

    return {
      success: true,
      room: newRoom,
      reconnectToken: _issueToken(playerId, payload.roomId),
    };
  } catch (e) {
    return _unexpected('join room', e);
  }
}

function _isValidMaxPlayers(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= MIN_PLAYERS &&
    (value as number) <= MAX_PLAYERS
  );
}

function _isValidRemainSeconds(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'number' &&
      Number.isInteger(value) &&
      value > 0 &&
      value <= MAX_ROUND_SECONDS)
  );
}

export type LeaveRoomResult = {
  room: Room;
  playerName: string;
  wasPlaying: boolean;
  remainingCount: number;
  /** 離開的玩家正在搶答作答中：作答計時要清掉、回合計時要恢復 */
  wasAnswering: boolean;
};

/**
 * 離開房間（主動離開、被踢、斷線寬限期到期都走這裡）。
 * 回傳 undefined：玩家本來就不在房間裡；roomDeleted：真人都走了，房間已刪除
 */
export function leaveRoom(
  playerId: string,
): LeaveRoomResult | { roomDeleted: true; roomId: string } | undefined {
  const roomId = _playerInRoomMap[playerId];
  const room = _getCurrentRoom(roomId);
  // 房間不存在
  if (!room || !roomId) {
    delete _playerInRoomMap[playerId];
    return;
  }

  // 離開的玩家資訊
  const leavingPlayer = room.players.find(player => player.id === playerId);
  const leftPlayerName = leavingPlayer?.name;
  const wasPlaying = room.status === GameStatus.Playing;

  // 清除 reconnect token，防止已離開玩家的 token 觸發意外重連
  _revokeToken(playerId);
  const wasCurrentTurn =
    leavingPlayer?.playerOrder !== undefined &&
    leavingPlayer.playerOrder === room.currentOrder;

  const newPlayers = room.players.filter(player => player.id !== playerId);
  delete _playerInRoomMap[playerId];

  // 若剩下的全是 Bot（無人類），直接刪除房間
  const humanPlayersLeft = newPlayers.filter(p => !p.isBot);
  if (humanPlayersLeft.length === 0) {
    _rooms = _rooms.filter(r => r.roomId !== roomId);
    // 房內其他人的 token 一併失效（只剩電腦，不會有人重連）
    for (const p of room.players) _revokeToken(p.id);
    return { roomDeleted: true, roomId };
  }

  const hasMaster = newPlayers.find(player => player.isMaster);

  // 如果房主已離開房間，由第一位真人玩家接手（電腦不能當房主）
  if (!hasMaster) {
    humanPlayersLeft[0].isMaster = true;
    humanPlayersLeft[0].isReady = true;
  }

  // 遊戲中且剩餘 ≥ 2 人：繼續遊戲；否則回到等待狀態
  const newStatus =
    wasPlaying && newPlayers.length >= 2 ? GameStatus.Playing : GameStatus.Idle;

  // 搶答：離開的人的狀態、投票一併移除；正在作答就把作答權收回
  let buzzerState = room.buzzerState;
  const wasAnswering = buzzerState?.currentAnswerPlayerId === playerId;
  if (buzzerState) {
    const playerStates = { ...buzzerState.playerStates };
    delete playerStates[playerId];
    buzzerState = {
      ...buzzerState,
      playerStates,
      noSolutionVotes: buzzerState.noSolutionVotes.filter(
        id => id !== playerId,
      ),
      ...(wasAnswering
        ? {
            currentAnswerPlayerId: null,
            answerStartAt: null,
            roundTimerPaused: false,
          }
        : {}),
    };
  }

  _rooms = _rooms.map(r => {
    if (r.roomId === roomId) {
      return {
        ...r,
        players: newPlayers,
        status: newStatus,
        isGameOver: newStatus === GameStatus.Idle ? false : r.isGameOver,
        buzzerState: newStatus === GameStatus.Idle ? undefined : buzzerState,
        // 離開的人還沒入帳的得分作廢
        pendingPlay:
          r.pendingPlay?.playerId === playerId ? undefined : r.pendingPlay,
        selectedCards: wasCurrentTurn ? [] : r.selectedCards,
      };
    }
    return r;
  });

  const roomIndex = _getCurrentRoomIndex(roomId);

  // 若遊戲中且是該玩家的回合，自動前進到下一位玩家
  if (newStatus === GameStatus.Playing && wasCurrentTurn) {
    _nextPlayerTurn(roomIndex);
  }

  return {
    room: _rooms[roomIndex],
    playerName: leftPlayerName || 'player?',
    wasPlaying,
    remainingCount: newPlayers.length,
    wasAnswering,
  };
}

// 將玩家標記為暫時斷線（寬限期中，不立即移除）
export function markPlayerDisconnected(
  playerId: string,
):
  | { roomId: string; room: Room; playerName: string; reconnectToken: string }
  | undefined {
  const roomId = _playerInRoomMap[playerId];
  const room = _getCurrentRoom(roomId);
  if (!room || !roomId) return undefined;

  const player = room.players.find(p => p.id === playerId);
  const reconnectToken = _tokenOfPlayer.get(playerId);
  if (!player || !reconnectToken) return undefined;

  player.isDisconnected = true;
  player.disconnectedAt = Date.now();

  return {
    roomId,
    room,
    playerName: player.name,
    reconnectToken,
  };
}

/**
 * 玩家重連：以 token 找回原本的玩家。玩家 id 保持不變（socket 與玩家的對應由連線層管理），
 * 所以回合順序、搶答狀態、計時器都不用跟著改 id
 */
/** 查 token 代表哪位玩家，不改任何狀態（重連前先檢查身分用） */
export function peekReconnectToken(
  reconnectToken: unknown,
): { playerId: string; roomId: string } | undefined {
  if (typeof reconnectToken !== 'string') return undefined;
  const entry = _tokenToPlayerMap.get(reconnectToken);
  return entry ? { ...entry } : undefined;
}

export function reconnectPlayer(
  reconnectToken: string,
):
  | { success: true; room: Room; playerId: string; playerName: string }
  | { success: false; error: ErrorCode } {
  const entry =
    typeof reconnectToken === 'string'
      ? _tokenToPlayerMap.get(reconnectToken)
      : undefined;
  if (!entry) return { success: false, error: ErrorCode.ReconnectTokenInvalid };

  const { playerId, roomId } = entry;
  const room = _getCurrentRoom(roomId);
  if (!room) {
    _revokeToken(playerId);
    return { success: false, error: ErrorCode.RoomNotFound };
  }

  const player = room.players.find(p => p.id === playerId);
  if (!player) {
    _revokeToken(playerId);
    return { success: false, error: ErrorCode.PlayerNotFound };
  }

  player.isDisconnected = false;
  player.disconnectedAt = undefined;
  _playerInRoomMap[playerId] = roomId;

  return { success: true, room, playerId, playerName: player.name };
}

/** 房主按開始：房主、等待中、所有人都準備好 */
export function canStartGame(roomId: string, playerId: string) {
  const m = _masterWhileIdle(roomId, playerId);
  if (!m.ok) return m;
  if (!m.room.players.every(p => p.isReady)) {
    return { ok: false as const, error: ErrorCode.PlayersNotReady };
  }
  return { ok: true as const, room: m.room };
}

// 開始遊戲（呼叫前要先通過 canStartGame，或由快速配對直接開局）
export function startGame(roomId: string): GameResponse {
  const room = _getCurrentRoom(roomId);
  if (!room) return { success: false, error: ErrorCode.RoomNotFound };
  if (room.status !== GameStatus.Idle) {
    return { success: false, error: ErrorCode.GameInProgress };
  }

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
        tempDeck = createDeckByStandardMode(2, maxValue);
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
        return { success: false, error: ErrorCode.StartGameFailed };
    }

    // 若牌庫大小不是 4 的倍數，隨機移除多餘的牌，確保不會有孤牌剩餘
    const remainder = tempDeck.length % 4;
    if (remainder !== 0) {
      tempDeck = shuffleArray(tempDeck).slice(remainder);
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
      return _unexpected('shuffle');

    let remainingDeck = shuffledDeck;
    shuffledPlayerOrder.forEach((order, index) => {
      _rooms[roomIndex].players[index].playerOrder = order;
      _rooms[roomIndex].players[index].score = 0;
      _rooms[roomIndex].players[index].isLastRoundPlayer = false;
      _rooms[roomIndex].players[index].handCard = [];
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
    _rooms[roomIndex].pendingPlay = undefined;
    _rooms[roomIndex].buzzerState = undefined;

    return { success: true, room: _rooms[roomIndex] };
  } catch (e) {
    return _unexpected('start game', e);
  }
}

// 準備遊戲（只在等待中有意義；房主一律視為準備好）
export function readyGame(roomId: string, playerId: string): GameResponse {
  const m = _member(roomId, playerId);
  if (!m.ok) return _fail(m.error);
  if (m.room.status !== GameStatus.Idle) return _fail(ErrorCode.GameInProgress);
  if (m.player.isMaster) return { success: true, room: m.room };

  m.player.isReady = !m.player.isReady;
  return { success: true, room: m.room };
}

/** 抽牌並換下一位（內部用：出牌入帳、跳過、回合時間到都會走到這裡） */
function _drawAndAdvance(
  roomIndex: number,
  playerIndex: number,
  count: number,
): TurnResult {
  const gameOver = _checkGameOver(roomIndex, playerIndex);
  if (gameOver) {
    return { success: true, room: gameOver.room, winner: gameOver.winner };
  }
  const room = _rooms[roomIndex];
  const player = room.players[playerIndex];
  if (room.deck.length <= count) {
    player.handCard.push(...room.deck);
    room.deck = [];
    const hasLastTag = room.players.find(p => p.isLastRoundPlayer);
    if (!hasLastTag) {
      // 標記為最後一位玩家
      player.isLastRoundPlayer = true;
    }
  } else if (count > 0) {
    const result = _drawSolvableHand(roomIndex, count);
    player.handCard.push(...result.drawn);
    room.deck = result.deck;
  }

  // 切換下一位玩家
  _nextPlayerTurn(roomIndex);
  return { success: true, room };
}

// 不出牌，抽一張牌並結束回合
export function drawCard(roomId: string, playerId: string): TurnResult {
  try {
    const t = _currentTurn(roomId, playerId);
    if (!t.ok) return _fail(t.error);
    // 已經答對、等著入帳：不能改成抽牌（入帳由 UpdateScore 或回合時間到處理）
    if (t.room.pendingPlay) return _fail(ErrorCode.InvalidEquation);
    const playerIndex = t.room.players.indexOf(t.player);
    t.room.selectedCards = [];
    return _drawAndAdvance(t.roomIndex, playerIndex, 1);
  } catch (e) {
    return _unexpected('draw card', e);
  }
}

// 棄牌：只有手牌超過上限（抽牌後變成 5 張）時，丟掉自己的一張
export function discardCard(
  roomId: string,
  playerId: string,
  cardId: string,
): GameResponse {
  try {
    const m = _member(roomId, playerId);
    if (!m.ok) return _fail(m.error);
    if (m.room.status !== GameStatus.Playing) {
      return _fail(ErrorCode.GameNotStarted);
    }
    if (m.player.handCard.length <= MAX_CARD_COUNT) {
      return _fail(ErrorCode.TooManyCards);
    }
    if (!m.player.handCard.some(c => c.id === cardId)) {
      return _fail(ErrorCode.CardNotInHand);
    }
    m.player.handCard = m.player.handCard.filter(c => c.id !== cardId);
    return { success: true, room: m.room };
  } catch (e) {
    return _unexpected('discard card', e);
  }
}

/** 本手得分：+、- 各 1 分，× 2 分，÷ 3 分，兩個以上 × 或 ÷ 各再加 1 分 */
function _scoreOf(selectedCards: SelectedCard[]) {
  let score = 0;
  const plusAndMinusCount = selectedCards.filter(
    c => c.symbol && [Symbol.Plus, Symbol.Minus].includes(c.symbol),
  ).length;
  score += plusAndMinusCount;
  const timesCount = selectedCards.filter(
    c => c.symbol === Symbol.Times,
  ).length;
  const divideCount = selectedCards.filter(
    c => c.symbol === Symbol.Divide,
  ).length;
  score += timesCount * 2;
  score += divideCount * 3;
  if (timesCount >= 2) score += 1;
  if (divideCount >= 2) score += 1;
  return score;
}

/**
 * 出牌：伺服器以自己保存的手牌數值驗算（必須用完全部手牌、算式成立、等於 24）。
 * 答對就移除手牌、算好得分記在 pendingPlay，等 UpdateScore（播完動畫）或回合時間到才入帳
 */
export function playCard(roomId: string, playerId: string): PlayCardResult {
  try {
    const t = _currentTurn(roomId, playerId);
    if (!t.ok) return _fail(t.error);
    if (t.room.pendingPlay) return _fail(ErrorCode.InvalidEquation);

    const player = t.player;
    const selectedCards = t.room.selectedCards;
    const check = checkAnswer(
      player.handCard.map(c => c.id),
      selectedCards,
    );
    if (!check.ok) {
      return { success: true, room: t.room, isCorrect: false };
    }

    let score = _scoreOf(selectedCards);
    const numberCardIds = selectedCards.flatMap(c =>
      c.number ? [c.number.id] : [],
    );

    // 單人經典模式：計算本手理論最高分，拿滿給完美手 bonus
    let handResult: HandResult | undefined;
    if (t.room.maxPlayers === 1) {
      const values = selectedCards
        .filter(c => c.number)
        .map(c => c.number!.value);
      const solutions = findAllSolutions(values);
      const maxScore = solutions.length > 0 ? solutions[0].score : score;
      const isPerfect = score >= maxScore;
      handResult = { roundScore: score, maxScore, isPerfect };
      if (isPerfect) score += PERFECT_HAND_BONUS;
    }

    player.handCard = player.handCard.filter(
      c => !numberCardIds.includes(c.id),
    );
    t.room.pendingPlay = {
      playerId,
      score,
      drawCount: numberCardIds.length,
      handResult,
    };
    return { success: true, room: t.room, isCorrect: true };
  } catch (e) {
    return _unexpected('play card', e);
  }
}

/** 退回上一步 */
export function backCard(roomId: string, playerId: string): GameResponse {
  try {
    const t = _currentTurn(roomId, playerId);
    if (!t.ok) return _fail(t.error);
    if (t.room.pendingPlay) return _fail(ErrorCode.InvalidEquation);
    t.room.selectedCards.pop();
    return { success: true, room: t.room };
  } catch (error) {
    return _unexpected('back card', error);
  }
}

/** 入帳已驗證的一手（UpdateScore 與回合時間到共用） */
function _settlePendingPlay(roomIndex: number): TurnResult {
  const room = _rooms[roomIndex];
  const pending = room.pendingPlay;
  if (!pending) return _fail(ErrorCode.InvalidEquation);
  const playerIndex = room.players.findIndex(p => p.id === pending.playerId);
  room.pendingPlay = undefined;
  if (playerIndex === -1) return _fail(ErrorCode.PlayerNotFound);
  const player = room.players[playerIndex];

  player.score += pending.score;
  if (pending.handResult) {
    player.perfectHands =
      (player.perfectHands ?? 0) + (pending.handResult.isPerfect ? 1 : 0);
    player.theoreticalMax =
      (player.theoreticalMax ?? 0) +
      pending.handResult.maxScore +
      PERFECT_HAND_BONUS;
  }
  room.selectedCards = [];

  const result = _drawAndAdvance(roomIndex, playerIndex, pending.drawCount);
  if (!result.success) return result;
  return { ...result, handResult: pending.handResult, scored: true };
}

/**
 * 前端播完計分動畫後送出：只把 playCard 驗證過的得分入帳一次。
 * 沒有答對過（沒有 pendingPlay）就沒有分數，重複送出也不會重複計分
 */
export function updateScore(roomId: string, playerId: string): TurnResult {
  try {
    const t = _currentTurn(roomId, playerId);
    if (!t.ok) return _fail(t.error);
    if (t.room.pendingPlay?.playerId !== playerId) {
      return _fail(ErrorCode.InvalidEquation);
    }
    return _settlePendingPlay(t.roomIndex);
  } catch (e) {
    return _unexpected('update score', e);
  }
}

/**
 * 回合時間到（由伺服器的計時器呼叫，不依賴前端送抽牌事件）：
 * 已答對等入帳就入帳換人；否則替目前玩家抽一張換人
 */
export function handleTurnTimeout(roomId: string): TurnResult {
  try {
    const roomIndex = _getCurrentRoomIndex(roomId);
    if (roomIndex === -1) return _fail(ErrorCode.RoomNotFound);
    const room = _rooms[roomIndex];
    if (room.status !== GameStatus.Playing || room.isGameOver) {
      return _fail(ErrorCode.GameNotStarted);
    }
    if (room.pendingPlay) return _settlePendingPlay(roomIndex);
    const playerIndex = room.players.findIndex(
      p => p.playerOrder === room.currentOrder,
    );
    if (playerIndex === -1) return _fail(ErrorCode.PlayerNotFound);
    room.selectedCards = [];
    return _drawAndAdvance(roomIndex, playerIndex, 1);
  } catch (e) {
    return _unexpected('turn timeout', e);
  }
}

/**
 * 選牌或符號。數字牌只送 id，數值一律取自伺服器保存的手牌，不能自己帶數字
 */
export function selectCard(
  roomId: string,
  playerId: string,
  number: Pick<NumberCard, 'id'> | undefined,
  symbol: Symbol | undefined,
): GameResponse {
  try {
    const t = _currentTurn(roomId, playerId);
    if (!t.ok) return _fail(t.error);
    if (t.room.pendingPlay) return _fail(ErrorCode.InvalidEquation);
    if (!number && !symbol) return _fail(ErrorCode.InvalidEquation);
    if (symbol !== undefined && !VALID_SYMBOLS.has(symbol)) {
      return _fail(ErrorCode.InvalidEquation);
    }

    const selectedCards = t.room.selectedCards;

    if (selectedCards.length === 0 && symbol && symbol !== Symbol.LeftBracket) {
      return { success: false, error: ErrorCode.FirstMustBeNumberOrLeftParen };
    }

    if (number) {
      const handCard = t.player.handCard.find(c => c.id === number?.id);
      if (!handCard) return _fail(ErrorCode.CardNotInHand);
      const currentSelect = selectedCards[selectedCards.length - 1];

      // 如果前一個是數字則不能選
      if (currentSelect?.number && currentSelect?.number.id !== handCard.id) {
        return { success: false, error: ErrorCode.ConsecutiveNumbers };
      }

      if (currentSelect?.symbol === Symbol.RightBracket) {
        selectedCards.push({ symbol: Symbol.Times });
      }

      const isExistIndex = selectedCards.findIndex(
        s => s.number?.id === handCard.id,
      );
      if (isExistIndex !== -1) {
        selectedCards.splice(isExistIndex, 1);
      } else {
        selectedCards.push({ number: { ...handCard } });
      }
    }
    if (symbol) {
      const lastCard = selectedCards[selectedCards.length - 1];
      if (lastCard?.symbol === Symbol.Minus && symbol === Symbol.Minus) {
        return { success: false, error: ErrorCode.ConsecutiveMinus };
      }

      if (lastCard?.symbol === Symbol.Plus && symbol === Symbol.Plus) {
        return { success: false, error: ErrorCode.ConsecutivePlus };
      }

      if (lastCard?.symbol === Symbol.Times && symbol === Symbol.Times) {
        return { success: false, error: ErrorCode.ConsecutiveTimes };
      }

      if (lastCard?.symbol === Symbol.Divide && symbol === Symbol.Divide) {
        return { success: false, error: ErrorCode.ConsecutiveDivide };
      }

      if (
        lastCard?.symbol === Symbol.LeftBracket &&
        [Symbol.Plus, Symbol.Minus].includes(symbol)
      ) {
        return { success: false, error: ErrorCode.PlusMinusAfterLeftParen };
      }

      // 數字或右括號後面接左括號：自動補上乘號（mathjs 的隱式乘法不算分，也不會被驗算接受）
      if (
        symbol === Symbol.LeftBracket &&
        (lastCard?.number || lastCard?.symbol === Symbol.RightBracket)
      ) {
        selectedCards.push({ symbol: Symbol.Times });
      }
      selectedCards.push({ symbol });
    }

    return { success: true, room: t.room };
  } catch (e) {
    return _unexpected('select card', e);
  }
}

export function reselectCard(roomId: string, playerId: string): GameResponse {
  try {
    const t = _currentTurn(roomId, playerId);
    if (!t.ok) return _fail(t.error);
    if (t.room.pendingPlay) return _fail(ErrorCode.InvalidEquation);
    t.room.selectedCards = [];
    return { success: true, room: t.room };
  } catch (e) {
    return _unexpected('reselect card', e);
  }
}

export function editRoom(
  roomId: string,
  playerId: string,
  newRoomName: string,
  newPassword: string,
): GameResponse {
  try {
    const m = _masterWhileIdle(roomId, playerId);
    if (!m.ok) return _fail(m.error);
    if (typeof newRoomName !== 'string' || !newRoomName.trim()) {
      return _fail(ErrorCode.InvalidRoomSettings);
    }
    const taken = _rooms.some(
      r => r.roomId !== roomId && r.roomName === newRoomName,
    );
    if (taken) return _fail(ErrorCode.RoomNameTaken);

    m.room.roomName = newRoomName;
    m.room.password = newPassword || undefined;

    return { success: true, room: m.room };
  } catch (e) {
    return _unexpected('edit room', e);
  }
}

export function editRoomSettings(
  roomId: string,
  playerId: string,
  settings: {
    maxPlayers?: number;
    deckType?: DeckType;
    remainSeconds?: number | null;
    difficulty?: Difficulty;
    gameType?: GameType;
    buzzerSettings?: BuzzerSettings;
  },
): GameResponse {
  try {
    const m = _masterWhileIdle(roomId, playerId);
    if (!m.ok) return _fail(m.error);
    const {
      maxPlayers,
      deckType,
      remainSeconds,
      difficulty,
      gameType,
      buzzerSettings,
    } = settings ?? {};

    if (maxPlayers !== undefined && maxPlayers !== null) {
      // 不能低於目前房內人數，也不能超過牌庫支援的上限
      if (
        !_isValidMaxPlayers(maxPlayers) ||
        maxPlayers < m.room.players.length
      ) {
        return _fail(ErrorCode.InvalidRoomSettings);
      }
    }
    if (!_isValidRemainSeconds(remainSeconds)) {
      return _fail(ErrorCode.InvalidRoomSettings);
    }
    if (deckType && !Object.values(DeckType).includes(deckType)) {
      return _fail(ErrorCode.InvalidRoomSettings);
    }
    if (difficulty && !Object.values(Difficulty).includes(difficulty)) {
      return _fail(ErrorCode.InvalidRoomSettings);
    }
    if (gameType && gameType !== 'classic' && gameType !== 'buzzer') {
      return _fail(ErrorCode.InvalidRoomSettings);
    }

    if (maxPlayers) m.room.maxPlayers = maxPlayers;
    if (deckType) m.room.settings.deckType = deckType;
    if (remainSeconds !== undefined)
      m.room.settings.remainSeconds = remainSeconds;
    if (difficulty) m.room.settings.difficulty = difficulty;
    if (gameType) m.room.settings.gameType = gameType;
    if (buzzerSettings !== undefined) {
      m.room.settings.buzzerSettings = buzzerSettings;
    }

    return { success: true, room: m.room };
  } catch (e) {
    return _unexpected('edit room settings', e);
  }
}

// 跳過（換 4 張新牌，無得分）
export function skipHand(roomId: string, playerId: string): TurnResult {
  try {
    const t = _currentTurn(roomId, playerId);
    if (!t.ok) return _fail(t.error);
    if (t.room.pendingPlay) return _fail(ErrorCode.InvalidEquation);
    const roomIndex = t.roomIndex;
    const playerIndex = t.room.players.indexOf(t.player);

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
      const hasLastTag = _rooms[roomIndex].players.find(
        p => p.isLastRoundPlayer,
      );
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
    return _unexpected('skip hand', e);
  }
}

/**
 * 房主把玩家（或電腦）移出房間：只能在等待中、不能踢自己、目標要真的在房裡。
 * 被踢的人的 token 一併失效，不能再用重連回來
 */
export function removePlayer(
  roomId: string,
  requesterId: string,
  targetId: string,
): GameResponse {
  try {
    const m = _masterWhileIdle(roomId, requesterId);
    if (!m.ok) return _fail(m.error);
    if (targetId === requesterId) return _fail(ErrorCode.InvalidRoomSettings);

    const playerIndex = m.room.players.findIndex(p => p.id === targetId);
    if (playerIndex === -1) return _fail(ErrorCode.PlayerNotFound);

    m.room.players.splice(playerIndex, 1);
    _revokeToken(targetId);
    delete _playerInRoomMap[targetId];

    return { success: true, room: m.room };
  } catch (e) {
    return _unexpected('remove player', e);
  }
}

function _addBot(roomIndex: number, difficulty: BotDifficulty): GameResponse {
  const room = _rooms[roomIndex];
  if (room.players.length >= room.maxPlayers) {
    return { success: false, error: ErrorCode.RoomFull };
  }
  if (!['easy', 'normal', 'hard'].includes(difficulty)) {
    return _fail(ErrorCode.InvalidRoomSettings);
  }

  // 電腦不只一個時加上編號，玩家才分得出誰是誰；取最小的空號，中途移除過也不會重複
  const usedIndexes = new Set(
    room.players
      .map(p => parseBotPlayerName(p.name)?.index)
      .filter(index => index !== undefined),
  );
  let index = 1;
  while (usedIndexes.has(index)) index++;
  const botName = botPlayerName(difficulty, index);

  const bot: Player = {
    id: `bot-${uuidv4()}`,
    name: botName,
    isBot: true,
    botDifficulty: difficulty,
    handCard: [],
    score: 0,
    isMaster: false,
    isReady: true,
    isLastRoundPlayer: false,
  };

  room.players.push(bot);
  return { success: true, room };
}

/** 房主加入 Bot 玩家到房間（等待中才能加） */
export function addBotToRoom(
  roomId: string,
  requesterId: string,
  difficulty: BotDifficulty,
): GameResponse {
  try {
    const m = _masterWhileIdle(roomId, requesterId);
    if (!m.ok) return _fail(m.error);
    return _addBot(m.roomIndex, difficulty);
  } catch (e) {
    return _unexpected('add bot', e);
  }
}

// ─── 快速配對 ─────────────────────────────────────────────────────────────────

/** 找一間還在配對倒數、真人還沒滿的快速配對房間 */
export function findQuickMatchRoom(): Room | undefined {
  return _rooms.find(
    r =>
      r.isQuickMatch &&
      r.quickMatchPending &&
      r.status === GameStatus.Idle &&
      r.players.filter(p => !p.isBot).length < r.maxPlayers,
  );
}

/** 開一間新的快速配對房間，開房的玩家是房主；遊戲類型固定為搶答 */
export function createQuickMatchRoom(
  roomId: string,
  playerId: string,
  playerName: string,
): JoinRoomResult {
  try {
    _playerInRoomMap[playerId] = roomId;
    const newRoom: Room = {
      roomId,
      maxPlayers: QUICK_MATCH.maxPlayers,
      deck: [],
      currentOrder: -1,
      isGameOver: false,
      selectedCards: [],
      status: GameStatus.Idle,
      isQuickMatch: true,
      quickMatchPending: true,
      settings: {
        deckType: DeckType.Standard,
        remainSeconds: null,
        difficulty: Difficulty.Normal,
        gameType: 'buzzer',
        buzzerSettings: DEFAULT_BUZZER_SETTINGS,
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
      success: true,
      room: newRoom,
      reconnectToken: _issueToken(playerId, roomId),
    };
  } catch (e) {
    return _unexpected('create quick match room', e);
  }
}

/**
 * 配對結束：用電腦補到 QUICK_MATCH.fillTo 人，房間轉成一般房間（之後可以再開下一局）。
 * 回傳 null 代表房間已不存在或已經開局過（倒數結束與「不等了」同時觸發時只會開一次）
 */
export function finishQuickMatch(roomId: string): Room | null {
  const roomIndex = _getCurrentRoomIndex(roomId);
  if (roomIndex === -1) return null;
  const room = _rooms[roomIndex];
  if (!room.quickMatchPending || room.status !== GameStatus.Idle) {
    return null;
  }
  while (room.players.length < QUICK_MATCH.fillTo) {
    const result = _addBot(roomIndex, QUICK_MATCH.botDifficulty);
    if (!result.success) break;
  }
  room.quickMatchPending = false;
  room.players = room.players.map(p => ({ ...p, isReady: true }));
  return room;
}

// ─── Buzzer 模式輔助 ──────────────────────────────────────────────────────────

/** 將 buzzer pure functions 回傳的 Room 物件同步回 _rooms[] */
export function applyBuzzerRoomUpdate(
  updatedRoom: Room | undefined,
): Room | null {
  if (!updatedRoom) return null;
  const roomIndex = _getCurrentRoomIndex(updatedRoom.roomId);
  if (roomIndex === -1) return null;
  _rooms[roomIndex] = updatedRoom;
  return _rooms[roomIndex];
}

/** 取得當前房間（供 buzzer timer callbacks 使用） */
export function getCurrentRoom(roomId: string): Room | undefined {
  return _getCurrentRoom(roomId);
}

/** Buzzer 遊戲結束：將房間重設為 Idle（等待下一局），清除 buzzerState */
export function endBuzzerGame(roomId: string): Room | null {
  const roomIndex = _getCurrentRoomIndex(roomId);
  if (roomIndex === -1) return null;
  _rooms[roomIndex].status = GameStatus.Idle;
  _rooms[roomIndex].isGameOver = false;
  _rooms[roomIndex].buzzerState = undefined;
  _rooms[roomIndex].players = _rooms[roomIndex].players.map(p => ({
    ...p,
    // 房主一律是準備好的狀態（與傳統對戰結束時一致）
    isReady: !!p.isBot || p.isMaster,
  }));
  return _rooms[roomIndex];
}
