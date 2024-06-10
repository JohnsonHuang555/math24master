'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import MainLayout from '@/components/layouts/main-layout';
import { Card } from '@/components/ui/card';
import { fadeVariants } from '@/lib/animation-variants';

export default function Home() {
  const router = useRouter();
  const intro =
    '歡迎來到24點數學遊戲！這是一款充滿挑戰和樂趣的益智遊戲，考驗你的數學運算能力和策略思維'.split(
      '',
    );

  const date = new Date();

  return (
    <MainLayout>
      <div className="flex h-full w-full flex-col items-center justify-center">
        <motion.div variants={fadeVariants} initial="hidden" animate="show">
          <Image
            src="/logo.svg"
            alt="Logo"
            className="mb-[80px]"
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
        <p className="mb-16 flex w-2/5 flex-wrap items-center justify-center text-lg">
          {intro.map((el, i) => (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.2,
                delay: i / 60,
              }}
              key={i}
            >
              {el}
            </motion.span>
          ))}
        </p>
        <div className="flex gap-8">
          <motion.div variants={fadeVariants} initial="hidden" animate="show">
            <motion.div whileHover={{ scale: 1.12 }} whileTap={{ scale: 1 }}>
              <Card
                onClick={() => router.push('/single-play')}
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
              transition: { delay: 0.5 },
            }}
          >
            <motion.div whileHover={{ scale: 1.12 }} whileTap={{ scale: 1 }}>
              <Card
                // onClick={() => router.push('/single-play')}
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
        <div className="fixed bottom-6 flex items-center">
          <span className="mr-4 text-sm text-gray-500">
            {date.getFullYear()} Created by Johnson
          </span>
          <Link
            href="https://github.com/JohnsonHuang555/24_points"
            target="_blank"
          >
            <Image
              src="/github.svg"
              alt="github Logo"
              width={18}
              height={18}
              priority
            />
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
