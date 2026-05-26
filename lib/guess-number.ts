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

export type LineClueCard = {
  id: LineClueCardId;
  name: string;
  question: string;
  isDynamic?: boolean;
};
export type PeekCard = { id: PeekCardId; name: string; description: string };
export type RedrawCard = { id: RedrawCardId; name: string; description: string };
export type ClueCard = LineClueCard | PeekCard | RedrawCard;

export const PEEK_CARD: PeekCard = {
  id: 'peek',
  name: '透視鏡',
  description: '顯示候選範圍 5 秒',
};

export const REDRAW_CARD: RedrawCard = {
  id: 'redraw',
  name: '全面革新',
  description: '重新抽一組手牌',
};

export const LINE_CLUE_CARDS: LineClueCard[] = [
  { id: 'half', name: '半壁江山', question: '謎底大於 50 嗎？' },
  { id: 'odd-even', name: '陰陽雙極', question: '謎底是奇數嗎？' },
  { id: 'triple', name: '三陽開泰', question: '謎底是 3 的倍數嗎？' },
  { id: 'multiple-5', name: '五福臨門', question: '謎底是 5 的倍數嗎？' },
  { id: 'multiple-7', name: '七星高照', question: '謎底是 7 的倍數嗎？' },
  { id: 'prime', name: '黃金質數', question: '謎底是質數嗎？' },
  { id: 'repeat', name: '複製貼上', question: '十位數與個位數相同嗎？' },
  { id: 'ones-gt-tens', name: '步步高升', question: '個位數大於十位數嗎？' },
  { id: 'digit-sum-odd', name: '數位加總', question: '十位數＋個位數之和是奇數嗎？' },
  { id: 'last-digit-gt5', name: '尾數偵測', question: '個位數大於 5 嗎？' },
  { id: 'tens-gt5', name: '十位偵測', question: '十位數大於 5 嗎？' },
  { id: 'digit-product-gt20', name: '數位之積', question: '十位數×個位數大於 20 嗎？' },
  {
    id: 'higher-than-last',
    name: '高低雷達',
    question: '謎底比你上一次猜的（N）大嗎？',
    isDynamic: true,
  },
  {
    id: 'within-ten',
    name: '黃金交叉',
    question: '謎底和你上次猜的（N）相差在 10 以內嗎？',
    isDynamic: true,
  },
  { id: 'perfect-square', name: '完美平方', question: '謎底是完全平方數嗎？' },
  { id: 'lucky-seven', name: '幸運之星', question: '謎底的數字裡包含「7」嗎？' },
];

export const ALL_CARDS: ClueCard[] = [...LINE_CLUE_CARDS, PEEK_CARD, REDRAW_CARD];

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
        ? remaining.filter(n => n > 50)
        : remaining.filter(n => n <= 50);
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
        ? remaining.filter(n => (Math.floor(n / 10) + n % 10) % 2 !== 0)
        : remaining.filter(n => (Math.floor(n / 10) + n % 10) % 2 === 0);
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
      return answer > 50 ? 'yes' : 'no';
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
      return (Math.floor(answer / 10) + answer % 10) % 2 !== 0 ? 'yes' : 'no';
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
    ...(peekUsed ? [] : [PEEK_CARD]),
    ...(redrawUsed ? [] : [REDRAW_CARD]),
  ];

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

export function getGuessRating(roundCount: number, isWin: boolean): string {
  if (!isWin) return '下次再試 😤';
  if (roundCount === 1) return '運氣爆棚！🎲';
  if (roundCount <= 3) return '邏輯天才！🧠';
  if (roundCount <= 6) return '穩健推理 👍';
  if (roundCount <= 10) return '快追上了 💪';
  return '再接再厲 🌱';
}
