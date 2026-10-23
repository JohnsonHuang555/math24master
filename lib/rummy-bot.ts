import { v4 as uuidv4 } from 'uuid';
import { colorPattern, scoreSet } from '@/lib/rummy-engine';
import { CardColor, NumberCard } from '@/models/Player';
import {
  RUMMY_MAX_SET_SIZE,
  RUMMY_MIN_SET_SIZE,
  RummyDifficulty,
  RummyGameState,
  RummyOperator,
  RummySet,
  RummyTile,
} from '@/models/Rummy';

type Expr =
  | { kind: 'leaf'; index: number }
  | { kind: 'op'; op: RummyOperator; left: Expr; right: Expr };

// times / divide 記錄用了幾個 × 與 ÷（+ − 的數量 = 牌數 − 1 − 兩者），用來算符號分
type Entry = { value: number; times: number; divide: number; expr: Expr };

const PRECEDENCE: Record<RummyOperator, number> = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
};

// 數值 key 比字串 key 快很多；值取到小數點後 6 位，× ÷ 數量各佔一位數（最多 4）
function entryKey(value: number, times: number, divide: number): number {
  return Math.round(value * 1e6) * 100 + times * 10 + divide;
}

const OPS: RummyOperator[] = ['+', '*', '-', '/'];

const ALL_COLORS: CardColor[] = ['red', 'blue', 'yellow', 'black'];

/** 與 scoreSet 的符號分相同：+ − 1、× 2、÷ 3，兩個以上 × 或 ÷ 各加 1 */
function symbolScore(entry: Entry, cardCount: number): number {
  const plusMinus = cardCount - 1 - entry.times - entry.divide;
  let score = plusMinus + entry.times * 2 + entry.divide * 3;
  if (entry.times >= 2) score += 1;
  if (entry.divide >= 2) score += 1;
  return score;
}

/**
 * 子集合動態規劃：table[mask] 記錄用完 mask 內所有牌能算出的每個（值、× 數、÷ 數）組合。
 * 每個 mask 拆成兩個非空子集合，左右各取一個值套四則運算，涵蓋所有括號寫法；
 * 保留不同的運算符號組合，最後才能從等於 24 的解中挑出符號分最高的。
 */
function solveValues(values: number[]): Expr | null {
  const full = (1 << values.length) - 1;
  const table = new Map<number, Map<number, Entry>>();
  let best: Entry | null = null;

  values.forEach((value, index) => {
    const leaf: Entry = {
      value,
      times: 0,
      divide: 0,
      expr: { kind: 'leaf', index },
    };
    table.set(1 << index, new Map([[entryKey(value, 0, 0), leaf]]));
    if (values.length === 1 && Math.abs(value - 24) < 1e-9) best = leaf;
  });

  for (let mask = 1; mask <= full; mask++) {
    if (table.has(mask)) continue;
    const isFull = mask === full;
    const entries = new Map<number, Entry>();
    const lowest = mask & -mask;
    // 只列舉包含最低位的那一半，避免 (A, B) 與 (B, A) 重複；- 與 ÷ 另外處理兩個方向
    for (let sub = (mask - 1) & mask; sub > 0; sub = (sub - 1) & mask) {
      if (!(sub & lowest)) continue;
      const left = table.get(sub)!;
      const right = table.get(mask ^ sub)!;
      for (const a of left.values()) {
        for (const b of right.values()) {
          for (const op of OPS) {
            const directions = op === '+' || op === '*' ? 1 : 2;
            for (let d = 0; d < directions; d++) {
              const l = d === 0 ? a : b;
              const r = d === 0 ? b : a;
              const value = apply(op, l.value, r.value);
              if (!Number.isFinite(value)) continue;
              // 最後一層只需要等於 24 的解，不必存下所有中間值
              if (isFull && Math.abs(value - 24) >= 1e-9) continue;
              const times = l.times + r.times + (op === '*' ? 1 : 0);
              const divide = l.divide + r.divide + (op === '/' ? 1 : 0);
              const key = entryKey(value, times, divide);
              if (entries.has(key)) continue;
              const entry: Entry = {
                value,
                times,
                divide,
                expr: { kind: 'op', op, left: l.expr, right: r.expr },
              };
              entries.set(key, entry);
              if (
                isFull &&
                (!best ||
                  symbolScore(entry, values.length) >
                    symbolScore(best, values.length))
              ) {
                best = entry;
              }
            }
          }
        }
      }
    }
    table.set(mask, entries);
  }

  return (best as Entry | null)?.expr ?? null;
}

