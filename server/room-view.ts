import { Player } from '../models/Player';
import { BuzzerState, Room, RoomSettings } from '../models/Room';
import {
  LobbyRoomSummary,
  PrivatePlayerState,
  PublicBuzzerState,
  PublicPlayerState,
  PublicRoomState,
  RankedPlayer,
  RoomView,
} from '../models/RoomView';

/**
 * 把伺服器內部的 Room 轉成可以送出的資料。所有欄位都是一個一個挑出來（allowlist），
 * 不是複製整個物件再刪欄位：Room 之後多了新欄位，也不會自動被送出去。
 * 這裡只讀不改，伺服器的 Room 保持完整。
 */

function publicPlayer(player: Player): PublicPlayerState {
  return {
    id: player.id,
    name: player.name,
    score: player.score,
    playerOrder: player.playerOrder,
    isMaster: player.isMaster,
    isLastRoundPlayer: player.isLastRoundPlayer,
    isReady: player.isReady,
    isBot: player.isBot,
    botDifficulty: player.botDifficulty,
    isDisconnected: player.isDisconnected,
    handCardCount: player.handCard.length,
  };
}

function publicSettings(settings: RoomSettings): RoomSettings {
  return {
    deckType: settings.deckType,
    remainSeconds: settings.remainSeconds,
    difficulty: settings.difficulty,
    gameType: settings.gameType,
    buzzerSettings: settings.buzzerSettings
      ? { ...settings.buzzerSettings }
      : undefined,
  };
}

function publicBuzzerState(state: BuzzerState): PublicBuzzerState {
  const playerStates: PublicBuzzerState['playerStates'] = {};
  for (const [id, s] of Object.entries(state.playerStates)) {
    playerStates[id] = {
      isLocked: s.isLocked,
      lockUntil: s.lockUntil,
      streak: s.streak,
    };
  }
  return {
    roundNumber: state.roundNumber,
    publicCards: state.publicCards.map(c => ({ ...c })),
    roundTimerElapsed: state.roundTimerElapsed,
    roundTimerPaused: state.roundTimerPaused,
    currentAnswerPlayerId: state.currentAnswerPlayerId,
    answerStartAt: state.answerStartAt,
    noSolutionVotes: [...state.noSolutionVotes],
    playerStates,
    roundOpen: !!state.roundOpen,
  };
}

/** 同房所有人都一樣的部分 */
export function serializePublicRoom(room: Room): PublicRoomState {
  return {
    roomId: room.roomId,
    roomName: room.roomName,
    hasPassword: !!room.password,
    maxPlayers: room.maxPlayers,
    currentOrder: room.currentOrder,
    deckCount: room.deck.length,
    players: room.players.map(publicPlayer),
    isGameOver: room.isGameOver,
    status: room.status,
    settings: publicSettings(room.settings),
    buzzerState: room.buzzerState
      ? publicBuzzerState(room.buzzerState)
      : undefined,
    isQuickMatch: room.isQuickMatch,
    quickMatchPending: room.quickMatchPending,
    // 已判定正確、正在計分的這一手才公開；還在組的算式是出牌者的私人資料
    playedCards: room.pendingPlay
      ? room.selectedCards.map(c => ({ ...c }))
      : [],
  } as PublicRoomState;
}

/** 只給玩家本人的部分；playerId 必須是伺服器自己確認過的連線身分，不能用前端送來的值 */
export function serializePrivatePlayer(
  room: Room,
  playerId: string,
): PrivatePlayerState | null {
  const player = room.players.find(p => p.id === playerId);
  if (!player) return null;
  const isTurn =
    player.playerOrder !== undefined &&
    player.playerOrder === room.currentOrder;
  return {
    playerId: player.id,
    handCard: player.handCard.map(c => ({ ...c })),
    selectedCards: isTurn ? room.selectedCards.map(c => ({ ...c })) : [],
    roomPassword: player.isMaster ? room.password : undefined,
  };
}

/** 某一位玩家（或不在房內的連線，playerId 為 undefined）收到的房間 */
export function serializeRoomForPlayer(
  room: Room,
  playerId: string | undefined,
): RoomView {
  return {
    ...serializePublicRoom(room),
    self: playerId ? serializePrivatePlayer(room, playerId) : null,
  };
}

/** 大廳列表 */
export function serializeLobbyRoom(room: Room): LobbyRoomSummary {
  return {
    roomId: room.roomId,
    roomName: room.roomName,
    hasPassword: !!room.password,
    maxPlayers: room.maxPlayers,
    playerCount: room.players.length,
    status: room.status,
    gameType: room.settings.gameType,
  } as LobbyRoomSummary;
}

/** 遊戲結束排名（分數高到低） */
export function serializeRanking(players: Player[]): RankedPlayer[] {
  return [...players].sort((a, b) => b.score - a.score).map(publicPlayer);
}
