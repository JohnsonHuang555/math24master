'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AchievementModal } from '@/components/modals/achievement-modal';
import { LeaderboardModal } from '@/components/modals/leaderboard-modal';
import { StatsModal } from '@/components/modals/stats-modal';
import { RuleModal } from '@/components/modals/rule-modal';
import { Button } from '@/components/ui/button';
import { fadeVariants } from '@/lib/animation-variants';
import { Trophy, BarChart2, Award, CalendarDays, Search } from 'lucide-react';

const date = new Date();

const Homepage = () => {
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);
  const [isOpenAchievementModal, setIsOpenAchievementModal] = useState(false);
  const [isOpenStatsModal, setIsOpenStatsModal] = useState(false);
  const [isOpenLeaderboardModal, setIsOpenLeaderboardModal] = useState(false);

  return (
    <>
      <RuleModal isOpen={isOpenRuleModal} onOpenChange={setIsOpenRuleModal} />
      <LeaderboardModal
        isOpen={isOpenLeaderboardModal}
        onClose={() => setIsOpenLeaderboardModal(false)}
      />
      <AchievementModal
        isOpen={isOpenAchievementModal}
        onClose={() => setIsOpenAchievementModal(false)}
      />
      <StatsModal
        isOpen={isOpenStatsModal}
        onClose={() => setIsOpenStatsModal(false)}
      />
      <section className="flex h-full w-full flex-col overflow-y-auto">
        {/* T1: Hero teal gradient */}
        <motion.div
          variants={fadeVariants}
          initial="hidden"
          animate="show"
          className="w-full bg-gradient-to-b from-teal-700 to-teal-500 px-4 pb-10 pt-5"
        >
          <div className="mx-auto max-w-lg">
            {/* T2: Top bar — logo left, tools right (white style) */}
            <div className="mb-8 flex items-center justify-between">
              <span className="text-xl font-black tracking-tight text-white">
                24點大師
              </span>
              <div className="flex items-center gap-0.5">
                {/* Desktop: text buttons */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden text-white/90 hover:bg-white/20 hover:text-white md:inline-flex"
                  onClick={() => setIsOpenLeaderboardModal(true)}
                >
                  排行榜
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden text-white/90 hover:bg-white/20 hover:text-white md:inline-flex"
                  onClick={() => setIsOpenStatsModal(true)}
                >
                  統計
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden text-white/90 hover:bg-white/20 hover:text-white md:inline-flex"
                  onClick={() => setIsOpenAchievementModal(true)}
                >
                  成就
                </Button>
                {/* Mobile: icon-only, 44px touch targets */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 text-white/90 hover:bg-white/20 hover:text-white md:hidden"
                  onClick={() => setIsOpenLeaderboardModal(true)}
                  aria-label="排行榜"
                >
                  <Trophy className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 text-white/90 hover:bg-white/20 hover:text-white md:hidden"
                  onClick={() => setIsOpenStatsModal(true)}
                  aria-label="統計"
                >
                  <BarChart2 className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 text-white/90 hover:bg-white/20 hover:text-white md:hidden"
                  onClick={() => setIsOpenAchievementModal(true)}
                  aria-label="成就"
                >
                  <Award className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Hero content */}
            <div className="text-center">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/60">
                主遊戲
              </div>
              <h1 className="mb-2 text-4xl font-black tracking-tight text-white">
                開始遊戲
              </h1>
              {/* T4: Short tagline */}
              <p className="mb-8 text-sm text-white/80">
                4 張牌算出 24，成為數學達人
              </p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                <Button
                  className="bg-white px-12 py-6 text-lg font-bold text-teal-700 hover:bg-white/90"
                  onClick={() => (window.location.href = '/single-play')}
                >
                  立即開始 →
                </Button>
              </motion.div>
              {/* T7: Rules link inside hero card */}
              <button
                className="mt-4 text-xs text-white/60 underline underline-offset-2 transition-colors hover:text-white/80"
                onClick={() => setIsOpenRuleModal(true)}
              >
                觀看遊戲規則
              </button>
            </div>
          </div>
        </motion.div>

        {/* T3: Announcement band between Hero and cards */}
        <motion.div
          variants={fadeVariants}
          initial="hidden"
          animate={{ opacity: 1, scale: 1, transition: { delay: 0.3 } }}
          className="w-full border-b border-amber-100 bg-amber-50 px-4 py-2 text-center text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400"
        >
          <span className="font-medium">多人連線功能維護中</span>
          {' · '}
          <span className="font-medium text-green-600 dark:text-green-400">
            排行榜已上線！
          </span>
        </motion.div>

        {/* T5 + T6: Game mode cards */}
        <motion.div
          variants={fadeVariants}
          initial="hidden"
          animate={{ opacity: 1, scale: 1, transition: { delay: 0.5 } }}
          className="mx-auto w-full max-w-lg flex-1 px-4 py-5"
        >
          <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            更多遊戲模式
          </div>
          <div className="flex flex-col gap-3">
            {/* T5: 每日挑戰 card */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <button
                className="flex w-full items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4 text-left transition-colors hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-900/20 dark:hover:bg-teal-900/30"
                onClick={() => (window.location.href = '/daily-challenge')}
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-teal-500 text-white">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-teal-700 dark:text-teal-300">
                    每日挑戰
                  </div>
                  <div className="mt-0.5 text-xs text-teal-600/70 dark:text-teal-400/70">
                    每天一題，全球同步關卡
                  </div>
                </div>
                <div className="text-lg text-teal-400">›</div>
              </button>
            </motion.div>

            {/* T6: 猜數字 card with 推理小遊戲 badge */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <button
                className="flex w-full items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:hover:bg-amber-900/30"
                onClick={() => (window.location.href = '/guess-number')}
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-400 text-white">
                  <Search className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="mb-1 inline-block rounded-full bg-amber-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-800/40 dark:text-amber-300">
                    推理小遊戲
                  </span>
                  <div className="font-bold text-amber-700 dark:text-amber-300">
                    猜數字
                  </div>
                  <div className="mt-0.5 text-xs text-amber-600/70 dark:text-amber-400/70">
                    用線索卡推理藏匿的兩位數
                  </div>
                </div>
                <div className="text-lg text-amber-400">›</div>
              </button>
            </motion.div>
          </div>
        </motion.div>

        {/* Footer */}
        <footer className="w-full px-4 pb-5 pt-2">
          {/* <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <span>此網站在電腦與平板支援度最佳</span>
            <span>v1.0.5</span>
            <Link
              href="https://github.com/JohnsonHuang555/24_points"
              target="_blank"
            >
              <Image
                src="/github.svg"
                alt="github"
                width={14}
                height={14}
                priority
              />
            </Link>
          </div> */}
          <div className="mt-1 flex items-center justify-center gap-1 text-xs text-gray-500">
            <span>#24點大師, Created by Johnson Huang</span>
            <span>v1.2.1</span>
            <Image
              src="/smile-circle.svg"
              alt="smile-circle"
              width={12}
              height={12}
              priority
            />
            <span>{date.getFullYear()}</span>
          </div>
        </footer>
      </section>
    </>
  );
};

export default Homepage;
