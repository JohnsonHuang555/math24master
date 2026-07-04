'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Award,
  BarChart2,
  CalendarDays,
  ChevronRight,
  Search,
  Trophy,
  Users,
} from 'lucide-react';
import AnnouncementBanner from '@/components/announcement-banner';
import { AchievementModal } from '@/components/modals/achievement-modal';
import { LeaderboardModal } from '@/components/modals/leaderboard-modal';
import { RuleModal } from '@/components/modals/rule-modal';
import { StatsModal } from '@/components/modals/stats-modal';
import { Button } from '@/components/ui/button';

const HERO_CARDS = [
  { value: 6, rotate: -14, y: 22 },
  { value: 4, rotate: -5, y: 8 },
  { value: 3, rotate: 5, y: 8 },
  { value: 2, rotate: 14, y: 22 },
];

const STEPS = [
  {
    num: '1',
    title: '抽牌',
    desc: '每局抽 4 張手牌，1 ~ 13 的隨機數字',
    numBg: 'bg-teal-500',
    cardStyle:
      'bg-teal-50 border-teal-200 dark:bg-teal-900/20 dark:border-teal-800',
  },
  {
    num: '2',
    title: '湊 24',
    desc: '用加減乘除，讓算式結果等於 24',
    numBg: 'bg-primary',
    cardStyle: 'bg-primary/5 border-primary/20',
  },
  {
    num: '3',
    title: '得分',
    desc: '符號越困難，得分越高',
    numBg: 'bg-amber-500',
    cardStyle:
      'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
  },
];