function apply(op: RummyOperator, a: number, b: number): number {
  if (op === '+') return a + b;
  if (op === '-') return a - b;
  if (op === '*') return a * b;
  return b === 0 ? NaN : a / b;
}

/** 依運算優先順序只在必要時加括號 */
function toTiles(expr: Expr, cards: NumberCard[]): RummyTile[] {
  if (expr.kind === 'leaf')
    return [{ type: 'number', card: cards[expr.index] }];

  const wrap = (child: Expr, isRight: boolean): RummyTile[] => {
    const tiles = toTiles(child, cards);
    if (child.kind === 'leaf') return tiles;
    const childPrec = PRECEDENCE[child.op];
    const parentPrec = PRECEDENCE[expr.op];
    const needsBrackets =
      childPrec < parentPrec ||
      (isRight &&
        childPrec === parentPrec &&
        (expr.op === '-' || expr.op === '/'));
    return needsBrackets
      ? [
          { type: 'bracket', bracket: '(' },
          ...tiles,
          { type: 'bracket', bracket: ')' },
        ]
      : tiles;
  };

  return [
    ...wrap(expr.left, false),
    { type: 'operator', op: expr.op },
    ...wrap(expr.right, true),
  ];
}

// 結果只取決於牌值，以排序後的牌值快取；葉節點 index 對應排序後的順序
const solveCache = new Map<string, Expr | null>();
const SOLVE_CACHE_LIMIT = 20000;

function solveSortedValues(values: number[]): Expr | null {
  const key = values.join(',');
  const cached = solveCache.get(key);
  if (cached !== undefined) return cached;
  const expr = solveValues(values);
  if (solveCache.size >= SOLVE_CACHE_LIMIT) solveCache.clear();
  solveCache.set(key, expr);
  return expr;
}

/** 已宣告的 Joker 以宣告值計算 */
function valueOf(card: NumberCard): number {
  return card.isJoker ? (card.jokerDeclaredValue ?? 0) : card.value;
}

function isUndeclaredJoker(card: NumberCard): boolean {
  return card.isJoker === true && card.jokerDeclaredValue === undefined;
}

/**
 * 挑出讓牌組符合顏色限制的 Joker 宣告色：其他牌同色時宣告同一色；
 * 其他牌全部不同色、補上 Joker 後不超過 4 張時補一個缺的顏色；兩者都不行時回傳 null。
 * 其他牌至少 2 張，兩種情況互斥，不需要比較倍率
 */
function bestJokerColor(others: NumberCard[]): CardColor | null {
  const unique = new Set(
    others.map(c => (c.isJoker ? c.jokerDeclaredColor : c.color)),
  );
  if (unique.size === 1) return [...unique][0] ?? null;
  if (others.length <= 3 && unique.size === others.length) {
    return ALL_COLORS.find(c => !unique.has(c)) ?? null;
  }
  return null;
}

function solveDeclared(cards: NumberCard[]): RummySet | null {
  // 顏色不合法就不必解算式
  if (!colorPattern(cards)) return null;
  const sorted = [...cards].sort((a, b) => valueOf(a) - valueOf(b));
  const expr = solveSortedValues(sorted.map(valueOf));
  if (!expr) return null;
  return { id: uuidv4(), tiles: toTiles(expr, sorted) };
}

/**
 * 用完給定的每一張牌組成等於 24 的牌組；無解時回傳 null。
 * 已宣告的 Joker 維持原宣告；未宣告的 Joker（最多 1 張）挑分數最高的宣告值與倍率最高的顏色。
 */
