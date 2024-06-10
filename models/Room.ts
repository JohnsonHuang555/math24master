import { NumberCard, Player } from './Player';
import { SelectedCard } from './SelectedCard';

// 起始手牌數
export const HAND_CARD_COUNT = 5;
// 最大手牌數
export const MAX_CARD_COUNT = 8;
// 算式中最多數字牌數
export const MAX_FORMULAS_NUMBER_COUNT = 5;

export type Room = {
  roomId: string;
  maxPlayers: number; // 最大玩家數
  currentIndex: number; // 當前輪到的玩家
  deck: NumberCard[]; // 牌庫
  players: Player[]; // 玩家資訊
  isGameOver: boolean; // 是否遊戲結束
  selectedCards: SelectedCard[];
};
