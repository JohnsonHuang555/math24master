/** 分享結果，可被各模式的結算畫面共用 */
export type ShareOutcome =
  | 'shared'
  | 'copied'
  | 'downloaded'
  | 'cancelled'
  | 'failed';

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

/**
 * 分享圖片檔（例如戰績圖卡）到系統分享選單；
 * 裝置不支援檔案分享時，改為直接下載圖片，讓使用者自行分享到社群 App。
 */
export async function shareImage(
  file: File,
  options?: { title?: string; text?: string },
): Promise<ShareOutcome> {
  const shareData = {
    title: options?.title,
    text: options?.text,
    files: [file],
  };

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare(shareData)
  ) {
    try {
      await navigator.share(shareData);
      return 'shared';
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        return 'cancelled';
      }
      // 其他錯誤（例如權限限制）改走下載 fallback
    }
  }

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
