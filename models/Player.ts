export type NumberCard = {
  id: string;
  value: number;
};

export type Player = {
  id: string;
  name: string; // 名稱
  handCard: NumberCard[]; // 手牌
  score: number; // 分數
  // tempScore?: number; // 暫存分數，為了前端動畫用
  playerOrder?: number; // 玩家順序
  isMaster: boolean; // 房主
};
