export type CardColor = 'red' | 'blue' | 'yellow' | 'black';

export type NumberCard = {
  id: string;
  value: number;
  color?: CardColor;             // 拉密模式使用
  isJoker?: boolean;             // true = 百搭牌
  jokerDeclaredValue?: number;   // Joker 上桌後宣告的值
  jokerDeclaredColor?: CardColor; // Joker 上桌後宣告的顏色
};

export type Player = {
  id: string;
  name: string; // 名稱
  handCard: NumberCard[]; // 手牌
  score: number; // 分數
  playerOrder?: number; // 玩家順序 from 1
  isMaster: boolean; // 房主
  isLastRoundPlayer: boolean; // 是否為最後一回合最後一位玩家
  isReady: boolean;
  hasMelded: boolean; // 是否已破冰（拉密模式）
};
