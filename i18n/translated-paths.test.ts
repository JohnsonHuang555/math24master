import { describe, expect, it } from 'vitest';
import { isUntranslatedPage } from './translated-paths';

describe('isUntranslatedPage', () => {
  it('預設語系（不帶前綴）的頁面一律可收錄', () => {
    expect(isUntranslatedPage('/')).toBe(false);
    expect(isUntranslatedPage('/single-play')).toBe(false);
  });

  it('已翻譯的頁面可收錄', () => {
    expect(isUntranslatedPage('/en')).toBe(false);
    expect(isUntranslatedPage('/en/')).toBe(false);
    expect(isUntranslatedPage('/zh-CN/leaderboard')).toBe(false);
  });

  it('還沒翻譯的頁面不收錄', () => {
    expect(isUntranslatedPage('/en/single-play')).toBe(true);
    expect(isUntranslatedPage('/en/multiple-play/abc')).toBe(true);
    expect(isUntranslatedPage('/zh-CN/daily-challenge')).toBe(true);
  });
});
