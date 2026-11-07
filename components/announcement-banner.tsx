'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LayoutGrid, LucideIcon, Shapes, Superscript, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

type Announcement = {
  key: string;
  /** messages 的 Announcement.<id>.title / description */
  id: 'tabletop' | 'match' | 'quickMathAdvanced';
  icon: LucideIcon;
  badge?: string;
  href: string;
};

// 每次上線新玩法就往這裡加一則；key 帶版本號，換掉 key 可以讓已關閉過舊公告的人重新看到新公告
const ANNOUNCEMENTS: Announcement[] = [
  {
    key: 'announcement-tabletop-mode-v1',
    id: 'tabletop',
    icon: Shapes,
    href: '/single-play',
  },
  {
    key: 'announcement-match-mode-v1',
    id: 'match',
    icon: LayoutGrid,
    badge: 'Beta',
    href: '/single-play',
  },
  {
    key: 'announcement-quick-math-advanced-v1',
    id: 'quickMathAdvanced',
    icon: Superscript,
    badge: 'Beta',
    href: '/quick-math',
  },
];

function AnnouncementRow({
  announcement,
  onDismiss,
}: {
  announcement: Announcement;
  onDismiss: (key: string) => void;
}) {
  const t = useTranslations('Announcement');
  const { key, id, icon: Icon, badge, href } = announcement;

  // 單行公告列：標題過長以省略號截斷，桌機再顯示說明
  return (
    <div className="flex items-center gap-2.5 border-b border-line bg-surface py-1 pr-1 pl-4 md:pl-10">
      {badge ? (
        <span className="shrink-0 rounded-[5px] bg-amber px-1.5 py-[3px] text-[10px] font-extrabold tracking-[0.06em] text-on-amber uppercase">
          {badge}
        </span>
      ) : (
        <Icon aria-hidden className="h-4 w-4 shrink-0 text-primary-ink" />
      )}
      <Link
        href={href}
        className="min-w-0 flex-1 truncate py-2 text-[13px] font-semibold text-ink"
      >
        {t(`${id}.title`)}
        <span className="hidden font-normal text-ink-2 md:inline">
          {' '}
          {t(`${id}.description`)}
        </span>
        <span className="font-bold text-primary-ink"> {t('tryNow')}</span>
      </Link>
      <button
        type="button"
        onClick={() => onDismiss(key)}
        aria-label={t('dismiss')}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
      >
        <X className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}

const AnnouncementBanner = () => {
  // null = 尚未讀完 localStorage（避免 SSR/CSR 閃爍）
  const [dismissedKeys, setDismissedKeys] = useState<string[] | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setDismissedKeys(
      ANNOUNCEMENTS.filter(a => localStorage.getItem(a.key) === 'true').map(
        a => a.key,
      ),
    );
  }, []);

  const handleDismiss = (key: string) => {
    localStorage.setItem(key, 'true');
    setDismissedKeys(prev => [...(prev ?? []), key]);
  };

  if (dismissedKeys === null) return null;

  const visible = ANNOUNCEMENTS.filter(a => !dismissedKeys.includes(a.key));
  if (visible.length === 0) return null;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className="sticky top-0 z-30 flex flex-col"
    >
      <AnimatePresence initial={false}>
        {visible.map(announcement => (
          <motion.div
            key={announcement.key}
            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="overflow-hidden"
          >
            <AnnouncementRow
              announcement={announcement}
              onDismiss={handleDismiss}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

export default AnnouncementBanner;
