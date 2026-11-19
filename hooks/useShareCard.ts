import { useCallback, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { getPathname } from '@/i18n/navigation';
import {
  type AnalyticsGameMode,
  trackShare,
  trackShareCardOpen,
} from '@/lib/analytics';
import { shareLinkFor } from '@/lib/share-card/data';

/**
 * 結算畫面的「分享成績」：按下去產生圖卡（產生中狀態），完成後打開預覽。
 * 同一份成績只產生一次；成績變了（cacheKey 不同）才重畫
 */
export function useShareCard(options: {
  mode: AnalyticsGameMode;
  fileName: string;
  cacheKey: string;
  /** 分享連結要帶朋友去的頁面（不含語系前綴） */
  path: string;
  render: () => Promise<Blob | null>;
  /** 圖卡產生失敗時（例如瀏覽器不支援 canvas）的提示 */
  onError: () => void;
}) {
  const { mode, fileName, cacheKey, path, render, onError } = options;
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const cacheRef = useRef<{ key: string; file: File } | null>(null);
  const busyRef = useRef(false);

  const start = useCallback(async () => {
    if (busyRef.current) return;
    setShareUrl(
      shareLinkFor(
        window.location.origin,
        getPathname({ href: path, locale }),
        mode,
      ),
    );
    if (cacheRef.current?.key === cacheKey) {
      setFile(cacheRef.current.file);
      setOpen(true);
      trackShareCardOpen(mode);
      return;
    }
    busyRef.current = true;
    setIsGenerating(true);
    try {
      const blob = await render().catch(() => null);
      if (!blob) {
        trackShare(mode, 'failed', 'render');
        onError();
        return;
      }
      const next = new File([blob], fileName, { type: 'image/png' });
      cacheRef.current = { key: cacheKey, file: next };
      setFile(next);
      setOpen(true);
      trackShareCardOpen(mode);
    } finally {
      busyRef.current = false;
      setIsGenerating(false);
    }
  }, [cacheKey, fileName, locale, mode, onError, path, render]);

  return { open, setOpen, file, isGenerating, start, shareUrl };
}
