import { Player } from './Player';

export type Room = {
  roomId: string;
  maxPlayers: number; // 最大玩家數
  currentIndex: number; // 當前輪到的玩家
  deck: number[]; // 牌庫
  players: Player[]; // 玩家資訊
};
