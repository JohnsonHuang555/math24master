import { NumberCard } from './Player';
import { SelectedCard } from './SelectedCard';

/** 消消樂模式：4x4 牌面固定格，cellIndex 對應畫面上的位置，產生後永不改變順序 */
export type MatchCell = {
  cellIndex: number;
  card: NumberCard | null; // null 代表已被消除
};

export type MatchStatus = 'playing' | 'cleared' | 'stuck';

export type MatchBoardState = {
  boardId: string;
  cells: MatchCell[]; // 固定長度 MATCH_BOARD_SIZE
  selectedCards: SelectedCard[]; // 複用經典模式的選牌型別
  score: number;
  status: MatchStatus;
};

export const MATCH_BOARD_SIZE = 16;
export const MATCH_MIN_GROUP = 2;
export const MATCH_MAX_GROUP = 4;
export const MATCH_MAX_VALUE = 13;
