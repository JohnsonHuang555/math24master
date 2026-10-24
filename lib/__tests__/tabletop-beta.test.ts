import { describe, expect, it } from 'vitest';
import { isTabletopBeta } from '@/lib/tabletop-beta';

describe('isTabletopBeta', () => {
  it('重置日之前仍在測試期', () => {
    expect(isTabletopBeta('2026-10-24')).toBe(true);
    expect(isTabletopBeta('2026-11-06')).toBe(true);
  });

  it('重置日當天與之後不再是測試期', () => {
    expect(isTabletopBeta('2026-11-07')).toBe(false);
    expect(isTabletopBeta('2026-12-01')).toBe(false);
  });
});
