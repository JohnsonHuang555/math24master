import { describe, expect, it } from 'vitest';
import { containsProfanity } from './profanity';

describe('containsProfanity', () => {
  it.each([
    '幹你娘',
    '靠北',
    '機掰人',
    '小智障',
    '他媽的',
    '傻逼',
    '草泥马',
    'fuck',
    'FUCK',
    'Fuckboy',
    'shit123',
    'bitch',
    'ass',
    'big ass',
    'nigger',
  ])('擋下「%s」', name => {
    expect(containsProfanity(name)).toBe(true);
  });

  it.each([
    ['中間插空白或符號', '幹 你 娘'],
    ['中間插符號', 'f.u.c.k'],
    ['數字替代', 'sh1t'],
    ['符號替代', 'b!tch'],
    ['全形英文', 'ｆｕｃｋ'],
    ['零寬字元', 'fu​ck'],
    ['中英混寫', '我是ass'],
  ])('%s：%s', (_, name) => {
    expect(containsProfanity(name)).toBe(true);
  });

  it.each([
    '小明',
    'Alexandra',
    '幹部',
    '能幹',
    '操場',
    '體操',
    '斑鳩',
    'class',
    'Cassandra',
    'assess',
    'cucumber',
    'Fukuda',
    'Hancock',
    'Dickens',
    'grape',
    'Nazir',
    'Player1',
    '24點大師',
  ])('不誤擋「%s」', name => {
    expect(containsProfanity(name)).toBe(false);
  });

  it('空字串不算', () => {
    expect(containsProfanity('')).toBe(false);
  });
});
