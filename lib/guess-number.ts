export type LineClueCardId =
  | 'odd-even'
  | 'half'
  | 'triple'
  | 'repeat'
  | 'last-digit'
  | 'tens-odd-even'
  | 'digit-sum-gt10'
  | 'sixty-plus'
  | 'multiple-5'
  | 'tens-gt-ones'
  | 'both-odd';

export type PeekCardId = 'peek';

export type LineClueCard = { id: LineClueCardId; name: string; question: string };
export type PeekCard = { id: PeekCardId; name: string; description: string };
export type ClueCard = LineClueCard | PeekCard;

export const PEEK_CARD: PeekCard = {
  id: 'peek',
  name: '透視鏡',
  description: '顯示候選範圍 5 秒',
};

export const LINE_CLUE_CARDS: LineClueCard[] = [
  { id: 'odd-even', name: '陰陽雙極', question: '謎底是奇數嗎？' },
  { id: 'half', name: '半壁江山', question: '謎底大於 50 嗎？' },
  { id: 'triple', name: '三陽開泰', question: '謎底是 3 的倍數嗎？' },
  { id: 'repeat', name: '複製貼上', question: '十位數與個位數相同嗎？' },
  { id: 'last-digit', name: '個位偵測', question: '個位數大於 5 嗎？' },
  { id: 'tens-odd-even', name: '十位奇偶', question: '十位數是奇數嗎？' },
  { id: 'digit-sum-gt10', name: '數位加總', question: '個位＋十位之和大於 10 嗎？' },
  { id: 'sixty-plus', name: '六十門檻', question: '謎底大於等於 60 嗎？' },
  { id: 'multiple-5', name: '五的倍數', question: '謎底是 5 的倍數嗎？' },
  { id: 'tens-gt-ones', name: '位數比較', question: '十位數大於個位數嗎？' },
  { id: 'both-odd', name: '雙奇組合', question: '十位數與個位數都是奇數嗎？' },
];

export const ALL_CARDS: ClueCard[] = [...LINE_CLUE_CARDS, PEEK_CARD];

export function getInitialRemaining(): number[] {
  return Array.from({ length: 90 }, (_, i) => i + 10);
}

export function applyClue(
  remaining: number[],
  card: LineClueCard,
  clueResult: 'yes' | 'no',
): number[] {
  if (remaining.length === 0) return [];
  switch (card.id) {
    case 'odd-even':
      return clueResult === 'yes'
        ? remaining.filter(n => n % 2 !== 0)
        : remaining.filter(n => n % 2 === 0);
    case 'half':
      return clueResult === 'yes'
        ? remaining.filter(n => n > 50)
        : remaining.filter(n => n <= 50);
    case 'triple':
      return clueResult === 'yes'
        ? remaining.filter(n => n % 3 === 0)
        : remaining.filter(n => n % 3 !== 0);
    case 'repeat':
      return clueResult === 'yes'
        ? remaining.filter(n => Math.floor(n / 10) === n % 10)
        : remaining.filter(n => Math.floor(n / 10) !== n % 10);
    case 'last-digit':
      return clueResult === 'yes'
        ? remaining.filter(n => n % 10 > 5)
        : remaining.filter(n => n % 10 <= 5);
    case 'tens-odd-even':
      return clueResult === 'yes'
        ? remaining.filter(n => Math.floor(n / 10) % 2 !== 0)
        : remaining.filter(n => Math.floor(n / 10) % 2 === 0);
    case 'digit-sum-gt10':
      return clueResult === 'yes'
        ? remaining.filter(n => Math.floor(n / 10) + (n % 10) > 10)
        : remaining.filter(n => Math.floor(n / 10) + (n % 10) <= 10);
    case 'sixty-plus':
      return clueResult === 'yes'
        ? remaining.filter(n => n >= 60)
        : remaining.filter(n => n < 60);
    case 'multiple-5':
      return clueResult === 'yes'
        ? remaining.filter(n => n % 5 === 0)
        : remaining.filter(n => n % 5 !== 0);
    case 'tens-gt-ones':
      return clueResult === 'yes'
        ? remaining.filter(n => Math.floor(n / 10) > n % 10)
        : remaining.filter(n => Math.floor(n / 10) <= n % 10);
    case 'both-odd':
      return clueResult === 'yes'
        ? remaining.filter(
            n => Math.floor(n / 10) % 2 !== 0 && n % 10 % 2 !== 0,
          )
        : remaining.filter(
            n => !(Math.floor(n / 10) % 2 !== 0 && n % 10 % 2 !== 0),
          );
  }
}

export function calcClueResult(
  answer: number,
  card: LineClueCard,
): 'yes' | 'no' {
  switch (card.id) {
    case 'odd-even':
      return answer % 2 !== 0 ? 'yes' : 'no';
    case 'half':
      return answer > 50 ? 'yes' : 'no';
    case 'triple':
      return answer % 3 === 0 ? 'yes' : 'no';
    case 'repeat':
      return Math.floor(answer / 10) === answer % 10 ? 'yes' : 'no';
    case 'last-digit':
      return answer % 10 > 5 ? 'yes' : 'no';
    case 'tens-odd-even':
      return Math.floor(answer / 10) % 2 !== 0 ? 'yes' : 'no';
    case 'digit-sum-gt10':
      return Math.floor(answer / 10) + (answer % 10) > 10 ? 'yes' : 'no';
    case 'sixty-plus':
      return answer >= 60 ? 'yes' : 'no';
    case 'multiple-5':
      return answer % 5 === 0 ? 'yes' : 'no';
    case 'tens-gt-ones':
      return Math.floor(answer / 10) > answer % 10 ? 'yes' : 'no';
    case 'both-odd':
      return Math.floor(answer / 10) % 2 !== 0 && answer % 10 % 2 !== 0
        ? 'yes'
        : 'no';
  }
}

export function drawCards(
  usedIds: LineClueCardId[],
  peekUsed: boolean,
): ClueCard[] {
  let linePool: LineClueCard[] = LINE_CLUE_CARDS.filter(
    c => !usedIds.includes(c.id),
  );
  if (linePool.length === 0) linePool = [...LINE_CLUE_CARDS];
  // Guarantee at least 3 unique line cards by supplementing from the full deck
  if (linePool.length < 3) {
    const extra = LINE_CLUE_CARDS.filter(
      c => !linePool.some(p => p.id === c.id),
    );
    linePool = [...linePool, ...extra.slice(0, 3 - linePool.length)];
  }

  const pool: ClueCard[] = peekUsed
    ? [...linePool]
    : [...linePool, PEEK_CARD];

  // Fisher-Yates shuffle then take first 3 — guarantees no duplicates in hand
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
