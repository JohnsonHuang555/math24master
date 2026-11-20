import { GameStatus } from './GameStatus';
import { CardColor, HandResult, NumberCard, Player } from './Player';
import { SelectedCard } from './SelectedCard';

// 起始手牌數
export const HAND_CARD_COUNT = 4;
// 最大手牌數
export const MAX_CARD_COUNT = 4;
// 算式中最多數字牌數
export const MAX_FORMULAS_NUMBER_COUNT = 4;

export enum DeckType {
  Standard = 'standard',
  Random = 'random',
}

export type GameType = 'classic' | 'buzzer';

export enum Difficulty {
  Easy = 'easy',
  Normal = 'normal',
  Hard = 'hard',
}

export type BuzzerSettings = {
  presetMode: 'standard' | 'fast' | 'casual' | 'custom';
  answerSeconds: 10 | 15 | 20 | 25 | 30 | 35 | 40 | 45;
  penaltyPoints: 0 | 1 | 2 | 3;
  lockSeconds: 10 | 15 | 20 | 25 | 30;
  winScore: 15 | 20 | 25 | 30;
  roundSeconds: 30 | 60 | 90 | null;
  roundTimeoutPenalty: 0 | 1 | 2 | 3;
  scoreFloor: 0 | -5 | -10 | null;
  streakBonus: 'none' | 'n1' | 'n2';
  cardMaxValue: 10 | 13;
  clearLockOnNewRound: boolean;
};

export const DEFAULT_BUZZER_SETTINGS: BuzzerSettings = {
  presetMode: 'standard',
  answerSeconds: 25,
  penaltyPoints: 2,
  lockSeconds: 15,
  winScore: 20,
  roundSeconds: 60,
  roundTimeoutPenalty: 1,
  scoreFloor: null,
  streakBonus: 'n1',
  cardMaxValue: 13,
  clearLockOnNewRound: true,
};

export type BuzzerPlayerState = {
  isLocked: boolean;
  lockUntil: number | null;
  streak: number;
};

export type BuzzerState = {
  roundNumber: number;
  publicCards: NumberCard[];
  roundTimerElapsed: number;
  roundTimerPaused: boolean;
  currentAnswerPlayerId: string | null;
  answerStartAt: number | null;
  noSolutionVotes: string[];
  playerStates: { [playerId: string]: BuzzerPlayerState };
  /**
   * 這一題是否開放搶答：倒數結束（BuzzerOpen）才開放；
   * 有人答對、無解投票通過、回合超時後關閉，直到下一題，避免同一題被重複得分
   */
  roundOpen?: boolean;
};

export type RoomSettings = {
  deckType: DeckType;
  remainSeconds: number | null;
  difficulty: Difficulty;
  gameType: GameType; // 預設 'classic'
  buzzerSettings?: BuzzerSettings;
};

export type Room = {
  roomId: string;
  roomName?: string;
  password?: string; // 房間密碼
  maxPlayers: number; // 最大玩家數
  currentOrder: number; // 當前輪到的玩家
  deck: NumberCard[]; // 牌庫
  players: Player[]; // 玩家資訊
  isGameOver: boolean; // 是否遊戲結束
  selectedCards: SelectedCard[];
  status: GameStatus;
  settings: RoomSettings;
  countdownTime?: number; // 回合倒數計時
  buzzerState?: BuzzerState;
  /** 快速配對開的房間：不列在房間列表，倒數結束後以電腦補位自動開局 */
  isQuickMatch?: boolean;
  /** 快速配對倒數中、還沒開局（開局後就變成一般房間，可以再開下一局） */
  quickMatchPending?: boolean;
  /**
   * 傳統對戰：伺服器驗證答對後先記下這一手的得分，等前端播完計分動畫送 UpdateScore 才入帳並換人；
   * 玩家斷線或回合時間到時由伺服器直接入帳。分數只由伺服器計算，不接受前端傳入
   */
  pendingPlay?: PendingPlay;
};

export type PendingPlay = {
  playerId: string;
  score: number;
  /** 出牌用掉幾張，入帳後補回同樣張數 */
  drawCount: number;
  handResult?: HandResult;
};

/** 快速配對：房間人數上限、開局時補到幾人、等待真人的秒數、補位電腦難度 */
export const QUICK_MATCH = {
  maxPlayers: 4,
  fillTo: 3,
  waitSeconds: 15,
  botDifficulty: 'normal',
} as const;
