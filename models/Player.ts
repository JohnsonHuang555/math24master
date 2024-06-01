export type Card = {
  id: string;
  value: number;
};

export type Player = {
  id: string;
  name: string; // 名稱
  handCard: Card[]; // 手牌
  score: number; // 分數
  playerOrder?: number; // 玩家順序
  isMaster: boolean; // 房主
};
