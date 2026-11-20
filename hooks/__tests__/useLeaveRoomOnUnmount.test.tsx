import { type ReactNode, StrictMode, act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLeaveRoomOnUnmount } from '../useLeaveRoomOnUnmount';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** 精簡版 renderHook：可選 Strict Mode，可用新的 props 重新 render */
function renderHook<P>(
  hook: (props: P) => void,
  options: {
    initialProps?: P;
    wrapper?: (props: { children: ReactNode }) => ReactNode;
  } = {},
) {
  const container = document.createElement('div');
  const root = createRoot(container);
  function Probe(props: { p: P }) {
    hook(props.p);
    return null;
  }
  const render = (p: P) => {
    const probe = createElement(Probe, { p });
    act(() =>
      root.render(
        options.wrapper ? createElement(options.wrapper, null, probe) : probe,
      ),
    );
  };
  render(options.initialProps as P);
  return {
    rerender: render,
    unmount: () => act(() => root.unmount()),
  };
}

describe('useLeaveRoomOnUnmount', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('Strict Mode 的「卸載再掛上」不會離開房間', () => {
    const leave = vi.fn();
    renderHook(() => useLeaveRoomOnUnmount('room-1', leave), {
      wrapper: StrictMode,
    });
    act(() => vi.runAllTimers());
    expect(leave).not.toHaveBeenCalled();
  });

  it('其他依賴變動造成重新 render、換了新的 leave 函式，也不會離開', () => {
    const { rerender } = renderHook(
      ({ name }) => useLeaveRoomOnUnmount('room-1', () => leaveFor(name)),
      { initialProps: { name: '' } },
    );
    const leaveFor = vi.fn();
    rerender({ name: 'Alice' });
    rerender({ name: 'Bob' });
    act(() => vi.runAllTimers());
    expect(leaveFor).not.toHaveBeenCalled();
  });

  it('真的卸載（SPA 離開房間頁）：離開這間房一次', () => {
    const leave = vi.fn();
    const { unmount } = renderHook(
      () => useLeaveRoomOnUnmount('room-1', leave),
      { wrapper: StrictMode },
    );
    unmount();
    act(() => vi.runAllTimers());
    expect(leave).toHaveBeenCalledTimes(1);
    expect(leave).toHaveBeenCalledWith('room-1');
  });

  it('換到另一間房：立即離開前一間，不會離開新的房間', () => {
    const leave = vi.fn();
    const { rerender } = renderHook(
      ({ roomId }) => useLeaveRoomOnUnmount(roomId, leave),
      { initialProps: { roomId: 'room-1' } },
    );
    rerender({ roomId: 'room-2' });
    expect(leave).toHaveBeenCalledWith('room-1');
    act(() => vi.runAllTimers());
    expect(leave).toHaveBeenCalledTimes(1);
  });

  it('還沒有房間 id 時什麼都不做', () => {
    const leave = vi.fn();
    const { unmount } = renderHook(() =>
      useLeaveRoomOnUnmount(undefined, leave),
    );
    unmount();
    act(() => vi.runAllTimers());
    expect(leave).not.toHaveBeenCalled();
  });
});
