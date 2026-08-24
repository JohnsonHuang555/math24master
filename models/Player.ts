export type CardColor = 'red' | 'blue' | 'yellow' | 'black';

export type NumberCard = {
  id: string;
  value: number;
  color?: CardColor; // 拉密模式使用
  isJoker?: boolean; // true = 百搭牌
  jokerDeclaredValue?: number; // Joker 上桌後宣告的值
  jokerDeclaredColor?: CardColor; // Joker 上桌後宣告的顏色
};

/** 單人經典模式：每手結算回饋（本手最高分、是否完美手） */
export type HandResult = {
  roundScore: number; // 本手實得符號分（不含完美手 bonus）
  maxScore: number; // 本手理論最高符號分
  isPerfect: boolean; // 拿滿最高分（獲得完美手 bonus）
};

/** 單人經典模式：單題結算明細（不含題號，題號由呼叫端組裝時附加） */
export type RoundResult = {
  cardValues: number[]; // 該題 4 張牌數值
  playerFormula: string; // 玩家實際算式（顯示用字串，× ÷ 為全形符號）
  playerScore: number; // 玩家本手得分（不含完美手 bonus，對齊 roundScore）
  bestFormula: string; // 該題分數最高解法算式
  bestScore: number; // 該題最高分（對齊 maxScore）
  isPerfect: boolean;
};

/** 單人經典模式：附加題號後的完整單題紀錄，供結算後查看用 */
export type RoundRecord = RoundResult & { round: number };

export type Player = {
  id: string;
  name: string; // 名稱
  handCard: NumberCard[]; // 手牌
  score: number; // 分數
  perfectHands?: number; // 完美手次數（單人經典模式）
  theoreticalMax?: number; // 已作答或已放棄（跳過）手數的理論最高總分合計（含完美手 bonus，單人經典模式）
  playerOrder?: number; // 玩家順序 from 1
  isMaster: boolean; // 房主
  isLastRoundPlayer: boolean; // 是否為最後一回合最後一位玩家
  isReady: boolean;
  hasMelded: boolean; // 是否已破冰（拉密模式）
  isBot?: boolean; // 是否為 AI 玩家
  botDifficulty?: 'easy' | 'normal' | 'hard'; // AI 難度
  reconnectToken?: string; // 斷線重連令牌（UUID），跨重連使用
  isDisconnected?: boolean; // 是否處於暫時斷線（寬限期中）
  disconnectedAt?: number; // 斷線時間戳（ms）
};
