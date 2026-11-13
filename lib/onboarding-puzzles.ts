import { findAllSolutions } from '@/lib/daily-seed';
import { generateSolvablePuzzles } from '@/lib/puzzle-generator';

/** 快速試玩一輪的題數 */
export const QUICK_PLAY_ROUNDS = 3;

/**
 * 第 1 題：只用加減就能解（四張相加剛好 24 或加減組合），讓新手先成功一次。
 * 每組都由 lib/__tests__/onboarding-puzzles.test.ts 驗證可解、且存在只用加減的解法
 */
export const EASY_PUZZLES: readonly (readonly number[])[] = [
  [6, 6, 6, 6],
  [4, 5, 7, 8],
  [3, 6, 7, 8],
  [2, 5, 8, 9],
  [3, 5, 7, 9],
  [1, 6, 8, 9],
  [4, 4, 7, 9],
  [5, 5, 6, 8],
  [2, 6, 7, 9],
  [3, 4, 8, 9],
  [2, 2, 10, 10],
  [1, 5, 9, 9],
];

/**
 * 第 2 題：數字小、但一定要用到乘法（四張加總不到 24），加入一點思考。
 * 測試保證可解、且不存在只用加減的解法
 */
export const MEDIUM_PUZZLES: readonly (readonly number[])[] = [
  [1, 2, 3, 4],
  [2, 3, 4, 5],
  [2, 2, 3, 3],
  [1, 2, 3, 6],
  [1, 1, 3, 8],
  [1, 2, 4, 6],
  [1, 1, 4, 6],
  [2, 2, 2, 3],
  [1, 3, 4, 4],
  [2, 3, 4, 4],
  [1, 2, 2, 6],
  [3, 3, 4, 4],
];

type Random = () => number;

function pick<T>(list: readonly T[], random: Random): T {
  return list[Math.floor(random() * list.length) % list.length];
}

/** 打亂牌序，避免題庫的數字總是由小到大排列 */
function shuffle(nums: readonly number[], random: Random): number[] {
  const result = [...nums];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 第 3 題與重玩時的一般難度題：沿用挑戰模式的隨機有解題（1–13） */
function normalPuzzles(count: number): number[][] {
  try {
    return generateSolvablePuzzles(count);
  } catch {
    return Array.from({ length: count }, () => [2, 3, 4, 6]);
  }
}

/**
 * 一輪快速試玩的題目。
 * 第一次玩：簡單 → 稍難 → 一般；完成過新手引導後：三題一般難度
 */
export function pickQuickPlayPuzzles(
  isFirstTime: boolean,
  random: Random = Math.random,
): number[][] {
  if (!isFirstTime) return normalPuzzles(QUICK_PLAY_ROUNDS);
  return [
    shuffle(pick(EASY_PUZZLES, random), random),
    shuffle(pick(MEDIUM_PUZZLES, random), random),
    ...normalPuzzles(1),
  ];
}

/** 提示用：運算符號最少、最直觀的解法（findAllSolutions 依分數由高到低排序） */
export function simplestSolution(nums: number[]): string | null {
  const solutions = findAllSolutions(nums);
  return solutions.length > 0 ? solutions[solutions.length - 1].formula : null;
}

/** 第一段提示：這個解法用到哪些運算符號（依 + − × ÷ 順序、不重複），不透露數字順序 */
export function solutionOperators(formula: string): string[] {
  return ['+', '-', '×', '÷'].filter(op => formula.includes(` ${op} `));
}
