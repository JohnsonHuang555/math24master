import { GameStatus } from './GameStatus';
import { BotDifficulty, NumberCard } from './Player';
import { BuzzerPlayerState, RoomSettings } from './Room';
import { SelectedCard } from './SelectedCard';

/**
 * 送給客戶端的房間資料（見 server/room-view.ts）。
 *
 * 伺服器內部的 Room 含所有玩家的手牌、牌庫、密碼與待入帳的出牌，不能直接送出。
 * 送出去的一律是 RoomView：公開部分（PublicRoomState）同房每個人都一樣，
 * 私人部分（self）只有該玩家自己的連線收得到。
 *
 * 這些型別都帶著只有序列化函式會加上的標記，內部 Room 少了 hasPassword、deckCount 等必要欄位，
 * 也沒有標記，所以不能被當成 RoomView 傳給送出房間的函式。
 */

declare const publicViewBrand: unique symbol;
/** 只有 server/room-view.ts 的序列化函式會產生這個標記 */
type ViewBrand = { readonly [publicViewBrand]: true };

/** 同房所有人看得到的玩家資料：沒有手牌內容，只有張數 */
export type PublicPlayerState = {
  id: string;
  name: string;
  score: number;
  playerOrder?: number;
  isMaster: boolean;
  isLastRoundPlayer: boolean;
  isReady: boolean;
  isBot?: boolean;
  botDifficulty?: BotDifficulty;
  isDisconnected?: boolean;
  handCardCount: number;
};

/** 搶答模式公開的狀態：公共題目牌本來就要給所有人看 */
export type PublicBuzzerState = {
  roundNumber: number;
  publicCards: NumberCard[];
  roundTimerElapsed: number;
  roundTimerPaused: boolean;
  currentAnswerPlayerId: string | null;
  answerStartAt: number | null;
  noSolutionVotes: string[];
  playerStates: { [playerId: string]: BuzzerPlayerState };
  roundOpen: boolean;
};

export type PublicRoomState = ViewBrand & {
  roomId: string;
  roomName?: string;
  hasPassword: boolean;
  maxPlayers: number;
  currentOrder: number;
  /** 牌庫剩幾張；牌庫內容只留在伺服器 */
  deckCount: number;
  players: PublicPlayerState[];
  isGameOver: boolean;
  status: GameStatus;
  settings: RoomSettings;
  buzzerState?: PublicBuzzerState;
  isQuickMatch?: boolean;
  quickMatchPending?: boolean;
  /**
   * 傳統對戰：伺服器已判定正確、正在計分的這一手。牌已經打出去，所以公開給大家看計分動畫；
   * 還在組算式時是私人資料（只在 self.selectedCards）
   */
  playedCards: SelectedCard[];
};

/** 只送給玩家本人的資料 */
export type PrivatePlayerState = {
  playerId: string;
  handCard: NumberCard[];
  /** 輪到自己時正在組的算式；不是自己的回合時是空的 */
  selectedCards: SelectedCard[];
  /** 房主才拿得到目前的房間密碼（修改房間時預填）；其他人只看得到 hasPassword */
  roomPassword?: string;
};

/** 實際送給某一個連線的房間資料 */
export type RoomView = PublicRoomState & {
  /** 收件人自己的私人資料；不在房內（例如剛被取代的舊分頁）時是 null */
  self: PrivatePlayerState | null;
};

/** 大廳房間列表：只放列表需要的欄位 */
export type LobbyRoomSummary = ViewBrand & {
  roomId: string;
  roomName?: string;
  hasPassword: boolean;
  maxPlayers: number;
  playerCount: number;
  status: GameStatus;
  gameType: RoomSettings['gameType'];
};

/** 遊戲結束的排名：只有公開的玩家資料 */
export type RankedPlayer = PublicPlayerState;

export type GameOverPayload = {
  name: string;
  score: number;
  players: RankedPlayer[];
  isPenaltyGameOver?: boolean;
};

export type BuzzerGameOverPayload = {
  winner: { id: string; name: string; score: number };
  players: RankedPlayer[];
};
