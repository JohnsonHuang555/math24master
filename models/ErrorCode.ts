// Socket 伺服器回傳的錯誤代碼；client 依代碼翻譯成玩家的語言（見 docs/adr/0009）。
// 新增代碼時，messages/*.json 的 ServerError 也要補上對應的文字。
export enum ErrorCode {
  Unexpected = 'UNEXPECTED',

  // 房間
  RoomNotFound = 'ROOM_NOT_FOUND',
  RoomFull = 'ROOM_FULL',
  RoomFullOrNotFound = 'ROOM_FULL_OR_NOT_FOUND',
  RoomNameTaken = 'ROOM_NAME_TAKEN',
  WrongPassword = 'WRONG_PASSWORD',
  PlayerNotFound = 'PLAYER_NOT_FOUND',
  ReconnectTokenInvalid = 'RECONNECT_TOKEN_INVALID',

  // 開局與回合
  PlayersNotReady = 'PLAYERS_NOT_READY',
  StartGameFailed = 'START_GAME_FAILED',
  NotYourTurn = 'NOT_YOUR_TURN',

  // 組算式
  InvalidEquation = 'INVALID_EQUATION',
  FirstMustBeNumberOrLeftParen = 'FIRST_MUST_BE_NUMBER_OR_LEFT_PAREN',
  ConsecutiveNumbers = 'CONSECUTIVE_NUMBERS',
  ConsecutivePlus = 'CONSECUTIVE_PLUS',
  ConsecutiveMinus = 'CONSECUTIVE_MINUS',
  ConsecutiveTimes = 'CONSECUTIVE_TIMES',
  ConsecutiveDivide = 'CONSECUTIVE_DIVIDE',
  PlusMinusAfterLeftParen = 'PLUS_MINUS_AFTER_LEFT_PAREN',

  // 搶答
  BuzzerNotStarted = 'BUZZER_NOT_STARTED',
  NotAnsweringPlayer = 'NOT_ANSWERING_PLAYER',
  MustUseAllCards = 'MUST_USE_ALL_CARDS',
  InvalidCards = 'INVALID_CARDS',
  AnswerNot24 = 'ANSWER_NOT_24',
  AnswerTimeout = 'ANSWER_TIMEOUT',
}
