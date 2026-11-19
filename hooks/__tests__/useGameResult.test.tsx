import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type GameResult, useGameResult } from '../useGameResult';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('useGameResult', () => {
  let container: HTMLDivElement;
  let root: Root;
  let result: GameResult | null = null;

  function Probe({ finished }: { finished: boolean }) {
    const r = useGameResult(finished);
    // 測試只讀最新一次 render 的值
    queueMicrotask(() => {
      result = r;
    });
    return null;
  }
  const render = async (finished: boolean) => {
    await act(async () => root.render(<Probe finished={finished} />));
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('每次進入結算都有新的 id 與結束時間，重新開局時清空', async () => {
    await render(false);
    expect(result).toBeNull();

    await render(true);
    const first = result;
    expect(first?.id).toBeTruthy();
    expect(first?.finishedAt).toBeInstanceOf(Date);

    // 同一個結算畫面重新 render，id 不變
    await render(true);
    expect(result).toBe(first);

    await render(false);
    expect(result).toBeNull();
    await render(true);
    expect(result?.id).not.toBe(first?.id);
  });
});
