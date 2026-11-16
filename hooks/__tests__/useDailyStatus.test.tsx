import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveDailyRecord } from '@/lib/daily-seed';
import { type DailyStatus, useDailyStatus } from '../useDailyStatus';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let status: DailyStatus | null = null;

function Probe({ onRender }: { onRender: (s: DailyStatus | null) => void }) {
  onRender(useDailyStatus());
  return null;
}

const render = (root: Root) =>
  root.render(
    <Probe
      onRender={s => {
        status = s;
      }}
    />,
  );

describe('useDailyStatus 跨日更新', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    // 台灣時間 2026-11-16 23:59:00
    vi.setSystemTime(new Date('2026-11-16T15:59:00Z'));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
    vi.useRealTimers();
  });

  it('頁面開著過了台灣 00:00，「今日已完成」會變回未完成並保留連續天數', () => {
    saveDailyRecord('2026-11-16', 10, []);
    act(() => render(root));
    expect(status?.doneToday).toBe(true);

    act(() => vi.advanceTimersByTime(2 * 60 * 1000));
    expect(status).toEqual({ doneToday: false, streak: 1 });
  });

  it('從背景切回分頁時重讀（例如在別的分頁完成了今日挑戰）', () => {
    act(() => render(root));
    expect(status?.doneToday).toBe(false);

    saveDailyRecord('2026-11-16', 10, []);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(status?.doneToday).toBe(true);
  });
});
