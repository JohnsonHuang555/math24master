import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';
import en from '@/messages/en.json';

// 英文的數量要分單複數（1 card／2 cards），用 ICU plural 寫在 messages 裡
const t = createTranslator({ locale: 'en', messages: en });

describe('英文單複數', () => {
  it('剩餘張數', () => {
    expect(t('GameUI.hud.remaining', { count: 1 })).toBe('1 card left');
    expect(t('GameUI.hud.remaining', { count: 20 })).toBe('20 cards left');
  });

  it('分數', () => {
    expect(t('SinglePlay.points', { score: 1 })).toBe('1 pt');
    expect(t('SinglePlay.points', { score: 0 })).toBe('0 pts');
    expect(t('Tabletop.composer.estimate', { score: 1 })).toBe('Est. 1 pt');
    expect(t('Challenge.correct', { score: 1, bonus: 60 })).toBe(
      'Correct! +1 pt, +60s',
    );
  });

  it('分數和張數同時出現', () => {
    expect(
      t.rich('Tabletop.seatSummary', {
        score: 1,
        count: 1,
        b: chunks => chunks,
      }),
    ).toEqual(expect.anything());
    expect(
      t.markup('Tabletop.seatSummary', {
        score: 1,
        count: 1,
        b: chunks => `[${chunks}]`,
      }),
    ).toBe('[1] pt · 1 card');
    expect(
      t.markup('Tabletop.seatSummary', {
        score: 12,
        count: 5,
        b: chunks => `[${chunks}]`,
      }),
    ).toBe('[12] pts · 5 cards');
  });

  it('大數字依語系加上千分位', () => {
    expect(t('Leaderboard.record.score', { score: 1234 })).toBe('1,234 pts');
  });
});
