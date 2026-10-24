import { describe, expect, it } from 'vitest';
import { draw } from '@/lib/deck';

describe('draw', () => {
  it('從陣列尾端抽 n 張', () => {
    expect(draw([1, 2, 3, 4], 2)).toEqual({ drawn: [3, 4], remaining: [1, 2] });
  });

  it('抽 0 張時什麼都不抽', () => {
    expect(draw([1, 2, 3], 0)).toEqual({ drawn: [], remaining: [1, 2, 3] });
  });

  it('要抽的張數超過剩下的張數時，抽到用完為止', () => {
    expect(draw([1, 2], 5)).toEqual({ drawn: [1, 2], remaining: [] });
  });
});
