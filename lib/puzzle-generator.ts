import { canMake24 } from '@/lib/daily-seed';

/**
 * 生成 count 組保證可解的 4 個數字（1-13 範圍）
 * 1-13 的 4 個數字約 60-70% 可湊出 24，while 迴圈平均 ~2 次迭代
 * 設定 max retries = count * 1000 作為安全閥
 */
export function generateSolvablePuzzles(count: number): number[][] {
  const puzzles: number[][] = [];
  let attempts = 0;
  while (puzzles.length < count && attempts < count * 1000) {
    attempts++;
    const nums = Array.from(
      { length: 4 },
      () => Math.floor(Math.random() * 13) + 1,
    );
    if (canMake24(nums)) puzzles.push(nums);
  }
  if (puzzles.length < count) {
    throw new Error(
      `puzzle-generator: max retries exceeded (needed ${count}, got ${puzzles.length})`,
    );
  }
  return puzzles;
}

/** 生成單組保證可解的 4 個數字，供 Challenge 模式每關使用 */
export function generateOnePuzzle(): number[] {
  return generateSolvablePuzzles(1)[0];
}