const Homepage = () => {
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);
  const [isOpenAchievementModal, setIsOpenAchievementModal] = useState(false);
  const [isOpenStatsModal, setIsOpenStatsModal] = useState(false);
  const [isOpenLeaderboardModal, setIsOpenLeaderboardModal] = useState(false);
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);

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

      <div
        ref={scrollRef}
        className="flex h-full w-full flex-col overflow-y-auto"
      >
        <AnnouncementBanner />

        {/* ════════════════════════════════
            HERO
        ════════════════════════════════ */}
        <section className="relative flex min-h-[100dvh] flex-col">
          {/* teal 底部光暈 */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 [background-image:radial-gradient(60rem_40rem_at_50%_130%,rgba(13,148,136,0.13),transparent_70%)]"
          />

          {/* 導覽列 */}
          <header className="relative z-10 flex h-16 shrink-0 items-center justify-between px-4 md:px-10">
            <Image
              src="/logo.webp"
              alt="24點大師"
              width={100}
              height={30}
              className="h-7 w-auto"
              priority
            />
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
              {/* 手機：純圖示 */}
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

          {/* Hero 中心內容 */}
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-16 pt-4 text-center md:gap-8 md:pb-24">
            {/* 牌面扇形 */}
            <div className="flex items-end justify-center" aria-hidden>
              {HERO_CARDS.map((card, i) => (
                <motion.div
                  key={card.value}
                  initial={
                    reduceMotion
                      ? false
                      : { opacity: 0, y: 60, rotate: card.rotate - 8 }
                  }
                  animate={{ opacity: 1, y: card.y, rotate: card.rotate }}
                  whileHover={
                    reduceMotion ? undefined : { y: card.y - 18, scale: 1.08 }
                  }
                  transition={{
                    type: 'spring',
                    stiffness: 190,
                    damping: 16,
                    // delay: reduceMotion ? 0 : 0.08 + i * 0.1,
                  }}
                  className="-mx-2 flex aspect-[5/7] w-[88px] items-center justify-center rounded-2xl border-2 border-zinc-200 bg-white font-display text-5xl font-bold text-zinc-800 shadow-[0_8px_0_0_rgba(0,0,0,0.10)] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 md:-mx-3 md:w-[120px] md:rounded-3xl md:text-6xl lg:w-[130px] lg:text-6xl"
                >
                  {card.value}
                </motion.div>
              ))}
            </div>

            {/* 算式膠囊 */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: reduceMotion ? 0 : 0.5,
                duration: 0.45,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="rounded-full border border-primary/25 bg-white/80 px-5 py-2 font-display text-sm font-semibold text-primary shadow-sm backdrop-blur-sm dark:bg-zinc-900/80 md:text-base"
            >
              6 × 4 × (3 - 2) = 24
            </motion.div>

            {/* 標題 + 副文案 */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: reduceMotion ? 0 : 0.32,
                duration: 0.55,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="space-y-3"
            >
              <h1 className="font-display text-3xl font-black leading-none tracking-tight text-foreground md:text-6xl lg:text-6xl">
                你能用 4 張牌
                <br />
                算出 <span className="text-primary">24</span> 嗎？
              </h1>
              <p className="mx-auto max-w-[24rem] text-base text-muted-foreground md:text-lg">
                利用 4 張數字牌，透過加、減、乘、除與括號，組合出等於 24 的算式
              </p>
            </motion.div>

            {/* CTA 按鈕組 */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: reduceMotion ? 0 : 0.52,
                duration: 0.45,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex flex-wrap items-center justify-center gap-3">
                <motion.div
                  whileHover={reduceMotion ? undefined : { scale: 1.04 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                >
                  <Button
                    variant="tactile"
                    className="h-14 px-12 text-xl"
                    onClick={() => (window.location.href = '/single-play')}
                  >
                    立即開始
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={reduceMotion ? undefined : { scale: 1.04 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                >
                  <Button
                    variant="tactileOutline"
                    className="h-14 gap-2 px-8 text-xl"
                    onClick={() => (window.location.href = '/multiple-play')}
                  >
                    <Users className="h-5 w-5" />
                    多人對戰
                  </Button>
                </motion.div>
              </div>
              {/* <button
                className="px-2 py-1.5 text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                onClick={() => setIsOpenRuleModal(true)}
              >
                觀看遊戲規則
              </button> */}
            </motion.div>
          </div>
        </section>

        {/* ════════════════════════════════
            三步驟玩法說明
        ════════════════════════════════ */}
        <section className="bg-white/50 px-4 py-14 backdrop-blur-sm dark:bg-zinc-900/30 md:px-10 md:py-20">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-10 text-center text-2xl font-black tracking-tight text-foreground md:text-3xl">
              簡單遊玩三步驟
            </h2>
            <div className="grid gap-4 md:grid-cols-3 md:gap-6">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ root: scrollRef, once: true, amount: 0.3 }}
                  transition={{
                    duration: 0.5,
                    delay: i * 0.09,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={`flex flex-col gap-4 rounded-2xl border-2 p-6 ${step.cardStyle}`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${step.numBg} font-display text-base font-black text-white`}
                  >
                    {step.num}
                  </div>
                  <div>
                    <div className="text-lg font-black text-foreground">
                      {step.title}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {step.desc}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════
            更多遊戲模式
        ════════════════════════════════ */}
        <section className="px-4 py-14 md:px-10 md:py-20">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-6 text-2xl font-black tracking-tight text-foreground md:text-3xl">
              更多遊戲模式
            </h2>
            <div className="grid gap-4 md:gap-6">
              {/* 多人連線 — 全寬 */}
              <motion.button
                initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ root: scrollRef, once: true, amount: 0.3 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                whileHover={reduceMotion ? undefined : { y: -4 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                className="flex w-full items-center gap-4 rounded-2xl border-2 border-primary/25 bg-primary/5 p-5 text-left shadow-[0_6px_0_0_hsl(175_84%_72%/0.4)] transition-colors hover:bg-primary/10 active:translate-y-1 active:shadow-none dark:border-teal-700 dark:bg-teal-900/20 dark:shadow-[0_6px_0_0_theme(colors.teal.800)] dark:hover:bg-teal-900/30 md:p-6"
                onClick={() => (window.location.href = '/multiple-play')}
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
                  <Users className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-teal-800 dark:text-teal-300">
                      多人連線
                    </span>
                    <span className="rounded-full bg-primary px-2 py-0.5 font-display text-[10px] font-black text-white">
                      NEW
                    </span>
                  </div>
                  <div className="mt-0.5 text-sm text-teal-600 dark:text-teal-400/80">
                    即時房間對戰，全新搶答模式
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-primary/50" />
              </motion.button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 md:gap-6">
              {/* 每日挑戰 */}
              <motion.button
                initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ root: scrollRef, once: true, amount: 0.3 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                whileHover={reduceMotion ? undefined : { y: -4 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                className="flex w-full items-center gap-4 rounded-2xl border-2 border-teal-200 bg-teal-50 p-5 text-left shadow-[0_6px_0_0_theme(colors.teal.200)] transition-colors hover:bg-teal-100/70 active:translate-y-1 active:shadow-none dark:border-teal-800 dark:bg-teal-900/20 dark:shadow-[0_6px_0_0_theme(colors.teal.800)] dark:hover:bg-teal-900/30 md:p-6"
                onClick={() => (window.location.href = '/daily-challenge')}
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white">
                  <CalendarDays className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-black text-teal-800 dark:text-teal-300">
                    每日挑戰
                  </div>
                  <div className="mt-0.5 text-sm text-teal-600 dark:text-teal-400/80">
                    每天 3 題 · 全球競速
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-teal-400" />
              </motion.button>

              {/* 猜數字 */}
              <motion.button
                initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ root: scrollRef, once: true, amount: 0.3 }}
                transition={{
                  duration: 0.5,
                  delay: 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
                whileHover={reduceMotion ? undefined : { y: -4 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                className="flex w-full items-center gap-4 rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 text-left shadow-[0_6px_0_0_theme(colors.amber.200)] transition-colors hover:bg-amber-100/70 active:translate-y-1 active:shadow-none dark:border-amber-800 dark:bg-amber-900/20 dark:shadow-[0_6px_0_0_theme(colors.amber.800)] dark:hover:bg-amber-900/30 md:p-6"
                onClick={() => (window.location.href = '/guess-number')}
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-white">
                  <Search className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-amber-800 dark:text-amber-300">
                      猜數字
                    </span>
                    <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-800/40 dark:text-amber-300">
                      推理小遊戲
                    </span>
                  </div>
                  <div className="mt-0.5 text-sm text-amber-600 dark:text-amber-400/80">
                    用線索卡推理謎底數字
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-amber-400" />
              </motion.button>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════
            Footer
        ════════════════════════════════ */}
        <footer className="px-4 pb-8 pt-2 text-center">
          <p className="text-xs text-muted-foreground">
            #24點大師, Created by Johnson Huang 2026
          </p>
        </footer>
      </div>
    </>
  );
};

export default Homepage;
