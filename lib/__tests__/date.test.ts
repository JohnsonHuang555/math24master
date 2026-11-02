import { describe, expect, it } from 'vitest';
import { msUntilNextTaipeiDay } from '@/lib/date';

describe('msUntilNextTaipeiDay', () => {
  it('台灣時間 23:00 時剩 1 小時', () => {
    // 2026-11-01 23:00 +08:00 = 2026-11-01 15:00 UTC
    expect(msUntilNextTaipeiDay(Date.UTC(2026, 10, 1, 15, 0, 0))).toBe(3600000);
  });

  it('剛好台灣時間 00:00 時剩一整天', () => {
    expect(msUntilNextTaipeiDay(Date.UTC(2026, 10, 1, 16, 0, 0))).toBe(
      86400000,
    );
  });

  it('與玩家所在時區無關，只看絕對時間', () => {
    // UTC 00:00 = 台灣 08:00，剩 16 小時
    expect(msUntilNextTaipeiDay(Date.UTC(2026, 10, 2, 0, 0, 0))).toBe(
      16 * 3600000,
    );
  });
});
