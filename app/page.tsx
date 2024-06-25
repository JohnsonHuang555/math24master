'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import MainLayout from '@/components/layouts/main-layout';
import { PlayerNameModal } from '@/components/modals/player-name-modal';
import { RuleModal } from '@/components/modals/rule-modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fadeVariants } from '@/lib/animation-variants';

const date = new Date();

export default function Home() {
  const [hasPlayerName, setHasPlayerName] = useState(false);
  const [isOpenNameModal, setIsOpenNameModal] = useState(false);
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);

  const intro =
    '歡迎來到24點數學遊戲！這是一款充滿挑戰和樂趣的益智遊戲，考驗你的數學運算能力和策略思維'.split(
      '',
    );

  useEffect(() => {
    const playerName = localStorage.getItem('playerName');
    setHasPlayerName(!!playerName);
  }, []);

  return (
    <MainLayout>
      <PlayerNameModal
        isOpen={isOpenNameModal}
        onOpenChange={v => setIsOpenNameModal(v)}
        onConfirm={v => {
          if (!v) return;
          localStorage.setItem('playerName', v);
          window.location.href = '/multiple-play';
        }}
      />
      <RuleModal isOpen={isOpenRuleModal} onOpenChange={setIsOpenRuleModal} />
      <div className="flex h-full w-full flex-col items-center justify-center">
        <motion.div variants={fadeVariants} initial="hidden" animate="show">
          <Image
            src="/logo.svg"
            alt="Logo"
            className="mb-[50px]"
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
          運用你的智慧，成為 24 點大師
        </motion.h1>
        <p className="mb-8 flex flex-wrap items-center justify-center text-lg max-md:w-4/5 md:w-2/5">
          {intro.map((el, i) => (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.2,
                delay: i / 30,
              }}
              key={i}
            >
              {el}
            </motion.span>
          ))}
        </p>
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
            className="mb-10"
            variant="secondary"
            onClick={() => setIsOpenRuleModal(true)}
          >
            <Image
              src="/document.svg"
              alt="document"
              width={16}
              height={16}
              priority
              className="mr-2"
            />
            觀看遊戲規則
          </Button>
        </motion.div>
        <div className="flex gap-8">
          <motion.div
            variants={fadeVariants}
            initial="hidden"
            animate={{
              opacity: 1,
              scale: 1,
              transition: { delay: 0.8 },
            }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 1 }}>
              <Card
                onClick={() => (window.location.href = '/single-play')}
                className="flex cursor-pointer items-center justify-center border-2 p-6"
              >
                <Image
                  src="/single-player.svg"
                  alt="single-player"
                  width={58}
                  height={58}
                  priority
                />
                <div className="ml-2 flex flex-col text-lg">
                  <div>單人</div>
                  <div>遊玩</div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
          <motion.div
            variants={fadeVariants}
            initial="hidden"
            animate={{
              opacity: 1,
              scale: 1,
              transition: { delay: 1.2 },
            }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 1 }}>
              <Card
                onClick={() => {
                  if (!hasPlayerName) {
                    setIsOpenNameModal(true);
                  } else {
                    window.location.href = '/multiple-play';
                  }
                }}
                className="flex cursor-pointer items-center justify-center border-2 p-6"
              >
                <Image
                  src="/multiple-players.svg"
                  alt="multiple-players"
                  width={58}
                  height={58}
                  priority
                />
                <div className="ml-2 flex flex-col text-lg">
                  <div>多人</div>
                  <div>連線</div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </div>
        <div className="fixed bottom-4 items-center">
          <div className="mb-1 text-center text-xs text-gray-500">
            此網站在電腦與平板支援度最佳，維護時間: 每週一 23:00-23:59
          </div>
          <div className="flex justify-center">
            <div className="mr-2 flex gap-1 text-xs text-gray-500">
              <span>Created by Johnson Huang</span>
              <Image
                src="/smile-circle.svg"
                alt="smile-circle"
                width={12}
                height={12}
                priority
              />
              <span>{date.getFullYear()}.</span>
            </div>
            <div className="mr-2 text-xs text-gray-500">beta.0.0.6</div>
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
        </div>
      </div>
    </MainLayout>
  );
}
