import { NumberCard } from './Player';

export const RUMMY_MIN_SET_SIZE = 3;
export const RUMMY_MAX_SET_SIZE = 5;
export const RUMMY_HAND_SIZE = 10; // 起始手牌數，出牌後也補到這個張數
export const RUMMY_TURNS_PER_SEAT = 6; // 每人回合數，全部打完就結算

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
  score: number; // 本局牌組得分總和
};

export type RummyStanding = {
  seatId: string;
  score: number;
  rank: number; // 1 起算，同分並列
};

export type RummyResult = { standings: RummyStanding[] }; // 依名次排序

export type RummyGameState = {
  difficulty: RummyDifficulty;
  deck: NumberCard[];
  table: RummySet[];
  seats: RummySeat[]; // [玩家, Bot A, Bot B]，依此順序輪流
  currentSeat: number;
  turnsTaken: number; // 所有人合計已行動的回合數
  status: 'playing' | 'ended';
  result?: RummyResult; // status 為 'ended' 時才有
};
