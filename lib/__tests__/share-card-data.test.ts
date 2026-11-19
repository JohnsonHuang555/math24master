import { describe, expect, it } from 'vitest';
import {
  bestHandOf,
  cardsInFormula,
  composeShareText,
  createResultId,
  formatCardDate,
  shareLinkFor,
  splitAroundValue,
} from '../share-card/data';

describe('分享圖卡的資料整理', () => {
  it('從顯示用算式依序取出牌（含兩位數）', () => {
    expect(cardsInFormula('4×6×(5÷5)')).toEqual([4, 6, 5, 5]);
    expect(cardsInFormula('(13−1)×(1+1)')).toEqual([13, 1, 1, 1]);
    expect(cardsInFormula('')).toEqual([]);
  });

  it('最高分的一手：取分數最高、同分取較早的一手；沒有紀錄時為 undefined', () => {
    expect(bestHandOf([])).toBeUndefined();
    expect(
      bestHandOf([
        { playerFormula: '6+6+6+6', playerScore: 3 },
        { playerFormula: '4×6×(5÷5)', playerScore: 8 },
        { playerFormula: '3×8×(2÷2)', playerScore: 8 },
      ]),
    ).toEqual({ cards: [4, 6, 5, 5], formula: '4×6×(5÷5)', score: 8 });
  });

  it('分享連結帶 utm，GA4 可以把點進來的人歸到分享圖卡', () => {
    const url = new URL(
      shareLinkFor('https://math24master.com', '/en/daily-challenge', 'daily'),
    );
    expect(url.pathname).toBe('/en/daily-challenge');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      utm_source: 'share',
      utm_medium: 'result_card',
      utm_campaign: 'daily',
    });
  });

  it('日期依語系格式化，不寫死 zh-TW', () => {
    const date = new Date(2026, 10, 19);
    expect(formatCardDate(date, 'zh-TW')).toBe('2026/11/19');
    expect(formatCardDate(date, 'en')).toBe('11/19/2026');
  });

  it('把含數字的句子拆成前後兩段（數字另外用 Baloo 2 畫）', () => {
    expect(splitAroundValue(v => `個人最高 ${v} 分`)).toEqual([
      '個人最高 ',
      ' 分',
    ]);
    expect(splitAroundValue(v => `Personal best ${v}`)).toEqual([
      'Personal best ',
      '',
    ]);
  });

  it('分享文字附上帶 utm 的網址；最後一行是裸網域時換成完整網址，不重複', () => {
    const url = 'https://math24master.com/daily-challenge?utm_source=share';
    expect(composeShareText('本日 17 分\nmath24master.com', url)).toBe(
      `本日 17 分\n${url}`,
    );
    expect(composeShareText('經典模式：51 分', url)).toBe(
      `經典模式：51 分\n${url}`,
    );
    // 還沒有網址（例如尚未打開預覽）時維持原文
    expect(composeShareText('經典模式：51 分', '')).toBe('經典模式：51 分');
  });

  it('每局結算 id 不重複；沒有 randomUUID 時也能產生', () => {
    const ids = new Set(Array.from({ length: 50 }, createResultId));
    expect(ids.size).toBe(50);

    const original = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      value: {},
      configurable: true,
    });
    try {
      expect(createResultId()).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        value: original,
        configurable: true,
      });
    }
  });
});
