import { describe, expect, it } from 'vitest';
import {
  BOARDS,
  findBoardByMode,
  formatRecord,
  leaderboardHref,
  resolveBoard,
} from './leaderboard';

describe('resolveBoard', () => {
  it('沒帶參數時預設經典', () => {
    const { board, level } = resolveBoard(null, null);
    expect(board.id).toBe('classic');
    expect(level.mode).toBe('classic');
  });

  it('依 mode + level 找到對應難度', () => {
    const { board, level } = resolveBoard('quickmath', 'advanced');
    expect(board.id).toBe('quickmath');
    expect(level.mode).toBe('quickmath_advanced');
  });

  it('level 不存在時退回該排行榜的第一個難度', () => {
    const { level } = resolveBoard('quickmath', 'nope');
    expect(level.mode).toBe('quickmath');
  });

  it('mode 不存在時退回經典', () => {
    expect(resolveBoard('normal', null).board.id).toBe('classic');
  });
});

describe('findBoardByMode / leaderboardHref', () => {
  it('每個難度都能反查回自己的排行榜', () => {
    for (const board of BOARDS) {
      for (const level of board.levels) {
        const found = findBoardByMode(level.mode);
        expect(found.board.id).toBe(board.id);
        expect(found.level.id).toBe(level.id);
      }
    }
  });

  it('單一難度的排行榜網址不帶 level', () => {
    expect(leaderboardHref('classic')).toBe('/leaderboard?mode=classic');
  });

  it('多難度的排行榜網址帶 level', () => {
    expect(leaderboardHref('quickmath_advanced')).toBe(
      '/leaderboard?mode=quickmath&level=advanced',
    );
  });
});

describe('formatRecord', () => {
  const format = {
    stage: (n: number) => `stage ${n}`,
    score: (n: number) => `${n} pts`,
  };

  it('依模式格式化成績', () => {
    expect(formatRecord('classic', { score: 18 }, format)).toBe('18 pts');
    expect(formatRecord('match', { score: 40 }, format)).toBe('40 pts');
    expect(formatRecord('challenge', { stage: 7 }, format)).toBe('stage 7');
    expect(formatRecord('quickmath', { seconds: 75.3 }, format)).toBe(
      '1:15.3',
    );
    expect(formatRecord('quickmath_advanced', { seconds: 9 }, format)).toBe(
      '0:09.0',
    );
  });
});

describe('牌桌模式排行榜', () => {
  it('簡單、普通、困難三個難度屬於同一個「牌桌」排行榜', () => {
    for (const [mode, levelId] of [
      ['tabletop_easy', 'easy'],
      ['tabletop_normal', 'normal'],
      ['tabletop_hard', 'hard'],
    ] as const) {
      const { board, level } = findBoardByMode(mode);
      expect(board.id).toBe('tabletop');
      expect(level.id).toBe(levelId);
    }
  });

  it('排行榜網址帶難度', () => {
    expect(leaderboardHref('tabletop_hard')).toBe(
      '/leaderboard?mode=tabletop&level=hard',
    );
  });

  it('成績以分數顯示', () => {
    expect(
      formatRecord(
        'tabletop_normal',
        { score: 52 },
        { stage: n => `stage ${n}`, score: n => `${n} pts` },
      ),
    ).toBe('52 pts');
  });
});
