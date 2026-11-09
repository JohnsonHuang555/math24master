import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  trackEvent,
  trackGameComplete,
  trackGameStart,
  trackShare,
} from '../analytics';

describe('analytics', () => {
  afterEach(() => {
    delete window.gtag;
  });

  it('GA 尚未載入時不會丟錯', () => {
    expect(() => trackEvent('game_start')).not.toThrow();
  });

  it('gtag 本身丟錯時不會影響呼叫端', () => {
    window.gtag = () => {
      throw new Error('blocked');
    };
    expect(() => trackGameStart('classic')).not.toThrow();
  });

  it('開局、完成、分享事件帶上模式代碼', () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    trackGameStart('tabletop');
    trackGameComplete('match', { result: 'cleared', score: 42 });
    trackShare('daily', 'copied');

    expect(gtag).toHaveBeenNthCalledWith(1, 'event', 'game_start', {
      mode: 'tabletop',
    });
    expect(gtag).toHaveBeenNthCalledWith(2, 'event', 'game_complete', {
      mode: 'match',
      result: 'cleared',
      score: 42,
    });
    expect(gtag).toHaveBeenNthCalledWith(3, 'event', 'share_click', {
      mode: 'daily',
      outcome: 'copied',
    });
  });
});
