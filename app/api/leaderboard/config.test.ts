import { describe, expect, it } from 'vitest';
import {
  COLLECTION,
  SCORE_MAX,
  checkResult,
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

describe('結算時的成績檢查 checkResult', () => {
  it('分數在範圍內、時間足夠時通過，只留下需要的欄位', () => {
    expect(checkResult('classic', { score: 30, extra: 1 }, 600)).toEqual({
      ok: true,
      payload: { score: 30 },
    });
  });

  it('超過上限、負數、非整數都不行', () => {
    expect(checkResult('classic', { score: 67 }, 9999)).toMatchObject({
      ok: false,
      reason: 'invalid_score',
    });
    expect(checkResult('match', { score: -1 }, 9999).ok).toBe(false);
    expect(checkResult('match', { score: 1.5 }, 9999).ok).toBe(false);
    expect(checkResult('match', { score: '40' }, 9999).ok).toBe(false);
  });

  it('經典每 11 分至少要 3 秒', () => {
    expect(checkResult('classic', { score: 66 }, 17)).toMatchObject({
      ok: false,
      reason: 'too_fast',
    });
    expect(checkResult('classic', { score: 66 }, 18).ok).toBe(true);
  });

  it('0 分不檢查時間', () => {
    expect(checkResult('tabletop_hard', { score: 0 }, 0).ok).toBe(true);
  });

  it('挑戰模式：關卡數要合理、每關至少 1.5 秒', () => {
    expect(checkResult('challenge', { stage: 0, totalScore: 0 }, 99).ok).toBe(
      false,
    );
    expect(
      checkResult('challenge', { stage: 11, totalScore: 50 }, 14),
    ).toMatchObject({ ok: false, reason: 'too_fast' });
    expect(checkResult('challenge', { stage: 11, totalScore: 50 }, 15)).toEqual(
      { ok: true, payload: { stage: 11, totalScore: 50 } },
    );
  });

  it('快答：秒數不能比實際經過的時間還長，結果取到小數一位', () => {
    expect(checkResult('quickmath', { seconds: 40 }, 30).ok).toBe(false);
    expect(checkResult('quickmath', { seconds: 27.04 }, 30)).toEqual({
      ok: true,
      payload: { seconds: 27 },
    });
    expect(checkResult('quickmath_advanced', { seconds: 5 }, 5).ok).toBe(false);
    expect(checkResult('quickmath', { seconds: 301 }, 400).ok).toBe(false);
  });
});
