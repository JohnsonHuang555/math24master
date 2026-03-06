import { GameStatus } from './GameStatus';
import { CardColor, NumberCard, Player } from './Player';
import { SelectedCard } from './SelectedCard';

// 起始手牌數
export const HAND_CARD_COUNT = 4;
// 最大手牌數
export const MAX_CARD_COUNT = 4;
// 算式中最多數字牌數
export const MAX_FORMULAS_NUMBER_COUNT = 4;
// 拉密模式起始手牌數
export const RUMMY_HAND_CARD_COUNT = 14;
// 拉密模式輕鬆難度起始手牌數
export const RUMMY_HAND_CARD_COUNT_EASY = 10;
// 拉密模式回合秒數
export const RUMMY_TURN_SECONDS = 120;

export enum DeckType {
  Standard = 'standard',
  Random = 'random',
}

export type GameType = 'classic' | 'rummy';

export type OperatorType = '+' | '-' | '*' | '/';

export type EquationTile =
  | { type: 'number'; card: NumberCard }
  | { type: 'operator'; op: OperatorType }
  | { type: 'bracket'; bracket: '(' | ')' };

export type EquationGroup = { id: string; tiles: EquationTile[] };

export enum Difficulty {
  Easy = 'easy',
  Normal = 'normal',
  Hard = 'hard',
}

export type RoomSettings = {
  deckType: DeckType;
  remainSeconds: number | null;
  difficulty: Difficulty;
  gameType: GameType; // 預設 'classic'
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
  board: EquationGroup[]; // 桌面已驗證牌組（拉密模式）
  rummyFinalRoundStartOrder?: number; // 最後一圈起始玩家的 playerOrder（undefined = 非最後一圈）
};
