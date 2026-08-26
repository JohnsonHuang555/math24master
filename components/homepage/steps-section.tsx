'use client';

import { RefObject } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

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

type StepsSectionProps = {
  scrollRef: RefObject<HTMLDivElement | null>;
};

const StepsSection = ({ scrollRef }: StepsSectionProps) => {
  const reduceMotion = useReducedMotion();

  return (
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
  );
};

export default StepsSection;
