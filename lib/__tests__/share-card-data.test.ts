import { describe, expect, it } from 'vitest';
import {
  bestHandOf,
  cardsInFormula,
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
});
