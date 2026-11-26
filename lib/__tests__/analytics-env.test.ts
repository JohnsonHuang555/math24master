import { afterEach, describe, expect, it } from 'vitest';
import {
  ANALYTICS_STATE_EVENT,
  ANALYTICS_STATE_KEY,
  gaInitScript,
  isAnalyticsHost,
} from '../analytics-env';

/** 在指定網址執行 GA4 初始化 script，回傳有沒有定義 gtag、送了哪些指令、載入了哪些 script、管線狀態 */
function runInit(href: string, existing: Record<string, unknown> = {}) {
  const url = new URL(href);
  const fakeWindow: Record<string, unknown> = {
    ...existing,
    dispatchEvent: (e: Event) => void states.push(`${e.type}`),
  };
  const states: string[] = [];
  const scripts: {
    src?: string;
    async?: boolean;
    onload?: () => void;
    onerror?: () => void;
  }[] = [];
  const store = new Map<string, string>();
  const fakeDocument = {
    createElement: () => {
      const el = {};
      scripts.push(el);
      return el;
    },
    head: { appendChild: () => {} },
  };
  const fakeSession = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  new Function(
    'window',
    'location',
    'document',
    'sessionStorage',
    'URLSearchParams',
    'Event',
    gaInitScript('G-TEST'),
  )(fakeWindow, url, fakeDocument, fakeSession, URLSearchParams, Event);
  const commands = () =>
    ((fakeWindow.dataLayer as IArguments[]) ?? []).map(a => Array.from(a));
  const state = () =>
    (fakeWindow[ANALYTICS_STATE_KEY] as { state?: string } | undefined)?.state;
  return {
    hasGtag: typeof fakeWindow.gtag === 'function',
    gtag: fakeWindow.gtag as (...args: unknown[]) => void,
    commands,
    appended: scripts.map(s => s.src ?? ''),
    scripts,
    state,
    states,
  };
}

describe('GA4 只在正式網域載入', () => {
  afterEach(() => {
    delete window.gtag;
  });

  it('正式網域才算', () => {
    expect(isAnalyticsHost('math24master.com')).toBe(true);
    expect(isAnalyticsHost('WWW.Math24Master.com')).toBe(true);
    for (const host of [
      'localhost',
      '127.0.0.1',
      'math24master-git-feat-x.vercel.app',
      'math24master.com.evil.example',
    ]) {
      expect(isAnalyticsHost(host)).toBe(false);
    }
  });

  it('本機、E2E、Vercel preview：事件只留在本地 dataLayer，不送 config、不載入 gtag.js', () => {
    for (const href of [
      'http://localhost:3100/zh-TW/multiple-play',
      'https://math24master-abc123.vercel.app/',
    ]) {
      const result = runInit(href);
      expect(result.hasGtag).toBe(true);
      expect(result.commands()).toEqual([]);
      expect(result.appended).toEqual([]);
      expect(result.state()).toBe('local');
    }
  });

  it('已經有 gtag（測試注入的記錄器）時不覆蓋', () => {
    const recorder = () => {};
    const result = runInit('http://localhost:3100/', { gtag: recorder });
    expect(result.gtag).toBe(recorder);
  });

  it('正式網域：gtag.js 載入前事件先進佇列（排在 config 之後），載入成功變 ready、失敗變 blocked', () => {
    const ok = runInit('https://math24master.com/zh-TW');
    expect(ok.state()).toBe('loading');
    // 應用程式在 gtag.js 載入前送出的事件：排在 js、config 之後，gtag.js 載入後依序處理
    ok.gtag('event', 'game_start', { mode: 'multiplayer' });
    expect(ok.commands().map(c => c[0])).toEqual(['js', 'config', 'event']);
    ok.scripts[0].onload!();
    expect(ok.state()).toBe('ready');
    expect(ok.states).toContain(ANALYTICS_STATE_EVENT);

    const blocked = runInit('https://math24master.com/zh-TW');
    blocked.scripts[0].onerror!();
    expect(blocked.state()).toBe('blocked');
  });

  it('正式網域：載入 gtag.js 並送出 config；?ga_debug=1 開啟 DebugView', () => {
    const normal = runInit('https://math24master.com/zh-TW');
    expect(normal.hasGtag).toBe(true);
    expect(normal.appended).toEqual([
      'https://www.googletagmanager.com/gtag/js?id=G-TEST',
    ]);
    expect(normal.commands()[1]).toEqual(['config', 'G-TEST', {}]);

    const debug = runInit('https://math24master.com/zh-TW?ga_debug=1');
    expect(debug.commands()[1]).toEqual([
      'config',
      'G-TEST',
      { debug_mode: true },
    ]);
  });
});
