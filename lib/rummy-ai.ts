import { v4 as uuidv4 } from 'uuid';
import { evaluate } from 'mathjs';
import { NumberCard } from '../models/Player';
import { EquationGroup, EquationTile, OperatorType } from '../models/Room';

export type BotDifficulty = 'easy' | 'normal' | 'hard';

const OPERATORS: OperatorType[] = ['+', '-', '*', '/'];

/** 色彩規則：non-joker 牌全同色或（3-4張時）全不同色 */
function isColorValid(cards: NumberCard[]): boolean {
  const nonJokers = cards.filter(c => !c.isJoker);
  if (nonJokers.length < 2) return true;
  const colors = nonJokers.map(c => c.color);
  if (colors.some(c => !c)) return false;
  const uniqueColors = new Set(colors);
  if (cards.length === 5) return uniqueColors.size === 1;
  return uniqueColors.size === 1 || uniqueColors.size === nonJokers.length;
}

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  return arr.flatMap((item, i) =>
    permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map(p => [item, ...p]),
  );
}

function opCombos(n: number): OperatorType[][] {
  if (n === 0) return [[]];
  return OPERATORS.flatMap(op => opCombos(n - 1).map(rest => [op, ...rest]));
}

function buildFlatTiles(cards: NumberCard[], ops: OperatorType[]): EquationTile[] {
  const tiles: EquationTile[] = [];
  cards.forEach((card, i) => {
    tiles.push({ type: 'number', card });
    if (i < ops.length) tiles.push({ type: 'operator', op: ops[i] });
  });
  return tiles;
}

