'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X, Zap } from 'lucide-react';

const BANNER_KEY = 'announcement-quick-math-v1';

const AnnouncementBanner = () => {
  const [isDismissed, setIsDismissed] = useState(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setIsDismissed(localStorage.getItem(BANNER_KEY) === 'true');
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(BANNER_KEY, 'true');
    setIsDismissed(true);
  };

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -40 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="sticky top-0 z-30 flex items-center gap-3 bg-primary px-4 py-2.5 md:px-10"
        >
          {/* Icon */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <Zap className="h-4 w-4 text-white" />
          </div>

          {/* Text */}
          <div className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-bold text-white">
              新模式「心算快答」上線！
            </span>
            <span className="hidden text-sm text-white/75 sm:inline">
              10 題限時心算連續快答・答錯罰時、比拚總秒數・全球排行榜榜競速
            </span>
            <Link
              href="/quick-math"
              className="text-sm font-bold text-white/90 underline underline-offset-2 transition-colors hover:text-white"
            >
              立即體驗 →
            </Link>
          </div>

          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            aria-label="關閉公告"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-white/70 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnnouncementBanner;
