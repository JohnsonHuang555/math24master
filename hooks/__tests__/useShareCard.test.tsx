import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useShareCard } from '../useShareCard';

vi.mock('@/i18n/navigation', () => ({
  getPathname: ({ href, locale }: { href: string; locale: string }) =>
    locale === 'zh-TW' ? href : `/${locale}${href}`,
}));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type Share = ReturnType<typeof useShareCard>;

function Probe(props: {
  resultId: string | null;
  render: () => Promise<Blob | null>;
  onRender: (s: Share) => void;
}) {
  props.onRender(
    useShareCard({
      mode: 'classic',
      fileName: 'card.png',
      resultId: props.resultId,
      path: '/single-play',
      render: props.render,
    }),
  );
  return null;
}

const png = () => new Blob(['png'], { type: 'image/png' });

describe('useShareCard 的圖卡快取', () => {
  let container: HTMLDivElement;
  let root: Root;
  let share: Share;

  const mount = (
    resultId: string | null,
    render: () => Promise<Blob | null>,
    locale: 'zh-TW' | 'en' = 'zh-TW',
  ) =>
    act(() =>
      root.render(
        <NextIntlClientProvider locale={locale} messages={{}}>
          <Probe
            resultId={resultId}
            render={render}
            onRender={s => {
              share = s;
            }}
          />
        </NextIntlClientProvider>,
      ),
    );

  beforeEach(() => {
    window.gtag = vi.fn();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete window.gtag;
  });

  it('同一局重開預覽不重畫；不同局即使分數一樣也要重畫', async () => {
    const render = vi.fn(async () => png());
    mount('game-1', render);

    await act(() => share.start());
    expect(share.open).toBe(true);
    const first = share.file;
    act(() => share.setOpen(false));
    await act(() => share.start());
    expect(render).toHaveBeenCalledTimes(1);
    expect(share.file).toBe(first);

    // 下一局（同樣的分數、同樣的 render 內容）
    mount('game-2', render);
    expect(share.open).toBe(false);
    expect(share.file).toBeNull();
    await act(() => share.start());
    expect(render).toHaveBeenCalledTimes(2);
    expect(share.file).not.toBe(first);
  });

  it('語系不同時不沿用已產生的圖，分享連結也換成該語系', async () => {
    const render = vi.fn(async () => png());
    mount('game-1', render, 'zh-TW');
    await act(() => share.start());
    expect(new URL(share.shareUrl).pathname).toBe('/single-play');

    mount('game-1', render, 'en');
    await act(() => share.start());
    expect(render).toHaveBeenCalledTimes(2);
    expect(new URL(share.shareUrl).pathname).toBe('/en/single-play');
  });

  it('圖卡產生失敗仍打開預覽（只能分享文字與連結），且不快取失敗', async () => {
    const render = vi
      .fn<() => Promise<Blob | null>>()
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('canvas blocked'))
      .mockResolvedValue(png());
    mount('game-1', render);

    await act(() => share.start());
    expect(share.open).toBe(true);
    expect(share.imageFailed).toBe(true);
    expect(share.file).toBeNull();
    expect(share.shareUrl).toContain('utm_source=share');

    await act(() => share.start());
    expect(share.imageFailed).toBe(true);

    await act(() => share.start());
    expect(render).toHaveBeenCalledTimes(3);
    expect(share.imageFailed).toBe(false);
    expect(share.file).not.toBeNull();

    expect(window.gtag).toHaveBeenCalledWith('event', 'share_card_open', {
      mode: 'classic',
      has_image: false,
    });
  });

  it('產生期間換到下一局，上一局的圖不會出現在新局', async () => {
    let resolve!: (blob: Blob) => void;
    const render = vi.fn(() => new Promise<Blob | null>(r => (resolve = r)));
    mount('game-1', render);

    let pending!: Promise<void>;
    act(() => {
      pending = share.start();
    });
    expect(share.isGenerating).toBe(true);

    mount('game-2', render);
    await act(async () => {
      resolve(png());
      await pending;
    });
    expect(share.open).toBe(false);
    expect(share.file).toBeNull();
  });

  it('還沒結算（沒有 resultId）時不能開始', async () => {
    const render = vi.fn(async () => png());
    mount(null, render);
    expect(share.ready).toBe(false);
    await act(() => share.start());
    expect(render).not.toHaveBeenCalled();
    expect(share.open).toBe(false);
  });
});
