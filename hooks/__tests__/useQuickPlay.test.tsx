import { StrictMode, act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import {
  type Mock,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { useQuickPlay } from '../useQuickPlay';

// 題目是隨機的；這裡只驗證事件，答案一律判對
vi.mock('@/lib/answer-check', () => ({ checkAnswer: () => ({ ok: true }) }));
vi.mock('@/lib/sound-manager', () => ({ playSound: () => {} }));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let game: ReturnType<typeof useQuickPlay>;

function Probe({
  onRender,
}: {
  onRender?: (g: ReturnType<typeof useQuickPlay>) => void;
}) {
  const quickPlay = useQuickPlay(() => 'home_hero');
  onRender?.(quickPlay);
  return null;
}

type Gtag = NonNullable<Window['gtag']>;

const eventNames = (gtag: Mock<Gtag>) =>
  gtag.mock.calls.map(([, name]) => name);

describe('useQuickPlay 的開局與離開事件', () => {
  let container: HTMLDivElement;
  let root: Root;
  let gtag: Mock<Gtag>;

  beforeEach(() => {
    gtag = vi.fn<Gtag>();
    window.gtag = gtag;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete window.gtag;
    localStorage.clear();
  });

  it('Strict Mode 初次掛載：quick_play_start 只送一次，不會誤送 onboarding_exit', () => {
    act(() =>
      root.render(
        <StrictMode>
          <Probe />
        </StrictMode>,
      ),
    );

    expect(eventNames(gtag)).toEqual(['quick_play_start']);
    expect(gtag.mock.calls[0][2]).toEqual({
      source: 'home_hero',
      is_first_time: true,
    });
  });

  it('瀏覽器上一頁與關閉分頁都只送一次 onboarding_exit', () => {
    act(() =>
      root.render(
        <StrictMode>
          <Probe />
        </StrictMode>,
      ),
    );

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.dispatchEvent(new Event('pagehide'));
    });

    expect(eventNames(gtag)).toEqual(['quick_play_start', 'onboarding_exit']);
    expect(gtag.mock.calls[1][2]).toMatchObject({
      step: 1,
      reason: 'navigate',
      is_first_time: true,
    });
  });

  it('卸載只解除監聽，不送事件；卸載後的 pagehide 也不會再送', () => {
    act(() => root.render(<Probe />));
    act(() => root.unmount());
    window.dispatchEvent(new Event('pagehide'));

    expect(eventNames(gtag)).toEqual(['quick_play_start']);
    // afterEach 會再 unmount 一次，換一個新的 root 避免重複卸載
    root = createRoot(container);
  });

  it('每一輪每答對一題送一次 quick_play_puzzle_solved；first_puzzle_solved 終身一次', () => {
    act(() =>
      root.render(
        <Probe
          onRender={g => {
            game = g;
          }}
        />,
      ),
    );
    for (let i = 0; i < 3; i++) act(() => void game.submit());

    // 再玩一次：回訪玩家（is_first_time=false）一樣有完整的每題事件
    act(() => game.start('replay'));
    for (let i = 0; i < 3; i++) act(() => void game.submit());

    const solved = gtag.mock.calls
      .filter(([, name]) => name === 'quick_play_puzzle_solved')
      .map(([, , params]) => params);
    expect(solved).toEqual([
      { step: 1, is_first_time: true, hint_level: 0 },
      { step: 2, is_first_time: true, hint_level: 0 },
      { step: 3, is_first_time: true, hint_level: 0 },
      { step: 1, is_first_time: false, hint_level: 0 },
      { step: 2, is_first_time: false, hint_level: 0 },
      { step: 3, is_first_time: false, hint_level: 0 },
    ]);
    expect(
      eventNames(gtag).filter(name => name === 'first_puzzle_solved'),
    ).toHaveLength(1);
    expect(
      eventNames(gtag).filter(name => name === 'onboarding_complete'),
    ).toHaveLength(2);
  });
});