export function solveSet(cards: NumberCard[]): RummySet | null {
  const undeclared = cards.filter(isUndeclaredJoker);
  if (undeclared.length === 0) return solveDeclared(cards);
  if (undeclared.length > 1) return null;

  const joker = undeclared[0];
  const others = cards.filter(c => c !== joker);
  const color = bestJokerColor(others);
  if (!color) return null;
  let best: RummySet | null = null;
  for (let value = 1; value <= 13; value++) {
    const declared = {
      ...joker,
      jokerDeclaredValue: value,
      jokerDeclaredColor: color,
    };
    const candidate = solveDeclared([...others, declared]);
    if (candidate && (!best || scoreSet(candidate) > scoreSet(best))) {
      best = candidate;
    }
  }
  return best;
}

/**
 * Bot 每一步的紀錄，供 UI 逐步播放：
 * newSet = 只用手牌組新牌組；extend = 把手牌接進桌上某一組；regroup = 拆桌上的牌組重組。
 * fromSetIds 是被拆掉／被改動的桌上牌組，sets 是這一步產生的牌組。
 */
export type BotAction = {
  kind: 'newSet' | 'extend' | 'regroup';
  fromSetIds: string[];
  sets: RummySet[];
  handCardsUsed: number;
  score: number;
};

export type BotMove =
  { type: 'draw' } | { type: 'play'; table: RummySet[]; action: BotAction };

type Candidate = { action: BotAction; table: RummySet[] };

type BotConfig = {
  maxExtendCards: number; // 接牌時最多接幾張手牌
  maxRegroupSets: number; // 最多同時拆幾組桌上的牌組重組（0 = 不拆）
  maxRegroupHandCards: number; // 拆組時最多加入幾張手牌
  maxSolves: number; // 每次思考最多解幾次算式（搜尋上限）
};

const BOT_CONFIG: Record<RummyDifficulty, BotConfig> = {
  easy: {
    maxExtendCards: 1,
    maxRegroupSets: 0,
    maxRegroupHandCards: 0,
    maxSolves: 1000,
  },
  normal: {
    maxExtendCards: 2,
    maxRegroupSets: 1,
    maxRegroupHandCards: 3,
    maxSolves: 3000,
  },
  hard: {
    maxExtendCards: 2,
    maxRegroupSets: 2,
    maxRegroupHandCards: 3,
    maxSolves: 8000,
  },
};

function cardsOf(set: RummySet): NumberCard[] {
  return set.tiles.flatMap(t => (t.type === 'number' ? [t.card] : []));
}

function without(hand: NumberCard[], used: NumberCard[]): NumberCard[] {
  const ids = new Set(used.map(c => c.id));
  return hand.filter(c => !ids.has(c.id));
}

function subsets<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  const [first, ...rest] = items;
  return [
    ...subsets(rest, size - 1).map(s => [first, ...s]),
    ...subsets(rest, size),
  ];
}

/** 決定 Bot 這回合怎麼走（每回合只完成一組牌組）；回傳的 table 直接交給 submitTurn */
export function chooseBotMove(
  state: RummyGameState,
  rng: () => number = Math.random,
): BotMove {
  const config = BOT_CONFIG[state.difficulty];
  const hand = state.seats[state.currentSeat].hand;
  const candidates = generateCandidates(state.table, hand, config);
  if (candidates.length === 0) return { type: 'draw' };

  // 簡單從可行的走法中隨機挑；普通／困難挑分數最高的（同分時出較多手牌）
  const chosen =
    state.difficulty === 'easy'
      ? candidates[Math.floor(rng() * candidates.length)]
      : candidates.reduce((best, c) =>
          c.action.score > best.action.score ||
          (c.action.score === best.action.score &&
            c.action.handCardsUsed > best.action.handCardsUsed)
            ? c
            : best,
        );
  return { type: 'play', table: chosen.table, action: chosen.action };
}

type Solver = (cards: NumberCard[]) => RummySet | null;

/**
 * 有額度的 solveSet：每次思考最多解 config.maxSolves 次，用次數而非時間限制，結果可重現。
 * 顏色不合法的組合不必解算式，不佔額度（大部分組合在這一步就被淘汰）
 */
function budgetedSolver(maxSolves: number) {
  let left = maxSolves;
  const solve: Solver = cards => {
    const hasUndeclaredJoker = cards.some(isUndeclaredJoker);
    if (!hasUndeclaredJoker && !colorPattern(cards)) return null;
    if (left <= 0) return null;
    left--;
    return solveSet(cards);
  };
  return { solve, exhausted: () => left <= 0 };
}

