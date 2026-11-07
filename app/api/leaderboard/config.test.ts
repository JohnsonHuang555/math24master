import { describe, expect, it } from 'vitest';
import {
  COLLECTION,
  SCORE_MAX,
  hasZeroScore,
  isScoreMode,
  isValidMode,
} from './config';

describe('牌桌模式的排行榜設定', () => {
  it('只剩一種難度，沿用原本困難的 collection（見 ADR 0010）', () => {
    expect(COLLECTION.tabletop_hard).toBe('leaderboard_tabletop_hard');
    expect(isValidMode('tabletop_hard')).toBe(true);
    expect(isValidMode('tabletop_easy')).toBe(false);
    expect(isValidMode('tabletop_normal')).toBe(false);
  });

  it('以分數比高低，0 分不上榜', () => {
    expect(isScoreMode('tabletop_hard')).toBe(true);
    expect(hasZeroScore('tabletop_hard', { score: 0 })).toBe(true);
    expect(hasZeroScore('tabletop_hard', { score: 12 })).toBe(false);
  });

  it('單局分數上限是 750（桌面最高總分約 640 + 保底 86 + 出完加分 10）', () => {
    expect(SCORE_MAX.tabletop_hard).toBe(750);
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
