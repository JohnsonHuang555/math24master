import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import en from '@/messages/en.json';
import zhTW from '@/messages/zh-TW.json';
import { RankedPlayer } from '@/models/RoomView';
import { GameOverModal } from '../game-over-modal';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const player = (
  id: string,
  name: string,
  score: number,
  extra: Partial<RankedPlayer> = {},
): RankedPlayer => ({
  id,
  name,
  score,
  isMaster: false,
  isLastRoundPlayer: false,
  isReady: true,
  handCardCount: 0,
  ...extra,
});

/** 已依分數排序：電腦 1 第一、自己第二、另一位真人第三、電腦 2 最後 */
const ranking = [
  player('bot-1', 'bot:normal:1', 20, { isBot: true, botDifficulty: 'normal' }),
  player('me', 'Alice', 12, { isMaster: true }),
  player('bob', 'Bob', 8),
  player('bot-2', 'bot:normal:2', 3, { isBot: true, botDifficulty: 'normal' }),
];

describe('GameOverModal（多人結算）', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.innerHTML = '';
  });

  function render(
    props: Partial<Parameters<typeof GameOverModal>[0]>,
    locale: 'zh-TW' | 'en' = 'zh-TW',
  ) {
    const handlers = {
      onClose: vi.fn(),
      onPlayAgain: vi.fn(),
      onGoHome: vi.fn(),
    };
    act(() =>
      root.render(
        <NextIntlClientProvider
          locale={locale}
          messages={locale === 'en' ? en : zhTW}
        >
          <GameOverModal
            isOpen
            players={ranking}
            currentPlayerId="me"
            isMultiplePlay
            winnerId="bot-1"
            rematchSource="quick_match"
            {...handlers}
            {...props}
          />
        </NextIntlClientProvider>,
      ),
    );
    return handlers;
  }

  const byTestId = (id: string) =>
    document.body.querySelector(`[data-testid="${id}"]`)!;
  const rows = () => [
    ...document.body.querySelectorAll('[data-testid="game-over-player"]'),
  ];
  const button = (name: string) =>
    [...document.body.querySelectorAll('button')].find(
      b => b.textContent?.trim() === name,
    )!;

  it('顯示勝利者、自己的名次與全部玩家的分數，電腦玩家有標記', () => {
    render({});
    expect(byTestId('game-over-title').textContent).toBe('電腦 獲勝');
    expect(byTestId('game-over-self-rank').textContent).toBe(
      '你是第 2 名（共 4 人）',
    );
    expect(rows().map(r => r.getAttribute('data-player-kind'))).toEqual([
      'bot',
      'human',
      'human',
      'bot',
    ]);
    // 電腦有「電腦」標籤，真人沒有；全部玩家的分數都顯示
    expect(rows()[0].textContent).toContain('電腦');
    expect(rows()[2].textContent).not.toContain('電腦');
    expect(rows().map(r => r.textContent?.match(/(\d+) 分/)?.[1])).toEqual([
      '20',
      '12',
      '8',
      '3',
    ]);
    // 名字只顯示，不會出現電腦的內部代碼
    expect(document.body.textContent).not.toContain('bot:normal');
  });

  it('自己贏了：標題是「你贏了！」', () => {
    render({ winnerId: 'me' });
    expect(byTestId('game-over-title').textContent).toBe('你贏了！');
  });

  it('平手時用伺服器給的勝利者，不是排序第一位', () => {
    render({ winnerId: 'bob' });
    expect(byTestId('game-over-title').textContent).toBe('Bob 獲勝');
  });

  it('「再玩一場」與「回大廳」各自觸發；說明依配對方式不同', () => {
    const handlers = render({});
    act(() => button('再玩一場').click());
    act(() => button('回大廳').click());
    expect(handlers.onPlayAgain).toHaveBeenCalledTimes(1);
    expect(handlers.onGoHome).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain('會重新配對對手');

    render({ rematchSource: 'private_room' });
    expect(document.body.textContent).toContain('等房主開始下一局');
  });

  it('英文版也有勝利者與名次', () => {
    render({}, 'en');
    expect(byTestId('game-over-title').textContent).toBe('Bot wins');
    expect(byTestId('game-over-self-rank').textContent).toBe(
      'You placed 2nd of 4',
    );
    expect(button('Play again')).toBeTruthy();
    expect(button('Back to lobby')).toBeTruthy();
  });

  it('單人模式的結算不受影響：顯示總分與原本的兩個按鈕', () => {
    render({
      isMultiplePlay: false,
      isSinglePlay: true,
      players: [player('me', 'Alice', 42)],
      winnerId: undefined,
      rematchSource: undefined,
    });
    expect(byTestId('game-over-title').textContent).toBe('遊戲結束');
    expect(
      document.body.querySelector('[data-testid="game-over-self-rank"]'),
    ).toBeNull();
    expect(document.body.textContent).toContain('42');
    expect(button('回首頁')).toBeTruthy();
    expect(button('再來一局')).toBeTruthy();
  });
});
