import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  dismissOnboardingTips,
  loadOnboarding,
  markFirstPuzzleSolved,
  markOnboardingCompleted,
} from '../onboarding-storage';

const KEY = 'math24_onboarding_v1';

describe('onboarding-storage', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('沒有紀錄時當成第一次玩', () => {
    expect(loadOnboarding()).toEqual({
      completedAt: undefined,
      bestMs: undefined,
      tipsDismissed: false,
      firstSolvedAt: undefined,
    });
  });

  it('壞掉的資料不會丟錯，當成沒有紀錄', () => {
    for (const raw of ['not json', '[]', 'null', '{"bestMs":"fast"}']) {
      localStorage.setItem(KEY, raw);
      expect(loadOnboarding().bestMs).toBeUndefined();
      expect(loadOnboarding().completedAt).toBeUndefined();
    }
  });

  it('first_puzzle_solved 只會在第一次答對時成立', () => {
    expect(markFirstPuzzleSolved()).toBe(true);
    expect(markFirstPuzzleSolved()).toBe(false);
    expect(loadOnboarding().firstSolvedAt).toBeTypeOf('string');
  });

  it('完成時間保留第一次，最快耗時取較小值', () => {
    markOnboardingCompleted(60_000, new Date('2026-11-13T00:00:00Z'));
    markOnboardingCompleted(90_000, new Date('2026-11-14T00:00:00Z'));
    expect(loadOnboarding()).toMatchObject({
      completedAt: '2026-11-13T00:00:00.000Z',
      bestMs: 60_000,
    });
    markOnboardingCompleted(30_000);
    expect(loadOnboarding().bestMs).toBe(30_000);
  });

  it('關閉提示與其他欄位互不覆蓋', () => {
    markFirstPuzzleSolved();
    dismissOnboardingTips();
    const record = loadOnboarding();
    expect(record.tipsDismissed).toBe(true);
    expect(record.firstSolvedAt).toBeTypeOf('string');
  });

  it('localStorage 無法寫入時不影響遊戲', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => dismissOnboardingTips()).not.toThrow();
    expect(() => markOnboardingCompleted(1000)).not.toThrow();
  });
});
