import { describe, expect, it } from 'vitest';
import {
  COLLECTION,
  SCORE_MAX,
  hasZeroScore,
  isScoreMode,
  isValidMode,
} from './config';

describe('牌桌模式的排行榜設定', () => {
  const modes = ['tabletop_easy', 'tabletop_normal', 'tabletop_hard'] as const;

  it('三個難度各自一個 collection（依 ADR 0003 的慣例）', () => {
    expect(modes.map(m => COLLECTION[m])).toEqual([
      'leaderboard_tabletop_easy',
      'leaderboard_tabletop_normal',
      'leaderboard_tabletop_hard',
    ]);
    expect(modes.every(isValidMode)).toBe(true);
  });

  it('以分數比高低，0 分不上榜', () => {
    for (const mode of modes) {
      expect(isScoreMode(mode)).toBe(true);
      expect(hasZeroScore(mode, { score: 0 })).toBe(true);
      expect(hasZeroScore(mode, { score: 12 })).toBe(false);
    }
  });

  it('單局分數上限是 2590（最多 86 組 × 每組 30 分 + 出完加分 10）', () => {
    for (const mode of modes) expect(SCORE_MAX[mode]).toBe(2590);
  });
});

describe('既有模式的分數上限維持不變', () => {
  it('經典 66、消消樂 40', () => {
    expect(SCORE_MAX.classic).toBe(66);
    expect(SCORE_MAX.match).toBe(40);
  });

  it('挑戰與快答不是以分數比高低', () => {
    expect(isScoreMode('challenge')).toBe(false);
    expect(isScoreMode('quickmath')).toBe(false);
    expect(isScoreMode('quickmath_advanced')).toBe(false);
  });
});