/** 依 新組 → 接牌 → 拆組 → 合組 的順序產生候選；額度用完時，最先被犧牲的是最深的搜尋 */
function generateCandidates(
  table: RummySet[],
  hand: NumberCard[],
  config: BotConfig,
): Candidate[] {
  const candidates: Candidate[] = [];
  const { solve, exhausted } = budgetedSolver(config.maxSolves);

  // 新組：只用手牌
  for (let size = RUMMY_MIN_SET_SIZE; size <= RUMMY_MAX_SET_SIZE; size++) {
    for (const used of subsets(hand, size)) {
      if (exhausted()) return candidates;
      const set = solve(used);
      if (!set) continue;
      candidates.push({
        action: {
          kind: 'newSet',
          fromSetIds: [],
          sets: [set],
          handCardsUsed: used.length,
          score: scoreSet(set),
        },
        table: [...table, set],
      });
    }
  }

  // 接牌：把 1～maxExtendCards 張手牌接進桌上某一組
  table.forEach((target, index) => {
    const targetCards = cardsOf(target);
    for (let k = 1; k <= config.maxExtendCards; k++) {
      if (targetCards.length + k > RUMMY_MAX_SET_SIZE) break;
      for (const used of subsets(hand, k)) {
        if (exhausted()) return;
        const set = solve([...targetCards, ...used]);
        if (!set) continue;
        candidates.push({
          action: {
            kind: 'extend',
            fromSetIds: [target.id],
            sets: [set],
            handCardsUsed: used.length,
            score: scoreSet(set),
          },
          table: table.map((s, i) => (i === index ? set : s)),
        });
      }
    }
  });

  // 拆組／合組：拆 1～maxRegroupSets 組桌上的牌組，和手牌一起重新切成數組
  for (let r = 1; r <= config.maxRegroupSets; r++) {
    for (const targets of subsets(table, r)) {
      const targetCards = targets.flatMap(cardsOf);
      for (let k = 1; k <= config.maxRegroupHandCards; k++) {
        for (const used of subsets(hand, k)) {
          if (exhausted()) return candidates;
          const sets = partition([...targetCards, ...used], solve);
          // 切成 1 組等同接牌，已在上面處理
          if (!sets || sets.length < 2) continue;
          // 每回合只完成一組：手牌必須全部落在同一組
          const usedIds = new Set(used.map(c => c.id));
          const completed = sets.filter(st =>
            cardsOf(st).some(c => usedIds.has(c.id)),
          );
          if (completed.length > 1) continue;
          const targetIds = new Set(targets.map(t => t.id));
          candidates.push({
            action: {
              kind: 'regroup',
              fromSetIds: targets.map(t => t.id),
              sets,
              handCardsUsed: used.length,
              score: scoreSets(sets, used),
            },
            table: [...table.filter(s => !targetIds.has(s.id)), ...sets],
          });
        }
      }
    }
  }

  return candidates;
}

/** 與規則引擎一致：只有用到本回合手牌的牌組計分 */
function scoreSets(sets: RummySet[], used: NumberCard[]): number {
  const usedIds = new Set(used.map(c => c.id));
  return sets
    .filter(s => cardsOf(s).some(c => usedIds.has(c.id)))
    .reduce((sum, s) => sum + scoreSet(s), 0);
}

/** 把所有牌切成每組 3～5 張、每組都等於 24 的牌組；切不完時回傳 null */
function partition(pool: NumberCard[], solve: Solver): RummySet[] | null {
  if (pool.length === 0) return [];
  if (pool.length < RUMMY_MIN_SET_SIZE) return null;
  const [first, ...rest] = pool;
  for (let size = RUMMY_MIN_SET_SIZE; size <= RUMMY_MAX_SET_SIZE; size++) {
    for (const companions of subsets(rest, size - 1)) {
      const set = solve([first, ...companions]);
      if (!set) continue;
      const tail = partition(without(rest, companions), solve);
      if (tail) return [set, ...tail];
    }
  }
  return null;
}
