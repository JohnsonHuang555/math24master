import { describe, expect, it } from 'vitest';
import { tabletopBetaNotice } from '@/lib/tabletop-beta';

describe('tabletopBetaNotice', () => {
  it('重置日之前顯示提示與日期', () => {
    expect(tabletopBetaNotice('2026-10-24')).toBe(
      '測試版：排行榜將於 2026/11/07 重置',
    );
    expect(tabletopBetaNotice('2026-11-06')).toBe(
      '測試版：排行榜將於 2026/11/07 重置',
    );
  });

  it('重置日當天與之後不再顯示', () => {
    expect(tabletopBetaNotice('2026-11-07')).toBeNull();
    expect(tabletopBetaNotice('2026-12-01')).toBeNull();
  });
});
