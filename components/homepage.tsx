'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { AchievementModal } from '@/components/modals/achievement-modal';
import { LeaderboardModal } from '@/components/modals/leaderboard-modal';
import { StatsModal } from '@/components/modals/stats-modal';
import { RuleModal } from '@/components/modals/rule-modal';
import { Button } from '@/components/ui/button';
import { Trophy, BarChart2, Award, CalendarDays, Search } from 'lucide-react';

const date = new Date();

// Hero 展示牌：6 × 4 × (3 − 2) = 24，對應遊戲內真實牌面樣式的迷你版
const HERO_CARDS = [
  { value: 6, rotate: -8, y: 10 },
  { value: 4, rotate: -3, y: 0 },
  { value: 3, rotate: 3, y: 0 },
  { value: 2, rotate: 8, y: 10 },
];

const Homepage = () => {
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);
  const [isOpenAchievementModal, setIsOpenAchievementModal] = useState(false);
  const [isOpenStatsModal, setIsOpenStatsModal] = useState(false);
  const [isOpenLeaderboardModal, setIsOpenLeaderboardModal] = useState(false);
  const reduceMotion = useReducedMotion();

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
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 md:px-8">
          {/* 頂部導覽列 */}
          <header className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground shadow-[0_3px_0_0_hsl(175_84%_22%)]">
                24
              </div>
              <span className="text-lg font-black tracking-tight text-foreground">
                24點大師
              </span>
            </div>
            <nav className="flex items-center gap-0.5">
              {/* 桌面：文字按鈕 */}
              <Button
                variant="ghost"
                size="sm"
                className="hidden font-bold text-muted-foreground hover:text-foreground md:inline-flex"
                onClick={() => setIsOpenLeaderboardModal(true)}
              >
                排行榜
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hidden font-bold text-muted-foreground hover:text-foreground md:inline-flex"
                onClick={() => setIsOpenStatsModal(true)}
              >
                統計
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hidden font-bold text-muted-foreground hover:text-foreground md:inline-flex"
                onClick={() => setIsOpenAchievementModal(true)}
              >
                成就
              </Button>
              {/* 行動裝置：純圖示，44px 觸控目標 */}
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-muted-foreground hover:text-foreground md:hidden"
                onClick={() => setIsOpenLeaderboardModal(true)}
                aria-label="排行榜"
              >
                <Trophy className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-muted-foreground hover:text-foreground md:hidden"
                onClick={() => setIsOpenStatsModal(true)}
                aria-label="統計"
              >
                <BarChart2 className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-muted-foreground hover:text-foreground md:hidden"
                onClick={() => setIsOpenAchievementModal(true)}
                aria-label="成就"
              >
                <Award className="h-5 w-5" />
              </Button>
            </nav>
          </header>

          {/* Hero：左文案右牌面，行動裝置改為上下堆疊 */}
          <div className="grid items-center gap-8 pb-10 pt-6 md:grid-cols-2 md:gap-6 md:pb-14 md:pt-12">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="order-2 text-center md:order-1 md:text-left"
            >
              <h1 className="text-4xl font-black leading-tight tracking-tight text-foreground md:text-5xl">
                用 4 張牌
                <br />
                算出 <span className="font-display text-primary">24</span>
              </h1>
              <p className="mx-auto mt-3 max-w-[22rem] text-base text-muted-foreground md:mx-0">
                加減乘除自由組合，算式越刁鑽，分數越高。
              </p>
              <div className="mt-7 flex flex-col items-center gap-3 md:flex-row md:items-center">
                <motion.div
                  whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                >
                  <Button
                    variant="tactile"
                    className="h-14 px-10 text-lg"
                    onClick={() => (window.location.href = '/single-play')}
                  >
                    立即開始
                  </Button>
                </motion.div>
                <button
                  className="px-2 py-2 text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                  onClick={() => setIsOpenRuleModal(true)}
                >
                  觀看遊戲規則
                </button>
              </div>
            </motion.div>

            {/* 真實牌面迷你版：扇形展開 + 算式 */}
            <div className="order-1 flex flex-col items-center gap-5 md:order-2">
              <div className="flex items-end justify-center" aria-hidden>
                {HERO_CARDS.map((card, i) => (
                  <motion.div
                    key={card.value}
                    initial={
                      reduceMotion
                        ? false
                        : { opacity: 0, y: 32, rotate: card.rotate - 6 }
                    }
                    animate={{ opacity: 1, y: card.y, rotate: card.rotate }}
                    whileHover={
                      reduceMotion ? undefined : { y: card.y - 12, scale: 1.06 }
                    }
                    transition={{
                      type: 'spring',
                      stiffness: 220,
                      damping: 18,
                      delay: reduceMotion ? 0 : 0.15 + i * 0.08,
                    }}
                    className="-mx-1.5 flex aspect-[5/7] w-[72px] items-center justify-center rounded-2xl border-2 border-zinc-200 bg-white font-display text-4xl font-bold text-zinc-800 shadow-[0_6px_0_0_rgba(0,0,0,0.08)] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 md:w-[92px] md:text-5xl"
                  >
                    {card.value}
                  </motion.div>
                ))}
              </div>
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduceMotion ? 0 : 0.55, duration: 0.4 }}
                className="rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 font-display text-sm font-semibold text-primary md:text-base"
              >
                6 × 4 × (3 − 2) = 24
              </motion.div>
            </div>
          </div>

          {/* 更多遊戲模式 */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: reduceMotion ? 0 : 0.3,
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="pb-8"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-black text-foreground">
                更多遊戲模式
              </h2>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <span className="font-medium">多人連線功能維護中</span>
                {' · '}
                <span className="font-medium">排行榜已上線！</span>
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 md:gap-4">
              {/* 每日挑戰 */}
              <motion.button
                whileHover={reduceMotion ? undefined : { y: -3 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                className="flex w-full items-center gap-4 rounded-2xl border-2 border-teal-200 bg-teal-50 p-4 text-left shadow-[0_4px_0_0_theme(colors.teal.200)] transition-colors hover:bg-teal-100/70 active:translate-y-1 active:shadow-none dark:border-teal-800 dark:bg-teal-900/20 dark:shadow-[0_4px_0_0_theme(colors.teal.800)] dark:hover:bg-teal-900/30 md:p-5"
                onClick={() => (window.location.href = '/daily-challenge')}
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-base font-bold text-teal-800 dark:text-teal-300">
                    每日挑戰
                  </div>
                  <div className="mt-0.5 text-xs text-teal-700/70 dark:text-teal-400/70">
                    每天一題，全球同步關卡
                  </div>
                </div>
                <div className="text-xl text-teal-400">›</div>
              </motion.button>

              {/* 猜數字 */}
              <motion.button
                whileHover={reduceMotion ? undefined : { y: -3 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                className="flex w-full items-center gap-4 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-left shadow-[0_4px_0_0_theme(colors.amber.200)] transition-colors hover:bg-amber-100/70 active:translate-y-1 active:shadow-none dark:border-amber-800 dark:bg-amber-900/20 dark:shadow-[0_4px_0_0_theme(colors.amber.800)] dark:hover:bg-amber-900/30 md:p-5"
                onClick={() => (window.location.href = '/guess-number')}
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-white">
                  <Search className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-amber-800 dark:text-amber-300">
                      猜數字
                    </span>
                    <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-800/40 dark:text-amber-300">
                      推理小遊戲
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-amber-700/70 dark:text-amber-400/70">
                    用線索卡推理藏匿的兩位數
                  </div>
                </div>
                <div className="text-xl text-amber-400">›</div>
              </motion.button>
            </div>
          </motion.div>

          {/* Footer */}
          <footer className="mt-auto w-full pb-5 pt-2">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <span>#24點大師, Created by Johnson Huang</span>
              <span>v1.3.2</span>
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
        </div>
      </section>
    </>
  );
};

export default Homepage;
