import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES } from './locales';
import { pickLocale } from './pick-locale';

const ALL = SUPPORTED_LOCALES;

describe('pickLocale', () => {
  it('沒有 Accept-Language 時用預設語系（爬蟲看到 zh-TW）', () => {
    expect(pickLocale(null, ALL)).toBe('zh-TW');
    expect(pickLocale('', ALL)).toBe('zh-TW');
  });

  it.each([
    ['zh-TW', 'zh-TW'],
    ['zh-HK', 'zh-TW'],
    ['zh-MO', 'zh-TW'],
    ['zh-Hant-HK', 'zh-TW'],
    ['zh', 'zh-TW'],
    ['zh-CN', 'zh-CN'],
    ['zh-SG', 'zh-CN'],
    ['zh-Hans', 'zh-CN'],
    ['zh-Hans-TW', 'zh-CN'],
    ['en-US', 'en'],
    ['en', 'en'],
  ])('%s → %s', (header, expected) => {
    expect(pickLocale(header, ALL)).toBe(expected);
  });

  it('不支援的語言一律用 en', () => {
    expect(pickLocale('ja-JP', ALL)).toBe('en');
    expect(pickLocale('ko, fr;q=0.8', ALL)).toBe('en');
  });

  it('依權重取第一個支援的語言', () => {
    expect(pickLocale('ja, zh-TW;q=0.8, en;q=0.5', ALL)).toBe('zh-TW');
    expect(pickLocale('en;q=0.5, zh-CN;q=0.9', ALL)).toBe('zh-CN');
    expect(pickLocale('fr, en-GB;q=0.9, zh;q=0.8', ALL)).toBe('en');
  });

  it('權重為 0 的語言不採用', () => {
    expect(pickLocale('zh-CN;q=0, en', ALL)).toBe('en');
  });

  it('結果沒開放時退回預設語系', () => {
    expect(pickLocale('en-US', ['zh-TW'])).toBe('zh-TW');
    expect(pickLocale('zh-CN', ['zh-TW', 'en'])).toBe('zh-TW');
  });
});
