'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AchievementModal } from '@/components/modals/achievement-modal';
import { StatsModal } from '@/components/modals/stats-modal';
import { RuleModal } from '@/components/modals/rule-modal';
import { Button } from '@/components/ui/button';
import { fadeVariants } from '@/lib/animation-variants';

const date = new Date();

const Homepage = () => {
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);
  const [isOpenAchievementModal, setIsOpenAchievementModal] = useState(false);
  const [isOpenStatsModal, setIsOpenStatsModal] = useState(false);

  return (
    <>
      <RuleModal isOpen={isOpenRuleModal} onOpenChange={setIsOpenRuleModal} />
      <AchievementModal
        isOpen={isOpenAchievementModal}
        onClose={() => setIsOpenAchievementModal(false)}
      />
      <StatsModal
        isOpen={isOpenStatsModal}
        onClose={() => setIsOpenStatsModal(false)}
      />
      <section className="relative flex h-full w-full flex-col items-center justify-center">
        <div className="absolute right-5 top-5 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpenStatsModal(true)}
          >
            統計
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpenAchievementModal(true)}
          >
            成就
          </Button>
        </div>
        <motion.div
          variants={fadeVariants}
          initial="hidden"
          animate="show"
          className="mb-[50px]"
        >
          <Image
            src="/logo.webp"
            alt="Logo"
            width={300}
            height={100}
            priority
          />
        </motion.div>
        <motion.h1
          variants={fadeVariants}
          initial="hidden"
          animate={{ opacity: 1, scale: 1, transition: { delay: 0.2 } }}
          className="mb-6 text-xl font-semibold"
        >
          運用你的智慧，成為24點大師
        </motion.h1>
        <motion.p
          variants={fadeVariants}
          initial="hidden"
          animate={{ opacity: 1, scale: 1, transition: { delay: 0.2 } }}
          className="mx-4 mb-8 max-w-[800px] text-center text-lg"
        >
          歡迎來到24點數學遊戲！這是一款充滿挑戰和樂趣的益智遊戲，考驗你的數學運算能力和策略思維
        </motion.p>
        <motion.div
          variants={fadeVariants}
          initial="hidden"
          animate={{
            opacity: 1,
            scale: 1,
            transition: { delay: 0.5 },
          }}
        >
          <Button
            className="mb-8"
            variant="secondary"
            onClick={() => setIsOpenRuleModal(true)}
          >
            <Image
              src="/document.svg"
              alt="24點規則"
              width={16}
              height={16}
              priority
              className="mr-2"
            />
            觀看遊戲規則
          </Button>
        </motion.div>
        {/* <motion.div
          variants={fadeVariants}
          initial="hidden"
          animate={{ opacity: 1, scale: 1, transition: { delay: 0.6 } }}
          className="mb-6 rounded-full bg-blue-100 px-4 py-1 text-xs font-medium text-blue-700"
        >
          🎉 多人連線新增拉密模式玩法 🎉
        </motion.div> */}
        <motion.div
          variants={fadeVariants}
          initial="hidden"
          animate={{
            opacity: 1,
            scale: 1,
            transition: { delay: 0.8 },
          }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 1 }}>
            <Button
              className="px-12 py-6 text-xl"
              onClick={() => (window.location.href = '/single-play')}
            >
              開始遊戲
            </Button>
          </motion.div>
          {/* TODO: 待開發 */}
          {/* <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 1 }}>
            <Button
              className="px-12 py-6 text-xl"
              onClick={() => (window.location.href = '/multiple-play')}
            >
              多人遊玩
            </Button>
          </motion.div> */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 1 }}>
            <Button
              variant="outline"
              className="px-8"
              onClick={() => (window.location.href = '/daily-challenge')}
            >
              每日挑戰
            </Button>
          </motion.div>
        </motion.div>
        <motion.div
          variants={fadeVariants}
          initial="hidden"
          animate={{
            opacity: 1,
            scale: 1,
            transition: { delay: 1.5 },
          }}
          className="mt-10 max-w-[500px] px-4 text-center"
        >
          <p className="text-xs leading-relaxed text-gray-400">
            <strong className="font-medium">24點遊戲介紹：</strong>
            使用4張牌，透過加、減、乘、除四則運算，計算出結果等於24，訓練數學和邏輯思維能力。
          </p>
        </motion.div>
      </section>
      <footer className="fixed bottom-4 left-1/2 w-full -translate-x-1/2">
        <div className="mb-1 flex items-center justify-center text-xs text-gray-500">
          <div>此網站在電腦與平板支援度最佳</div>
          <div className="mx-2 text-xs text-gray-500">beta v2.6.0</div>
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
        </div>
        <div className="flex justify-center gap-1 text-xs text-gray-500">
          <span>#24點大師, #24點, Created by Johnson Huang</span>
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
    </>
  );
};

export default Homepage;
