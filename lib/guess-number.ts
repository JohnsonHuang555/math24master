export type LineClueCardId =
  | 'half'
  | 'odd-even'
  | 'triple'
  | 'multiple-5'
  | 'multiple-7'
  | 'prime'
  | 'repeat'
  | 'ones-gt-tens'
  | 'digit-sum-odd'
  | 'last-digit-gt5'
  | 'tens-gt5'
  | 'digit-product-gt20'
  | 'higher-than-last'
  | 'within-ten'
  | 'perfect-square'
  | 'lucky-seven';

export type PeekCardId = 'peek';
export type RedrawCardId = 'redraw';

// 卡片名稱與問句在 messages 的 GuessNumber.cards.<id>；中文成語名稱在英文另外取名（見 CLAUDE.md）
export type LineClueCard = {
  id: LineClueCardId;
  /** 問句會帶入玩家上一次猜的數字 */
  isDynamic?: boolean;
};
export type PeekCard = { id: PeekCardId };
export type RedrawCard = { id: RedrawCardId };
export type ClueCard = LineClueCard | PeekCard | RedrawCard;

export function isLineClueCard(card: ClueCard): card is LineClueCard {
  return card.id !== 'peek' && card.id !== 'redraw';
}

export const PEEK_CARD: PeekCard = { id: 'peek' };

export const REDRAW_CARD: RedrawCard = { id: 'redraw' };

export const LINE_CLUE_CARDS: LineClueCard[] = [
  { id: 'half' },
  { id: 'odd-even' },
  { id: 'triple' },
  { id: 'multiple-5' },
  { id: 'multiple-7' },
  { id: 'prime' },
  { id: 'repeat' },
  { id: 'ones-gt-tens' },
  { id: 'digit-sum-odd' },
  { id: 'last-digit-gt5' },
  { id: 'tens-gt5' },
  { id: 'digit-product-gt20' },
  { id: 'higher-than-last', isDynamic: true },
  { id: 'within-ten', isDynamic: true },
  { id: 'perfect-square' },
  { id: 'lucky-seven' },
];

export const ALL_CARDS: ClueCard[] = [
  ...LINE_CLUE_CARDS,
  PEEK_CARD,
  REDRAW_CARD,
];

const PERFECT_SQUARES = new Set([16, 25, 36, 49, 64, 81]);

function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i <= Math.sqrt(n); i++) {
    if (n % i === 0) return false;
  }
  return true;
}

export function getInitialRemaining(): number[] {
  return Array.from({ length: 90 }, (_, i) => i + 10);
}

type ClueContext = { lastGuess?: number };

export function applyClue(
  remaining: number[],
  card: LineClueCard,
  clueResult: 'yes' | 'no',
  context?: ClueContext,
): number[] {
  if (remaining.length === 0) return [];
  switch (card.id) {
    case 'half':
      return clueResult === 'yes'
        ? remaining.filter(n => n >= 55)
        : remaining.filter(n => n < 55);
    case 'odd-even':
      return clueResult === 'yes'
        ? remaining.filter(n => n % 2 !== 0)
        : remaining.filter(n => n % 2 === 0);
    case 'triple':
      return clueResult === 'yes'
        ? remaining.filter(n => n % 3 === 0)
        : remaining.filter(n => n % 3 !== 0);
    case 'multiple-5':
      return clueResult === 'yes'
        ? remaining.filter(n => n % 5 === 0)
        : remaining.filter(n => n % 5 !== 0);
    case 'multiple-7':
      return clueResult === 'yes'
        ? remaining.filter(n => n % 7 === 0)
        : remaining.filter(n => n % 7 !== 0);
    case 'prime':
      return clueResult === 'yes'
        ? remaining.filter(n => isPrime(n))
        : remaining.filter(n => !isPrime(n));
    case 'repeat':
      return clueResult === 'yes'
        ? remaining.filter(n => Math.floor(n / 10) === n % 10)
        : remaining.filter(n => Math.floor(n / 10) !== n % 10);
    case 'ones-gt-tens':
      return clueResult === 'yes'
        ? remaining.filter(n => n % 10 > Math.floor(n / 10))
        : remaining.filter(n => n % 10 <= Math.floor(n / 10));
    case 'digit-sum-odd':
      return clueResult === 'yes'
        ? remaining.filter(n => (Math.floor(n / 10) + (n % 10)) % 2 !== 0)
        : remaining.filter(n => (Math.floor(n / 10) + (n % 10)) % 2 === 0);
    case 'last-digit-gt5':
      return clueResult === 'yes'
        ? remaining.filter(n => n % 10 > 5)
        : remaining.filter(n => n % 10 <= 5);
    case 'tens-gt5':
      return clueResult === 'yes'
        ? remaining.filter(n => Math.floor(n / 10) > 5)
        : remaining.filter(n => Math.floor(n / 10) <= 5);
    case 'digit-product-gt20':
      return clueResult === 'yes'
        ? remaining.filter(n => Math.floor(n / 10) * (n % 10) > 20)
        : remaining.filter(n => Math.floor(n / 10) * (n % 10) <= 20);
    case 'higher-than-last': {
      const lg = context?.lastGuess;
      if (lg === undefined) return remaining;
      return clueResult === 'yes'
        ? remaining.filter(n => n > lg)
        : remaining.filter(n => n <= lg);
    }
    case 'within-ten': {
      const lg = context?.lastGuess;
      if (lg === undefined) return remaining;
      return clueResult === 'yes'
        ? remaining.filter(n => Math.abs(n - lg) <= 10)
        : remaining.filter(n => Math.abs(n - lg) > 10);
    }
    case 'perfect-square':
      return clueResult === 'yes'
        ? remaining.filter(n => PERFECT_SQUARES.has(n))
        : remaining.filter(n => !PERFECT_SQUARES.has(n));
    case 'lucky-seven':
      return clueResult === 'yes'
        ? remaining.filter(n => n.toString().includes('7'))
        : remaining.filter(n => !n.toString().includes('7'));
    default:
      card.id satisfies never;
      return remaining;
  }
}

