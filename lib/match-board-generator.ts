import { v4 as uuidv4 } from 'uuid';
import { canMake24 } from '@/lib/daily-seed';
import { shuffleArray } from '@/lib/deck';
import {
  MATCH_BOARD_SIZE,
  MATCH_MAX_VALUE,
  MatchCell,
} from '@/models/MatchBoard';

/**
 * 消消樂模式的「反向構造」牌局生成器。
 *
 * 1~13 值域內任取 2/3/4 張（可重複值）的解空間只取決於值域本身，跟當局隨機性無關，
 * 所以在模組層級預先窮舉一次、快取起來，之後每局只需要「抽樣」，
 * 不需要像經典模式 `_drawSolvableHand` 那樣 generate → 驗證 → 重抽 → 兜底。
 * 每組都保證存在湊 24 的解法（結構性保證，不是機率性保證）。
 */

type GroupSize = 2 | 3 | 4;

// 分組大小抽樣權重：4 張機率較高，降低 2 張組（解法池只有 5 種）反覆出現的視覺重複感
const SIZE_WEIGHT: Record<GroupSize, number> = { 4: 50, 3: 35, 2: 15 };

function weightedPick(options: GroupSize[], rng: () => number): GroupSize {
  const total = options.reduce((sum, s) => sum + SIZE_WEIGHT[s], 0);
  let r = rng() * total;
  for (const s of options) {
    r -= SIZE_WEIGHT[s];
    if (r <= 0) return s;
  }
  return options[options.length - 1];
}

/** 選了 size 之後，剩餘量不能卡在 1（1 張牌永遠湊不出算式） */
function allowedSizes(remaining: number): GroupSize[] {
  return ([2, 3, 4] as GroupSize[]).filter(
    s => s <= remaining && (remaining - s === 0 || remaining - s >= 2),
  );
}

/** 決定 16 張牌要拆成幾組、每組幾張，每局隨機決定 */
export function planGroupSizes(rng: () => number = Math.random): GroupSize[] {
  const sizes: GroupSize[] = [];
  let remaining: number = MATCH_BOARD_SIZE;
  while (remaining > 0) {
    const options = allowedSizes(remaining);
    const pick = weightedPick(options, rng);
    sizes.push(pick);
    remaining -= pick;
  }
  return sizes;
}

/** 窮舉 1~maxValue 值域內、長度 k 的非遞減組合（可重複值） */
function combosWithRepetition(maxValue: number, k: number): number[][] {
  const results: number[][] = [];
  const picked: number[] = [];

  function build(start: number) {
    if (picked.length === k) {
      results.push([...picked]);
      return;
    }
    for (let v = start; v <= maxValue; v++) {
      picked.push(v);
      build(v);
      picked.pop();
    }
  }

  build(1);
  return results;
}

const solvableCache = new Map<GroupSize, number[][]>();

/** 取得（並快取）某個組大小在 1~13 值域內所有可解的組合 */
function getSolvableMultisets(k: GroupSize): number[][] {
  const cached = solvableCache.get(k);
  if (cached) return cached;
  const all = combosWithRepetition(MATCH_MAX_VALUE, k);
  const solvable = all.filter(t => canMake24(t));
  solvableCache.set(k, solvable);
  return solvable;
}

/** 在進入模式選擇頁時背景預熱，避免玩家點「開始遊戲」時卡頓 */
export function prewarmMatchGenerator(): void {
  ([2, 3, 4] as GroupSize[]).forEach(k => getSolvableMultisets(k));
}

function pickGroupValues(k: GroupSize, rng: () => number): number[] {
  const pool = getSolvableMultisets(k); // 恆非空：k=2 有 5 組、k=3 有 111 組、k=4 有 1362 組
  const picked = pool[Math.floor(rng() * pool.length)];
  return shuffleArray(picked);
}

/** 產生一副保證存在全清解法的 4x4 消消樂牌局 */
export function generateMatchBoard(
  rng: () => number = Math.random,
): MatchCell[] {
  const groupSizes = planGroupSizes(rng);
  const allValues = groupSizes.flatMap(k => pickGroupValues(k, rng));
  return shuffleArray(allValues).map((value, cellIndex) => ({
    cellIndex,
    card: { id: uuidv4(), value },
  }));
}
