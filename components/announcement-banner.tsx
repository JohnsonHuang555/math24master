'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LayoutGrid, LucideIcon, Superscript, X } from 'lucide-react';

type Announcement = {
  key: string;
  icon: LucideIcon;
  title: string;
  badge?: string;
  description?: string;
  href: string;
  linkLabel: string;
};

// 每次上線新玩法就往這裡加一則；key 帶版本號，換掉 key 可以讓已關閉過舊公告的人重新看到新公告
const ANNOUNCEMENTS: Announcement[] = [
  {
    key: 'announcement-match-mode-v1',
    icon: LayoutGrid,
    title: '新模式「消消樂模式」上線！',
    badge: 'Beta',
    description: '16 張牌自由配對消除・任選 2~4 張湊 24・全部清除才計分上榜',
    href: '/single-play',
    linkLabel: '立即體驗 →',
  },
  {
    key: 'announcement-quick-math-advanced-v1',
    icon: Superscript,
    title: '心算快答「進階模式」上線！',
    badge: 'Beta',
    description: '混入平方、階乘、根號・更燒腦的心算挑戰',
    href: '/quick-math',
    linkLabel: '立即體驗 →',
  },
];

function AnnouncementRow({
  announcement,
  onDismiss,
}: {
  announcement: Announcement;
  onDismiss: (key: string) => void;
}) {
  const {
    key,
    icon: Icon,
    title,
    badge,
    description,
    href,
    linkLabel,
  } = announcement;

  return (
    <div className="flex items-center gap-3 bg-primary px-4 py-2.5 md:px-10">
      {/* Icon */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/20">
        <Icon className="h-4 w-4 text-white" />
      </div>

      {/* Text */}
      <div className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="text-sm font-bold text-white">{title}</span>
        {badge && (
          <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {badge}
          </span>
        )}
        {description && (
          <span className="hidden text-sm text-white/75 sm:inline">
            {description}
          </span>
        )}
        <Link
          href={href}
          className="text-sm font-bold text-white/90 underline underline-offset-2 transition-colors hover:text-white"
        >
          {linkLabel}
        </Link>
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(key)}
        aria-label="關閉公告"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-white/70 transition-colors hover:bg-white/20 hover:text-white"
      >
        <X className="h-4 w-4" />
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
      className="sticky top-0 z-30 flex flex-col divide-y divide-white/15"
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
