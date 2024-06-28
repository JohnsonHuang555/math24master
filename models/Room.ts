import { GameStatus } from './GameStatus';
import { NumberCard, Player } from './Player';
import { SelectedCard } from './SelectedCard';

// 起始手牌數
export const HAND_CARD_COUNT = 5;
// 最大手牌數
export const MAX_CARD_COUNT = 5;
// 算式中最多數字牌數
export const MAX_FORMULAS_NUMBER_COUNT = 5;

export enum DeckType {
  Standard = 'standard',
  Random = 'random',
}

export type RoomSettings = {
  deckType: DeckType;
  remainSeconds: number | null;
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
};
