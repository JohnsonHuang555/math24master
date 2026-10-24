import { NumberCard } from './Player';

export const TABLETOP_MIN_SET_SIZE = 3;
export const TABLETOP_MAX_SET_SIZE = 5;
export const TABLETOP_HAND_SIZE = 10; // 起始手牌數（出牌後不補牌）
export const TABLETOP_WENT_OUT_BONUS = 10; // 先出完手牌的加分
export const TABLETOP_LEFTOVER_CARD_PENALTY = 1; // 結算時手上每張數字牌扣分
export const TABLETOP_LEFTOVER_JOKER_PENALTY = 5; // 結算時手上每張 Joker 扣分

export type TabletopOperator = '+' | '-' | '*' | '/';

export type TabletopTile =
  | { type: 'number'; card: NumberCard }
  | { type: 'operator'; op: TabletopOperator }
  | { type: 'bracket'; bracket: '(' | ')' };

/** 桌面上的一組算式（見 CONTEXT.md「牌組」） */
export type TabletopSet = { id: string; tiles: TabletopTile[] };

export type TabletopDifficulty = 'easy' | 'normal' | 'hard';

export type TabletopSeat = {
  id: string;
  name: string;
  isBot: boolean;
  hand: NumberCard[];
  score: number; // 本局牌組得分總和
};

export type TabletopStanding = {
  seatId: string;
  tableScore: number; // 牌組得分總和
  wentOutBonus: number; // 先出完手牌的加分
  leftoverPenalty: number; // 剩下的牌扣分（正數）
  score: number; // 最終分數 = 牌組得分 + 出完加分 − 剩牌扣分
  rank: number; // 1 起算，同分並列
};

export type TabletopResult = { standings: TabletopStanding[] }; // 依名次排序

export type TabletopGameState = {
  difficulty: TabletopDifficulty;
  deck: NumberCard[];
  table: TabletopSet[];
  seats: TabletopSeat[]; // [玩家, Bot A, Bot B]，依此順序輪流
  currentSeat: number;
  turnsTaken: number; // 所有人合計已行動的回合數
  finalRoundTurnsLeft?: number; // 最後一圈剩餘的行動次數；undefined = 尚未進入最後一圈
  status: 'playing' | 'ended';
  result?: TabletopResult; // status 為 'ended' 時才有
};
