import { describe, expect, it } from 'vitest';
import { calcRoundScore } from './scoring';
import { Symbol } from '@/models/Symbol';
import type { SelectedCard } from '@/models/SelectedCard';

const sym = (symbol: Symbol): SelectedCard => ({ symbol });

describe('calcRoundScore', () => {
  it('returns 0 for no operators', () => {
    expect(calcRoundScore([])).toBe(0);
  });

  it('+/- = 1pt each', () => {
    expect(calcRoundScore([sym(Symbol.Plus)])).toBe(1);
    expect(calcRoundScore([sym(Symbol.Minus)])).toBe(1);
    expect(calcRoundScore([sym(Symbol.Plus), sym(Symbol.Minus)])).toBe(2);
  });

  it('× = 2pt each', () => {
    expect(calcRoundScore([sym(Symbol.Times)])).toBe(2);
  });

  it('÷ = 3pt each', () => {
    expect(calcRoundScore([sym(Symbol.Divide)])).toBe(3);
  });

  it('2× gives +1 bonus', () => {
    // 2 × = 2+2+1 = 5
    expect(
      calcRoundScore([sym(Symbol.Times), sym(Symbol.Times)]),
    ).toBe(5);
  });

  it('2÷ gives +1 bonus', () => {
    // 2 ÷ = 3+3+1 = 7
    expect(
      calcRoundScore([sym(Symbol.Divide), sym(Symbol.Divide)]),
    ).toBe(7);
  });

  it('2× and 2÷ give independent bonuses', () => {
    // 2× + 2÷ = (2*2+1) + (3*2+1) = 5+7 = 12
    expect(
      calcRoundScore([
        sym(Symbol.Times),
        sym(Symbol.Times),
        sym(Symbol.Divide),
        sym(Symbol.Divide),
      ]),
    ).toBe(12);
  });

  it('mixed operators, no bonus', () => {
    // + × ÷ = 1+2+3 = 6
    expect(
      calcRoundScore([sym(Symbol.Plus), sym(Symbol.Times), sym(Symbol.Divide)]),
    ).toBe(6);
  });

  it('ignores bracket symbols', () => {
    expect(
      calcRoundScore([sym(Symbol.LeftBracket), sym(Symbol.Plus)]),
    ).toBe(1);
  });
});
