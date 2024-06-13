export type NumberCard = {
  id: string;
  value: number;
};

export type Player = {
  id: string;
  name: string; // 名稱
  handCard: NumberCard[]; // 手牌
  score: number; // 分數
  playerOrder?: number; // 玩家順序
  isMaster: boolean; // 房主
  isLastRoundPlayer: boolean; // 是否為最後一回合最後一位玩家
  isReady: boolean;
};
