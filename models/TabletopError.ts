// 牌桌模式規則引擎與回合草稿回傳的錯誤代碼；UI 依代碼翻成玩家的語言（見 docs/adr/0009）。
// 新增代碼時，messages/*.json 的 TabletopError 也要補上對應的文字。
export enum TabletopErrorCode {
  GameEnded = 'GAME_ENDED',

  // 單一牌組是否成立
  SetSize = 'SET_SIZE', // params: min, max, count
  JokerUndeclared = 'JOKER_UNDECLARED',
  ColorRule = 'COLOR_RULE', // params: size（3、4、5）
  MalformedExpression = 'MALFORMED_EXPRESSION',
  DivideByZero = 'DIVIDE_BY_ZERO',
  NotTwentyFour = 'NOT_TWENTY_FOUR', // params: value

  // 提交回合
  DuplicateCard = 'DUPLICATE_CARD',
  NotYourCard = 'NOT_YOUR_CARD',
  TableCardToHand = 'TABLE_CARD_TO_HAND',
  MustPlayFromHand = 'MUST_PLAY_FROM_HAND',
  OneSetPerTurn = 'ONE_SET_PER_TURN', // params: count

  // 組裝列與回合草稿
  SetNotFound = 'SET_NOT_FOUND',
  CardNotFound = 'CARD_NOT_FOUND',
  DeclareJokerFirst = 'DECLARE_JOKER_FIRST',
  OperatorBetweenNumbers = 'OPERATOR_BETWEEN_NUMBERS',
  MaxSetSize = 'MAX_SET_SIZE', // params: max
  OperatorBeforeLeftParen = 'OPERATOR_BEFORE_LEFT_PAREN',
  UnmatchedRightParen = 'UNMATCHED_RIGHT_PAREN',
  NumberBeforeRightParen = 'NUMBER_BEFORE_RIGHT_PAREN',
  NumberBeforeOperator = 'NUMBER_BEFORE_OPERATOR',
  ComposerNotEmpty = 'COMPOSER_NOT_EMPTY',
  LooseCardsRemaining = 'LOOSE_CARDS_REMAINING', // params: count
}

export type TabletopError = {
  code: TabletopErrorCode;
  params?: Record<string, number>;
  /** 錯誤發生在桌上第幾組牌組（從 1 開始）；UI 顯示成「第 N 組：…」 */
  setIndex?: number;
};
