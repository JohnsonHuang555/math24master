import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  dailySourceFrom,
  trackCtaClick,
  trackEvent,
  trackEventThen,
  trackFirstPuzzleSolved,
  trackGameComplete,
  trackGameStart,
  trackOnboardingComplete,
  trackOnboardingExit,
  trackQuickPlayPuzzleSolved,
  trackQuickPlayStart,
  trackShare,
  trackShareCardOpen,
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

  it('快速試玩與新手引導事件：snake_case 參數、秒數取整數', () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    trackQuickPlayStart({ source: 'home_hero', isFirstTime: true });
    trackFirstPuzzleSolved({ step: 1, elapsedMs: 12_499, hintLevel: 0 });
    trackOnboardingComplete({
      durationMs: 75_600,
      hintsUsed: 2,
      isFirstTime: true,
    });
    trackOnboardingExit({
      step: 2,
      elapsedMs: -5,
      reason: 'page_hide',
      isFirstTime: false,
    });

    expect(gtag.mock.calls).toEqual([
      [
        'event',
        'quick_play_start',
        { source: 'home_hero', is_first_time: true },
      ],
      [
        'event',
        'first_puzzle_solved',
        { step: 1, elapsed_sec: 12, hint_level: 0 },
      ],
      [
        'event',
        'onboarding_complete',
        { duration_sec: 76, hints_used: 2, is_first_time: true },
      ],
      [
        'event',
        'onboarding_exit',
        {
          step: 2,
          elapsed_sec: 0,
          reason: 'page_hide',
          is_first_time: false,
          transport_type: 'beacon',
        },
      ],
    ]);
  });

  it('入口點擊帶上位置與入口代碼', () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    trackCtaClick('home_hero', 'quick_play');
    trackCtaClick('quick_play_result', 'daily_challenge');

    expect(gtag.mock.calls).toEqual([
      ['event', 'cta_click', { location: 'home_hero', cta: 'quick_play' }],
      [
        'event',
        'cta_click',
        { location: 'quick_play_result', cta: 'daily_challenge' },
      ],
    ]);
  });

  it('每日挑戰入口只接受已知的 from，其餘算 direct', () => {
    expect(dailySourceFrom('home')).toBe('home');
    expect(dailySourceFrom('quick_play')).toBe('quick_play');
    expect(dailySourceFrom(null)).toBe('direct');
    expect(dailySourceFrom('<script>')).toBe('direct');
  });

  it('每輪每題答對送 quick_play_puzzle_solved，帶 step 與 is_first_time', () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    trackQuickPlayPuzzleSolved({ step: 1, isFirstTime: false, hintLevel: 1 });

    expect(gtag).toHaveBeenCalledWith('event', 'quick_play_puzzle_solved', {
      step: 1,
      is_first_time: false,
      hint_level: 1,
    });
  });

  describe('trackEventThen（整頁跳轉前先送事件）', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('GA 沒載入時立即執行 callback', () => {
      const callback = vi.fn();
      trackEventThen('cta_click', { cta: 'multiplayer' }, callback);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('gtag 回呼後才執行，且只執行一次', () => {
      vi.useFakeTimers();
      let eventCallback: (() => void) | undefined;
      window.gtag = vi.fn((_, __, params) => {
        eventCallback = params?.event_callback as () => void;
      });
      const callback = vi.fn();

      trackEventThen('cta_click', { cta: 'multiplayer' }, callback, 400);
      expect(window.gtag).toHaveBeenCalledWith(
        'event',
        'cta_click',
        expect.objectContaining({
          cta: 'multiplayer',
          transport_type: 'beacon',
          event_timeout: 400,
        }),
      );
      expect(callback).not.toHaveBeenCalled();

      eventCallback?.();
      vi.advanceTimersByTime(1000);
      eventCallback?.();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('gtag.js 被擋、一直沒回呼時，逾時後仍會執行', () => {
      vi.useFakeTimers();
      window.gtag = vi.fn();
      const callback = vi.fn();

      trackEventThen('cta_click', undefined, callback, 400);
      vi.advanceTimersByTime(399);
      expect(callback).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('gtag 丟錯時立即執行，不影響跳轉', () => {
      window.gtag = () => {
        throw new Error('blocked');
      };
      const callback = vi.fn();
      trackEventThen('cta_click', undefined, callback);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  it('分享：開啟預覽與每個動作的方式、結果', () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    trackShareCardOpen('match', false);
    trackShare('match', 'copied', 'copy_image');

    expect(gtag.mock.calls).toEqual([
      ['event', 'share_card_open', { mode: 'match', has_image: false }],
      [
        'event',
        'share_click',
        { mode: 'match', outcome: 'copied', method: 'copy_image' },
      ],
    ]);
  });
});
