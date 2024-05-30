export type Player = {
  id: string;
  score?: number; // 分數
  name?: string; // 名稱
  handCard?: number[]; // 手牌
  playerOrder?: number; // 玩家瞬迅
  isMaster: boolean; // 房主
};
