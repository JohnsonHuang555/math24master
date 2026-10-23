import { NumberCard } from './Player';

export const RUMMY_MIN_SET_SIZE = 3;
export const RUMMY_MAX_SET_SIZE = 5;
export const RUMMY_HAND_SIZE = 10;
export const RUMMY_WENT_OUT_BONUS = 10;
export const RUMMY_LEFTOVER_CARD_PENALTY = 1;
export const RUMMY_LEFTOVER_JOKER_PENALTY = 5;

export type RummyOperator = '+' | '-' | '*' | '/';

export type RummyTile =
  | { type: 'number'; card: NumberCard }
  | { type: 'operator'; op: RummyOperator }
  | { type: 'bracket'; bracket: '(' | ')' };

/** 桌面上的一組算式（見 CONTEXT.md「牌組」） */
export type RummySet = { id: string; tiles: RummyTile[] };

export type RummyDifficulty = 'easy' | 'normal' | 'hard';

export type RummySeat = {
  id: string;
  name: string;
  isBot: boolean;
  hand: NumberCard[];
  score: number; // 本局牌組總分（不含結算加減分）
};

export type RummyStanding = {
  seatId: string;
  tableScore: number; // 本局牌組總分
  wentOutBonus: number; // 先出完手牌的加分
  leftoverPenalty: number; // 剩下的牌扣分（正數）
  finalScore: number;
  rank: number; // 1 起算
};

export type RummyResult = { standings: RummyStanding[] }; // 依名次排序

export type RummyGameState = {
  difficulty: RummyDifficulty;
  deck: NumberCard[];
  table: RummySet[];
  seats: RummySeat[]; // [玩家, Bot A, Bot B]，依此順序輪流
  currentSeat: number;
  finalRoundTurnsLeft?: number; // 最後一圈剩餘的行動次數；undefined = 尚未進入最後一圈
  status: 'playing' | 'ended';
  result?: RummyResult; // status 為 'ended' 時才有
};
