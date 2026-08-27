'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Award, BarChart2, Trophy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HERO_CARDS = [
  { value: 6, rotate: -14, y: 22 },
  { value: 4, rotate: -5, y: 8 },
  { value: 3, rotate: 5, y: 8 },
  { value: 2, rotate: 14, y: 22 },
];

type HeroSectionProps = {
  onOpenLeaderboardModal: () => void;
  onOpenStatsModal: () => void;
  onOpenAchievementModal: () => void;
};

const HeroSection = ({
  onOpenLeaderboardModal,
  onOpenStatsModal,
  onOpenAchievementModal,
}: HeroSectionProps) => {
  const reduceMotion = useReducedMotion();

  return (
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
            onClick={onOpenLeaderboardModal}
          >
            排行榜
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="hidden font-bold text-muted-foreground hover:text-foreground md:inline-flex"
            onClick={onOpenStatsModal}
          >
            統計
          </Button>
          {/* 暫時註解 */}
          {/* <Button
            variant="ghost"
            size="sm"
            className="hidden font-bold text-muted-foreground hover:text-foreground md:inline-flex"
            onClick={onOpenAchievementModal}
          >
            成就
          </Button> */}
          {/* 手機：純圖示 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 text-muted-foreground hover:text-foreground md:hidden"
            onClick={onOpenLeaderboardModal}
            aria-label="排行榜"
          >
            <Trophy className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 text-muted-foreground hover:text-foreground md:hidden"
            onClick={onOpenStatsModal}
            aria-label="統計"
          >
            <BarChart2 className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 text-muted-foreground hover:text-foreground md:hidden"
            onClick={onOpenAchievementModal}
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
          {HERO_CARDS.map(card => (
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
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
