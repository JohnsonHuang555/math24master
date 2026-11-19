/** 分享結果，可被各模式的結算畫面共用 */
export type ShareOutcome =
  'shared' | 'copied' | 'downloaded' | 'cancelled' | 'failed';

/**
 * 分享文字到系統分享選單（手機上可直接分享至 LINE / IG / Messenger 等 App）；
 * 裝置不支援 Web Share API 時，改為複製到剪貼簿讓使用者自行貼上。
 */
export async function shareResult(
  text: string,
  options?: { title?: string; url?: string },
): Promise<ShareOutcome> {
  const shareData = {
    title: options?.title,
    text,
    url: options?.url,
  };

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    (typeof navigator.canShare !== 'function' || navigator.canShare(shareData))
  ) {
    try {
      await navigator.share(shareData);
      return 'shared';
    } catch (e) {
      // 使用者主動關閉分享選單，不視為錯誤
      if (e instanceof Error && e.name === 'AbortError') {
        return 'cancelled';
      }
      // 其他錯誤（例如部分瀏覽器的權限限制）改走剪貼簿 fallback
    }
  }

  try {
    const fallbackText = options?.url ? `${text}\n${options.url}` : text;
    await navigator.clipboard.writeText(fallbackText);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/** 這個瀏覽器能不能把圖片檔交給系統分享選單（手機 Safari、Android Chrome 可以；多數桌機不行） */
export function canShareFiles(file: File): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  );
}

/** 這個瀏覽器能不能把圖片寫進剪貼簿（桌機 Chrome、Edge、Safari 可以） */
export function canCopyImage(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.ClipboardItem === 'function' &&
    typeof navigator.clipboard?.write === 'function'
  );
}

/**
 * 用系統分享選單分享圖片。
 *
 * 網址不另外放在 `url` 欄位，而是寫進 `text` 的最後一行：帶檔案分享時，
 * 有些平台／App 會丟掉 `url`（例如 iOS 分享到部分 App 只收圖片），也有些會把 `text` 與 `url` 各貼一次。
 * 平台不接受「檔案＋文字」時（`canShare` 回 false），退回只分享圖片；
 * 不論哪種情況，App 都可能不保留文字，所以預覽裡一直提供「複製連結」
 */
export async function shareImageFile(
  file: File,
  options?: { title?: string; text?: string },
): Promise<ShareOutcome> {
  if (!canShareFiles(file)) return 'failed';
  const withText: ShareData = {
    title: options?.title,
    text: options?.text,
    files: [file],
  };
  const data =
    options?.text && !navigator.canShare(withText)
      ? { title: options?.title, files: [file] }
      : withText;
  try {
    await navigator.share(data);
    return 'shared';
  } catch (e) {
    return e instanceof Error && e.name === 'AbortError'
      ? 'cancelled'
      : 'failed';
  }
}

/** 這個瀏覽器能不能用系統分享選單分享文字 */
export function canShareText(): boolean {
  return (
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  );
}

/** 只分享文字（含網址）；圖卡產生失敗時用 */
export async function shareTextOnly(options: {
  title?: string;
  text: string;
}): Promise<ShareOutcome> {
  if (!canShareText()) return 'failed';
  try {
    await navigator.share({ title: options.title, text: options.text });
    return 'shared';
  } catch (e) {
    return e instanceof Error && e.name === 'AbortError'
      ? 'cancelled'
      : 'failed';
  }
}

/** 下載圖片檔（手機上多數瀏覽器會存進「檔案」或相簿） */
export function downloadFile(file: File): ShareOutcome {
  try {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}

/** 把 PNG 圖片寫進剪貼簿，可以直接貼到聊天室 */
export async function copyImage(blob: Blob): Promise<ShareOutcome> {
  if (!canCopyImage()) return 'failed';
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type || 'image/png']: blob }),
    ]);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export async function copyText(text: string): Promise<ShareOutcome> {
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
