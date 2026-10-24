// 系統訊息只送代碼與參數，由 client 翻譯（見 docs/adr/0009）；
// 新增代碼時，messages/*.json 的 SystemMessage 也要補上對應的文字。
export enum SystemMessageCode {
  CountdownCancelled = 'COUNTDOWN_CANCELLED',
  /** params: { seconds } */
  GameStartsIn = 'GAME_STARTS_IN',
}

export type SystemMessageParams = Record<string, string | number>;

export type Message =
  | { isSystem?: false; name: string; message: string }
  | { isSystem: true; code: SystemMessageCode; params?: SystemMessageParams };
