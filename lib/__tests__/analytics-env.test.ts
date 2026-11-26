import { afterEach, describe, expect, it } from 'vitest';
import { gaInitScript, isAnalyticsHost } from '../analytics-env';

/** 在指定網址執行 GA4 初始化 script，回傳有沒有定義 gtag、送了哪些指令、載入了哪些 script */
function runInit(href: string) {
  const url = new URL(href);
  const fakeWindow: Record<string, unknown> = {};
  const appended: string[] = [];
  const store = new Map<string, string>();
  const fakeDocument = {
    createElement: () => ({}) as { src?: string; async?: boolean },
    head: {
      appendChild: (el: { src?: string }) => appended.push(el.src ?? ''),
    },
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
    gaInitScript('G-TEST'),
  )(fakeWindow, url, fakeDocument, fakeSession, URLSearchParams);
  const commands = ((fakeWindow.dataLayer as IArguments[]) ?? []).map(a =>
    Array.from(a),
  );
  return { hasGtag: typeof fakeWindow.gtag === 'function', commands, appended };
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
      expect(result).toEqual({ hasGtag: true, commands: [], appended: [] });
    }
  });

  it('已經有 gtag（測試注入的記錄器）時不覆蓋', () => {
    const recorder = () => {};
    const fakeWindow: Record<string, unknown> = { gtag: recorder };
    new Function(
      'window',
      'location',
      'document',
      'sessionStorage',
      'URLSearchParams',
      gaInitScript('G-TEST'),
    )(
      fakeWindow,
      new URL('http://localhost:3100/'),
      {},
      { getItem: () => null, setItem() {}, removeItem() {} },
      URLSearchParams,
    );
    expect(fakeWindow.gtag).toBe(recorder);
  });

  it('正式網域：載入 gtag.js 並送出 config；?ga_debug=1 開啟 DebugView', () => {
    const normal = runInit('https://math24master.com/zh-TW');
    expect(normal.hasGtag).toBe(true);
    expect(normal.appended).toEqual([
      'https://www.googletagmanager.com/gtag/js?id=G-TEST',
    ]);
    expect(normal.commands[1]).toEqual(['config', 'G-TEST', {}]);

    const debug = runInit('https://math24master.com/zh-TW?ga_debug=1');
    expect(debug.commands[1]).toEqual([
      'config',
      'G-TEST',
      { debug_mode: true },
    ]);
  });
});
