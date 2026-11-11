import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';
import en from '@/messages/en.json';
import zhTW from '@/messages/zh-TW.json';
import { TabletopErrorCode } from '@/models/TabletopError';
import { tabletopErrorText } from './tabletop-messages';

const zh = createTranslator({
  locale: 'zh-TW',
  messages: zhTW,
  namespace: 'TabletopError',
});
const enT = createTranslator({
  locale: 'en',
  messages: en,
  namespace: 'TabletopError',
});

describe('tabletopErrorText', () => {
  it('帶參數的錯誤', () => {
    expect(
      tabletopErrorText(zh, {
        code: TabletopErrorCode.SetSize,
        params: { min: 3, max: 5, count: 2 },
      }),
    ).toBe('需要 3～5 張數字牌（目前 2 張）');
  });

  it('依張數選擇顏色規則', () => {
    const rule = (size: number) =>
      tabletopErrorText(zh, {
        code: TabletopErrorCode.ColorRule,
        params: { size },
      });
    expect(rule(3)).toBe('3 張的牌組必須同色，或三種不同顏色');
    expect(rule(4)).toBe('4 張的牌組必須同色，或紅青黃黑各一張');
    expect(rule(5)).toBe('5 張的牌組必須同色');
  });

  it('發生在某一組牌組時加上組別', () => {
    expect(
      tabletopErrorText(zh, {
        code: TabletopErrorCode.NotTwentyFour,
        params: { value: 18 },
        setIndex: 2,
      }),
    ).toBe('第 2 組：目前 = 18');
  });

  it('英文依數量使用單複數', () => {
    const loose = (count: number) =>
      tabletopErrorText(enT, {
        code: TabletopErrorCode.LooseCardsRemaining,
        params: { count },
      });
    expect(loose(1)).toBe('1 loose card needs to go back into a set');
    expect(loose(3)).toBe('3 loose cards need to go back into a set');
  });
});
