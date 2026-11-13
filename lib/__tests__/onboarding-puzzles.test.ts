import { describe, expect, it } from 'vitest';
import { canMake24, findAllSolutions } from '../daily-seed';
import {
  EASY_PUZZLES,
  MEDIUM_PUZZLES,
  QUICK_PLAY_ROUNDS,
  pickQuickPlayPuzzles,
  simplestSolution,
  solutionOperators,
} from '../onboarding-puzzles';

const hasAddSubOnlySolution = (nums: readonly number[]) =>
  findAllSolutions([...nums]).some(s => !/[×÷]/.test(s.formula));

const isValidCards = (nums: readonly number[]) =>
  nums.length === 4 &&
  nums.every(n => Number.isInteger(n) && n >= 1 && n <= 13);

describe('新手題庫', () => {
  it.each(EASY_PUZZLES.map(p => [p]))('簡單題 %j 有解且只用加減就能解', p => {
    expect(isValidCards(p)).toBe(true);
    expect(canMake24([...p])).toBe(true);
    expect(hasAddSubOnlySolution(p)).toBe(true);
  });

  it.each(MEDIUM_PUZZLES.map(p => [p]))('稍難題 %j 有解但一定要用乘除', p => {
    expect(isValidCards(p)).toBe(true);
    expect(canMake24([...p])).toBe(true);
    expect(hasAddSubOnlySolution(p)).toBe(false);
  });
});

describe('pickQuickPlayPuzzles', () => {
  it('第一次玩：簡單 → 稍難 → 一般，三題都有解', () => {
    for (let i = 0; i < 50; i++) {
      const puzzles = pickQuickPlayPuzzles(true);
      expect(puzzles).toHaveLength(QUICK_PLAY_ROUNDS);
      const sorted = (p: readonly number[]) => [...p].sort((a, b) => a - b);
      expect(EASY_PUZZLES.map(sorted)).toContainEqual(sorted(puzzles[0]));
      expect(MEDIUM_PUZZLES.map(sorted)).toContainEqual(sorted(puzzles[1]));
      for (const p of puzzles) {
        expect(isValidCards(p)).toBe(true);
        expect(canMake24(p)).toBe(true);
      }
    }
  });

  it('完成過引導：三題一般難度，都有解', () => {
    const puzzles = pickQuickPlayPuzzles(false);
    expect(puzzles).toHaveLength(QUICK_PLAY_ROUNDS);
    for (const p of puzzles) expect(canMake24(p)).toBe(true);
  });

  it('random 回傳邊界值 0 與接近 1 時不會越界', () => {
    for (const r of [0, 0.999999]) {
      const puzzles = pickQuickPlayPuzzles(true, () => r);
      expect(puzzles[0]).toHaveLength(4);
      expect(puzzles[1]).toHaveLength(4);
    }
  });
});

describe('提示', () => {
  it('最簡單的解法真的等於 24，且第一段提示只列出用到的符號', () => {
    const formula = simplestSolution([6, 6, 6, 6]);
    expect(formula).not.toBeNull();
    expect(solutionOperators(formula!)).toEqual(['+']);
    expect(solutionOperators('(3 + 3) × (2 + 2)')).toEqual(['+', '×']);
    expect(solutionOperators('8 ÷ (3 - (8 ÷ 3))')).toEqual(['-', '÷']);
  });

  it('無解時回傳 null', () => {
    expect(simplestSolution([1, 1, 1, 1])).toBeNull();
  });
});
