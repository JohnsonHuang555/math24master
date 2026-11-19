'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  CircleAlert,
  CircleCheck,
  Copy,
  Download,
  ImageIcon,
  Link2,
  Share,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  type AnalyticsGameMode,
  type ShareMethod,
  trackShare,
} from '@/lib/analytics';
import {
  type ShareOutcome,
  canCopyImage,
  canShareFiles,
  copyImage,
  copyText,
  downloadFile,
  shareImageFile,
} from '@/lib/share';
import { cn } from '@/lib/utils';

type ShareCardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: AnalyticsGameMode;
  file: File | null;
  /** 系統分享與「複製文字」用的文字 */
  shareText: string;
  /** 「複製連結」的網址（帶 utm） */
  shareUrl: string;
  /** 系統分享選單的標題 */
  shareTitle: string;
};

type Status = { tone: 'success' | 'error'; message: string } | null;

/**
 * 分享成績的預覽：手機是底部抽屜（大按鈕「分享圖片」＋三個圖示動作），
 * 桌機是左圖右操作的 dialog（下載、複製圖片、複製文字、複製連結）。
 * 哪些動作出現看瀏覽器能力：能交給系統分享選單才有「分享圖片」，能寫剪貼簿圖片才有「複製圖片」
 */
export function ShareCardDialog({
  open,
  onOpenChange,
  mode,
  file,
  shareText,
  shareUrl,
  shareTitle,
}: ShareCardDialogProps) {
  const t = useTranslations('Share');
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  // 瀏覽器能力只在 client 判斷，打開時才讀
  const [abilities, setAbilities] = useState({
    share: false,
    copyImage: false,
  });

  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  useEffect(() => {
    if (!open || !file) return;
    setAbilities({ share: canShareFiles(file), copyImage: canCopyImage() }); // eslint-disable-line react-hooks/set-state-in-effect
    setStatus(null);
  }, [open, file]);

  const run = async (
    method: ShareMethod,
    action: () => Promise<ShareOutcome> | ShareOutcome,
    successMessage?: string,
  ) => {
    if (busy) return;
    setBusy(true);
    try {
      const outcome = await action();
      trackShare(mode, outcome, method);
      if (outcome === 'failed') {
        setStatus({ tone: 'error', message: t('status.failed') });
      } else if (outcome !== 'cancelled' && successMessage) {
        setStatus({ tone: 'success', message: successMessage });
      } else {
        setStatus(null);
      }
    } finally {
      setBusy(false);
    }
  };

  const download = () =>
    file && run('download', () => downloadFile(file), t('status.downloaded'));

  const primary = abilities.share ? (
    <Button
      variant="tactile"
      className="w-full gap-2"
      disabled={!file || busy}
      onClick={() =>
        file &&
        run('system', () =>
          shareImageFile(file, { title: shareTitle, text: shareText }),
        )
      }
    >
      <Share aria-hidden className="h-5 w-5" />
      {t('shareImage')}
    </Button>
  ) : (
    <Button
      variant="tactile"
      className="w-full gap-2"
      disabled={!file || busy}
      onClick={download}
    >
      <Download aria-hidden className="h-5 w-5" />
      {t('download')}
    </Button>
  );

  const actions: {
    key: string;
    icon: ReactNode;
    label: string;
    onClick: () => void;
  }[] = [];
  if (abilities.share) {
    actions.push({
      key: 'save',
      icon: <Download aria-hidden />,
      label: t('save'),
      onClick: () => void download(),
    });
  } else if (abilities.copyImage) {
    actions.push({
      key: 'copy-image',
      icon: <ImageIcon aria-hidden />,
      label: t('copyImage'),
      onClick: () =>
        void (
          file &&
          run('copy_image', () => copyImage(file), t('status.imageCopied'))
        ),
    });
  }
  actions.push(
    {
      key: 'copy-text',
      icon: <Copy aria-hidden />,
      label: t('copyText'),
      onClick: () =>
        void run(
          'copy_text',
          () => copyText(shareText),
          t('status.textCopied'),
        ),
    },
    {
      key: 'copy-link',
      icon: <Link2 aria-hidden />,
      label: t('copyLink'),
      onClick: () =>
        void run('copy_link', () => copyText(shareUrl), t('status.linkCopied')),
    },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        sheet
        data-testid="share-card-dialog"
        className="flex flex-col max-sm:pt-7 lg:grid lg:max-w-[820px] lg:grid-cols-[432px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-8 lg:gap-y-6 lg:p-7"
      >
        <div className="flex flex-col gap-1 pr-10 lg:col-start-2 lg:row-start-1">
          <DialogTitle className="text-xl font-extrabold text-ink lg:text-2xl">
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-sm text-ink-2 max-lg:sr-only">
            {t('format')}
          </DialogDescription>
        </div>

        <div className="mx-auto aspect-[4/5] w-[min(100%,324px,calc((88dvh-290px)*0.8))] shrink-0 overflow-hidden rounded-[14px] shadow-[0_10px_30px_rgba(16,36,33,0.18)] lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:w-[432px]">
          {previewUrl && (
            // blob URL 預覽，不經過 next/image 最佳化
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={t('previewAlt')}
              data-testid="share-card-preview"
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="flex flex-col gap-3.5 lg:col-start-2 lg:row-start-2 lg:gap-3">
          {primary}
          <div className="flex justify-around lg:flex-col lg:gap-3">
            {actions.map(action => (
              <button
                key={action.key}
                type="button"
                disabled={!file || busy}
                onClick={action.onClick}
                className={cn(
                  'flex min-w-16 flex-col items-center gap-1.5 text-[13px] font-bold text-ink disabled:opacity-50',
                  'lg:h-14 lg:w-full lg:flex-row lg:justify-center lg:gap-2 lg:rounded-[14px] lg:border-2 lg:border-line-strong lg:bg-surface lg:text-base lg:shadow-[0_4px_0_0_var(--line-strong)] lg:transition-transform lg:active:translate-y-1 lg:active:shadow-none',
                  'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
                )}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-sunken lg:h-auto lg:w-auto lg:border-0 lg:bg-transparent [&_svg]:h-5 [&_svg]:w-5">
                  {action.icon}
                </span>
                {action.label}
              </button>
            ))}
          </div>
          <div
            role="status"
            aria-live="polite"
            className={cn(
              // 沒有訊息時只留給螢幕閱讀器的 live region，不佔版面
              status
                ? 'flex min-h-11 items-center gap-2.5 rounded-[14px] px-3.5 text-sm font-bold lg:mt-auto'
                : 'sr-only',
              status?.tone === 'success' && 'bg-primary-tint text-primary-ink',
              status?.tone === 'error' && 'bg-danger-tint text-danger-ink',
            )}
          >
            {status?.tone === 'success' && (
              <CircleCheck aria-hidden className="h-[18px] w-[18px] shrink-0" />
            )}
            {status?.tone === 'error' && (
              <CircleAlert aria-hidden className="h-[18px] w-[18px] shrink-0" />
            )}
            {status?.message}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
