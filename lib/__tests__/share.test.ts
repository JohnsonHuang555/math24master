import { afterEach, describe, expect, it, vi } from 'vitest';
import { canShareFiles, copyImage, copyText, shareImageFile } from '../share';

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
});
