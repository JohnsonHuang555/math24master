import { describe, expect, it, vi } from 'vitest';
import { generateOnePuzzle, generateSolvablePuzzles } from './puzzle-generator';

describe('generateSolvablePuzzles', () => {
  it('returns the requested count of puzzles', () => {
    const puzzles = generateSolvablePuzzles(5);
    expect(puzzles).toHaveLength(5);
  });

  it('each puzzle has exactly 4 numbers', () => {
    const puzzles = generateSolvablePuzzles(3);
    for (const p of puzzles) {
      expect(p).toHaveLength(4);
    }
  });

  it('all numbers are in range 1-13', () => {
    const puzzles = generateSolvablePuzzles(10);
    for (const p of puzzles) {
      for (const n of p) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(13);
      }
    }
  });

  it('returns empty array for count=0', () => {
    expect(generateSolvablePuzzles(0)).toEqual([]);
  });

  it('throws when max retries exceeded', () => {
    // Mock Math.random to always return numbers that cannot make 24
    // canMake24([1,1,1,1]) is false
    vi.spyOn(Math, 'random').mockReturnValue(0); // always returns 1
    expect(() => generateSolvablePuzzles(1)).toThrow(
      'puzzle-generator: max retries exceeded',
    );
    vi.restoreAllMocks();
  });
});

describe('generateOnePuzzle', () => {
  it('returns a single array of 4 numbers', () => {
    const puzzle = generateOnePuzzle();
    expect(puzzle).toHaveLength(4);
  });

  it('all numbers are in range 1-13', () => {
    const puzzle = generateOnePuzzle();
    for (const n of puzzle) {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(13);
    }
  });
});