export function calcClueResult(
  answer: number,
  card: LineClueCard,
  context?: ClueContext,
): 'yes' | 'no' {
  switch (card.id) {
    case 'half':
      return answer >= 55 ? 'yes' : 'no';
    case 'odd-even':
      return answer % 2 !== 0 ? 'yes' : 'no';
    case 'triple':
      return answer % 3 === 0 ? 'yes' : 'no';
    case 'multiple-5':
      return answer % 5 === 0 ? 'yes' : 'no';
    case 'multiple-7':
      return answer % 7 === 0 ? 'yes' : 'no';
    case 'prime':
      return isPrime(answer) ? 'yes' : 'no';
    case 'repeat':
      return Math.floor(answer / 10) === answer % 10 ? 'yes' : 'no';
    case 'ones-gt-tens':
      return answer % 10 > Math.floor(answer / 10) ? 'yes' : 'no';
    case 'digit-sum-odd':
      return (Math.floor(answer / 10) + (answer % 10)) % 2 !== 0 ? 'yes' : 'no';
    case 'last-digit-gt5':
      return answer % 10 > 5 ? 'yes' : 'no';
    case 'tens-gt5':
      return Math.floor(answer / 10) > 5 ? 'yes' : 'no';
    case 'digit-product-gt20':
      return Math.floor(answer / 10) * (answer % 10) > 20 ? 'yes' : 'no';
    case 'higher-than-last': {
      const lg = context?.lastGuess;
      if (lg === undefined) return 'no';
      return answer > lg ? 'yes' : 'no';
    }
    case 'within-ten': {
      const lg = context?.lastGuess;
      if (lg === undefined) return 'no';
      return Math.abs(answer - lg) <= 10 ? 'yes' : 'no';
    }
    case 'perfect-square':
      return PERFECT_SQUARES.has(answer) ? 'yes' : 'no';
    case 'lucky-seven':
      return answer.toString().includes('7') ? 'yes' : 'no';
    default:
      card.id satisfies never;
      return 'no';
  }
}

export function drawCards(
  usedIds: LineClueCardId[],
  peekUsed: boolean,
  redrawUsed: boolean,
  isFirstRound: boolean,
  remaining: number[],
): ClueCard[] {
  let linePool: LineClueCard[] = LINE_CLUE_CARDS.filter(
    c => !usedIds.includes(c.id) && !(isFirstRound && c.isDynamic),
  );
  if (linePool.length === 0) {
    linePool = LINE_CLUE_CARDS.filter(c => !(isFirstRound && c.isDynamic));
  }
  if (linePool.length < 3) {
    const extra = LINE_CLUE_CARDS.filter(
      c => !(isFirstRound && c.isDynamic) && !linePool.some(p => p.id === c.id),
    );
    linePool = [...linePool, ...extra.slice(0, 3 - linePool.length)];
  }

  const pool: ClueCard[] = [
    ...linePool,
    ...(peekUsed || remaining.length >= 30 ? [] : [PEEK_CARD]),
    ...(redrawUsed ? [] : [REDRAW_CARD]),
  ];

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

/** 評級代碼；顯示文字由 UI 層對應（lib 不放玩家看到的文字） */
export type GuessRating =
  'lucky' | 'genius' | 'steady' | 'close' | 'keepGoing' | 'miss';

export function getGuessRating(
  roundCount: number,
  isWin: boolean,
): GuessRating {
  if (!isWin) return 'miss';
  if (roundCount === 1) return 'lucky';
  if (roundCount <= 3) return 'genius';
  if (roundCount <= 6) return 'steady';
  if (roundCount <= 10) return 'close';
  return 'keepGoing';
}
