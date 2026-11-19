import { useCallback, useEffect, useRef, useState } from 'react';
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
 *
 * 快取以「這一局的 resultId＋語系」為鍵：同一局重開預覽直接沿用，
 * 另一局即使分數一樣也會重畫；圖卡上的日期由呼叫端取自這一局的結束時間，所以不會跨日錯用。
 * 圖卡產生失敗時仍打開預覽（imageFailed），讓玩家可以分享文字與連結；失敗不快取，下次再試
 */
export function useShareCard(options: {
  mode: AnalyticsGameMode;
  fileName: string;
  /** 這一局的唯一 id（useGameResult）；還沒結算時為 null */
  resultId: string | null;
  /** 分享連結要帶朋友去的頁面（不含語系前綴） */
  path: string;
  render: () => Promise<Blob | null>;
}) {
  const { mode, fileName, resultId, path, render } = options;
  const locale = useLocale();
  const cacheKey = resultId ? `${resultId}|${locale}` : null;

  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const cacheRef = useRef<{ key: string; file: File } | null>(null);
  const keyRef = useRef(cacheKey);
  const busyRef = useRef(false);

  // 換了一局（或語系）：收起上一局的預覽，丟掉它的圖
  useEffect(() => {
    keyRef.current = cacheKey;
    if (cacheRef.current && cacheRef.current.key !== cacheKey) {
      cacheRef.current = null;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
    setFile(null);
    setImageFailed(false);
  }, [cacheKey]);

  const start = useCallback(async () => {
    if (busyRef.current || !cacheKey) return;
    setShareUrl(
      shareLinkFor(
        window.location.origin,
        getPathname({ href: path, locale }),
        mode,
      ),
    );
    if (cacheRef.current?.key === cacheKey) {
      setFile(cacheRef.current.file);
      setImageFailed(false);
      setOpen(true);
      trackShareCardOpen(mode, true);
      return;
    }
    busyRef.current = true;
    setIsGenerating(true);
    try {
      const blob = await render().catch(() => null);
      // 產生期間換了一局，這張圖屬於上一局，丟掉
      if (keyRef.current !== cacheKey) return;
      if (!blob) {
        trackShare(mode, 'failed', 'render');
        setFile(null);
        setImageFailed(true);
        setOpen(true);
        trackShareCardOpen(mode, false);
        return;
      }
      const next = new File([blob], fileName, { type: 'image/png' });
      cacheRef.current = { key: cacheKey, file: next };
      setFile(next);
      setImageFailed(false);
      setOpen(true);
      trackShareCardOpen(mode, true);
    } finally {
      busyRef.current = false;
      setIsGenerating(false);
    }
  }, [cacheKey, fileName, locale, mode, path, render]);

  return {
    open,
    setOpen,
    file,
    imageFailed,
    isGenerating,
    start,
    shareUrl,
    /** 還沒結算（沒有 resultId）時不能分享 */
    ready: cacheKey !== null,
  };
}
