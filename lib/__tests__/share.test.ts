import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  canShareFiles,
  copyImage,
  copyText,
  shareImageFile,
  shareTextOnly,
} from '../share';

const file = () => new File(['png'], 'card.png', { type: 'image/png' });

describe('分享動作', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('不支援 Web Share 檔案分享時，shareImageFile 回傳 failed、不會丟錯', async () => {
    vi.stubGlobal('navigator', { ...navigator, share: undefined });
    expect(canShareFiles(file())).toBe(false);
    await expect(shareImageFile(file())).resolves.toBe('failed');
  });

  it('使用者關掉分享選單算 cancelled，其餘錯誤算 failed', async () => {
    const abort = Object.assign(new Error('closed'), { name: 'AbortError' });
    const share = vi
      .fn()
      .mockRejectedValueOnce(abort)
      .mockRejectedValueOnce(new Error('NotAllowed'));
    vi.stubGlobal('navigator', {
      ...navigator,
      share,
      canShare: () => true,
    });
    await expect(shareImageFile(file())).resolves.toBe('cancelled');
    await expect(shareImageFile(file())).resolves.toBe('failed');
  });

  it('剪貼簿不能寫圖片時 copyImage 回傳 failed', async () => {
    vi.stubGlobal('ClipboardItem', undefined);
    await expect(copyImage(file())).resolves.toBe('failed');
  });

  it('copyText 成功回傳 copied，被拒絕回傳 failed', async () => {
    const writeText = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('denied'));
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    await expect(copyText('hi')).resolves.toBe('copied');
    await expect(copyText('hi')).resolves.toBe('failed');
  });

  it('分享圖片時網址寫在文字裡，不另外放 url 欄位（有些 App 會丟掉 url 或貼兩次）', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, share, canShare: () => true });
    const card = file();

    await expect(
      shareImageFile(card, {
        title: '24點大師',
        text: '51 分\nhttps://math24master.com/?utm_source=share',
      }),
    ).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith({
      title: '24點大師',
      text: '51 分\nhttps://math24master.com/?utm_source=share',
      files: [card],
    });
    expect(share.mock.calls[0][0]).not.toHaveProperty('url');
  });

  it('平台不接受「圖片＋文字」時退回只分享圖片', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn((data: ShareData) => !data.text);
    vi.stubGlobal('navigator', { ...navigator, share, canShare });
    const card = file();

    await expect(
      shareImageFile(card, { title: 't', text: 'with link' }),
    ).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith({ title: 't', files: [card] });
  });

  it('圖卡失敗時可以只分享文字；不支援分享選單時回傳 failed', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, share });
    await expect(shareTextOnly({ text: 'hi\nhttps://x' })).resolves.toBe(
      'shared',
    );
    expect(share).toHaveBeenCalledWith({
      title: undefined,
      text: 'hi\nhttps://x',
    });

    vi.stubGlobal('navigator', { ...navigator, share: undefined });
    await expect(shareTextOnly({ text: 'hi' })).resolves.toBe('failed');
  });
});
