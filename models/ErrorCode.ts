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
  /** 暱稱含不雅字詞 */
  InappropriateName = 'INAPPROPRIATE_NAME',
  /** 只有房主能做（改房名、改設定、踢人、加電腦、開始遊戲） */
  NotRoomMaster = 'NOT_ROOM_MASTER',
  /** 暱稱是空白 */
  PlayerNameRequired = 'PLAYER_NAME_REQUIRED',
  /** 遊戲進行中不能做（加入、改設定、踢人等） */
  GameInProgress = 'GAME_IN_PROGRESS',
  /** 房間設定值不合法（人數、倒數秒數等） */
  InvalidRoomSettings = 'INVALID_ROOM_SETTINGS',

  // 開局與回合
  PlayersNotReady = 'PLAYERS_NOT_READY',
  StartGameFailed = 'START_GAME_FAILED',
  NotYourTurn = 'NOT_YOUR_TURN',
  /** 遊戲還沒開始（或已結束）時送出牌面操作 */
  GameNotStarted = 'GAME_NOT_STARTED',
  /** 選的數字牌不在自己的手牌裡 */
  CardNotInHand = 'CARD_NOT_IN_HAND',

  // 組算式
  InvalidEquation = 'INVALID_EQUATION',
  FirstMustBeNumberOrLeftParen = 'FIRST_MUST_BE_NUMBER_OR_LEFT_PAREN',
  ConsecutiveNumbers = 'CONSECUTIVE_NUMBERS',
  ConsecutivePlus = 'CONSECUTIVE_PLUS',
  ConsecutiveMinus = 'CONSECUTIVE_MINUS',
  ConsecutiveTimes = 'CONSECUTIVE_TIMES',
  ConsecutiveDivide = 'CONSECUTIVE_DIVIDE',
  PlusMinusAfterLeftParen = 'PLUS_MINUS_AFTER_LEFT_PAREN',
  // 消消樂：一次選取的張數（參數 count）
  TooFewCards = 'TOO_FEW_CARDS',
  TooManyCards = 'TOO_MANY_CARDS',

  // 搶答
  BuzzerNotStarted = 'BUZZER_NOT_STARTED',
  NotAnsweringPlayer = 'NOT_ANSWERING_PLAYER',
  MustUseAllCards = 'MUST_USE_ALL_CARDS',
  InvalidCards = 'INVALID_CARDS',
  AnswerNot24 = 'ANSWER_NOT_24',
  AnswerTimeout = 'ANSWER_TIMEOUT',
}