function evalTiles(tiles: EquationTile[]): number | null {
  try {
    const expr = tiles
      .map(t => {
        if (t.type === 'number') {
          const v = t.card.isJoker ? (t.card.jokerDeclaredValue ?? 0) : t.card.value;
          return String(v);
        }
        if (t.type === 'operator') return t.op;
        return t.bracket;
      })
      .join(' ');
    const result = evaluate(expr);
    return typeof result === 'number' && isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

/** 常見括號模式（3-5張牌） */
function buildBracketPatterns(cards: NumberCard[], ops: OperatorType[]): EquationTile[][] {
  const n = cards.length;
  const patterns: EquationTile[][] = [];

  if (n === 3) {
    const [a, b, c] = cards;
    const [op1, op2] = ops;
    // (a op1 b) op2 c
    patterns.push([
      { type: 'bracket', bracket: '(' },
      { type: 'number', card: a },
      { type: 'operator', op: op1 },
      { type: 'number', card: b },
      { type: 'bracket', bracket: ')' },
      { type: 'operator', op: op2 },
      { type: 'number', card: c },
    ]);
    // a op1 (b op2 c)
    patterns.push([
      { type: 'number', card: a },
      { type: 'operator', op: op1 },
      { type: 'bracket', bracket: '(' },
      { type: 'number', card: b },
      { type: 'operator', op: op2 },
      { type: 'number', card: c },
      { type: 'bracket', bracket: ')' },
    ]);
  } else if (n === 4) {
    const [a, b, c, d] = cards;
    const [op1, op2, op3] = ops;
    // (a op1 b) op2 (c op3 d)
    patterns.push([
      { type: 'bracket', bracket: '(' },
      { type: 'number', card: a },
      { type: 'operator', op: op1 },
      { type: 'number', card: b },
      { type: 'bracket', bracket: ')' },
      { type: 'operator', op: op2 },
      { type: 'bracket', bracket: '(' },
      { type: 'number', card: c },
      { type: 'operator', op: op3 },
      { type: 'number', card: d },
      { type: 'bracket', bracket: ')' },
    ]);
    // (a op1 b op2 c) op3 d
    patterns.push([
      { type: 'bracket', bracket: '(' },
      { type: 'number', card: a },
      { type: 'operator', op: op1 },
      { type: 'number', card: b },
      { type: 'operator', op: op2 },
      { type: 'number', card: c },
      { type: 'bracket', bracket: ')' },
      { type: 'operator', op: op3 },
      { type: 'number', card: d },
    ]);
    // a op1 (b op2 c op3 d)
    patterns.push([
      { type: 'number', card: a },
      { type: 'operator', op: op1 },
      { type: 'bracket', bracket: '(' },
      { type: 'number', card: b },
      { type: 'operator', op: op2 },
      { type: 'number', card: c },
      { type: 'operator', op: op3 },
      { type: 'number', card: d },
      { type: 'bracket', bracket: ')' },
    ]);
    // a op1 (b op2 c) op3 d
    patterns.push([
      { type: 'number', card: a },
      { type: 'operator', op: op1 },
      { type: 'bracket', bracket: '(' },
      { type: 'number', card: b },
      { type: 'operator', op: op2 },
      { type: 'number', card: c },
      { type: 'bracket', bracket: ')' },
      { type: 'operator', op: op3 },
      { type: 'number', card: d },
    ]);
  } else if (n === 5) {
    const [a, b, c, d, e] = cards;
    const [op1, op2, op3, op4] = ops;
    // (a op1 b) op2 (c op3 d) op4 e
    patterns.push([
      { type: 'bracket', bracket: '(' },
      { type: 'number', card: a },
      { type: 'operator', op: op1 },
      { type: 'number', card: b },
      { type: 'bracket', bracket: ')' },
      { type: 'operator', op: op2 },
      { type: 'bracket', bracket: '(' },
      { type: 'number', card: c },
      { type: 'operator', op: op3 },
      { type: 'number', card: d },
      { type: 'bracket', bracket: ')' },
      { type: 'operator', op: op4 },
      { type: 'number', card: e },
    ]);
    // (a op1 b op2 c op3 d) op4 e
    patterns.push([
      { type: 'bracket', bracket: '(' },
      { type: 'number', card: a },
      { type: 'operator', op: op1 },
      { type: 'number', card: b },
      { type: 'operator', op: op2 },
      { type: 'number', card: c },
      { type: 'operator', op: op3 },
      { type: 'number', card: d },
      { type: 'bracket', bracket: ')' },
      { type: 'operator', op: op4 },
      { type: 'number', card: e },
    ]);
  }

  return patterns;
}

function getSubsets<T>(arr: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (arr.length < size) return [];
  const [first, ...rest] = arr;
  return [
    ...getSubsets(rest, size - 1).map(s => [first, ...s]),
    ...getSubsets(rest, size),
  ];
}

/** 嘗試對 perm + ops 找到等於 24 的 tiles（遞迴窮舉 Joker 值） */
function tryWithJokers(
  perm: NumberCard[],
  ops: OperatorType[],
  jokerPositions: number[],
  jokerIdx: number,
  withBrackets: boolean,
): EquationTile[] | null {
  if (jokerIdx >= jokerPositions.length) {
    const flat = buildFlatTiles(perm, ops);
    if (evalTiles(flat) === 24) return flat;
    if (withBrackets) {
      for (const bp of buildBracketPatterns(perm, ops)) {
        if (evalTiles(bp) === 24) return bp;
      }
    }
    return null;
  }
  const pos = jokerPositions[jokerIdx];
  const original = perm[pos];
  for (let v = 1; v <= 13; v++) {
    perm[pos] = { ...original, jokerDeclaredValue: v };
    const res = tryWithJokers(perm, ops, jokerPositions, jokerIdx + 1, withBrackets);
    if (res) return res;
  }
  perm[pos] = original;
  return null;
}

/** 嘗試在給定牌組中找等於 24 的排列，回傳 tiles 或 null */
function tryFindEquation(cards: NumberCard[], withBrackets: boolean): EquationTile[] | null {
  for (const perm of permutations(cards)) {
    const jokerPosInPerm = perm.map((c, i) => (c.isJoker ? i : -1)).filter(i => i >= 0);
    for (const ops of opCombos(perm.length - 1)) {
      const result = tryWithJokers([...perm], ops, jokerPosInPerm, 0, withBrackets);
      if (result) return result;
    }
  }
  return null;
}

/** 從手牌中找可打出的算式組（依難度） */
export function findPlayableGroups(
  handCards: NumberCard[],
  difficulty: BotDifficulty,
): EquationGroup[] {
  const sizes = difficulty === 'easy' ? [3] : difficulty === 'normal' ? [3, 4] : [3, 4, 5];
  const withBrackets = difficulty !== 'easy';
  const tryMultiple = difficulty === 'hard';

  const usedIds = new Set<string>();

  const availableCards = () => handCards.filter(c => !usedIds.has(c.id));

  const findOneGroup = (): EquationGroup | null => {
    const cards = availableCards();
    for (const size of sizes) {
      if (cards.length < size) continue;
      for (const subset of getSubsets(cards, size)) {
        if (!isColorValid(subset)) continue;
        const tiles = tryFindEquation(subset, withBrackets);
        if (tiles) {
          return { id: uuidv4(), tiles };
        }
      }
    }
    return null;
  };

  const firstGroup = findOneGroup();
  if (!firstGroup) return [];

  // Easy：50% 機率放棄（模擬較弱的 AI）
  if (difficulty === 'easy' && Math.random() < 0.5) return [];

  const groups: EquationGroup[] = [firstGroup];
  firstGroup.tiles
    .filter(t => t.type === 'number')
    .forEach(t => usedIds.add((t as Extract<EquationTile, { type: 'number' }>).card.id));

  if (tryMultiple) {
    let next = findOneGroup();
    while (next) {
      groups.push(next);
      next.tiles
        .filter(t => t.type === 'number')
        .forEach(t => usedIds.add((t as Extract<EquationTile, { type: 'number' }>).card.id));
      next = findOneGroup();
    }
  }

  return groups;
}
