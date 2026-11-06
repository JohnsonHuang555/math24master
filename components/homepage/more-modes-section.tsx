'use client';

import { useEffect, useState } from 'react';
import {
  Calculator,
  CalendarDays,
  CircleCheck,
  CircleDashed,
  Flame,
  HelpCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getDailyStatus } from '@/lib/daily-seed';
import GameModeCard from './game-mode-card';

const PILL_CLASS =
  'inline-flex h-6 items-center gap-[5px] rounded-full px-2 text-xs font-bold whitespace-nowrap';

/** 每日挑戰的今日狀態與連續天數；讀 localStorage，所以等掛載後才顯示 */
function DailyStatusPills() {
  const t = useTranslations('Home.moreModes.dailyChallenge');
  const [status, setStatus] = useState<ReturnType<
    typeof getDailyStatus
  > | null>(null);

  useEffect(() => {
    setStatus(getDailyStatus()); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  if (!status) return null;

  return (
    <span className="mt-[3px] flex flex-wrap gap-1.5">
      <span
        className={`${PILL_CLASS} ${status.doneToday ? 'bg-primary-tint text-primary-ink' : 'bg-sunken text-ink'}`}
      >
        {status.doneToday ? (
          <CircleCheck aria-hidden className="h-[13px] w-[13px]" />
        ) : (
          <CircleDashed aria-hidden className="h-[13px] w-[13px]" />
        )}
        {status.doneToday ? t('doneToday') : t('notDoneToday')}
      </span>
      {status.streak > 0 && (
        <span className={`${PILL_CLASS} bg-amber-tint text-amber-ink`}>
          <Flame aria-hidden className="h-[13px] w-[13px]" />
          {t('streak', { count: status.streak })}
        </span>
      )}
    </span>
  );
}

const MoreModesSection = () => {
  const t = useTranslations('Home.moreModes');

  return (
    <section className="px-4 pt-2 pb-8 md:px-10 md:pb-14">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 lg:max-w-[1040px] lg:gap-[18px]">
        <h2 className="mb-1 text-xl font-extrabold text-ink md:text-2xl lg:text-[26px]">
          {t('title')}
        </h2>
        <div className="grid gap-3 md:grid-cols-3 lg:gap-5">
          <GameModeCard
            href="/daily-challenge"
            icon={CalendarDays}
            title={t('dailyChallenge.title')}
            description={t('dailyChallenge.description')}
            extra={<DailyStatusPills />}
          />
          <GameModeCard
            href="/quick-math"
            icon={Calculator}
            title={t('quickMath.title')}
            description={t('quickMath.description')}
          />
          <GameModeCard
            href="/guess-number"
            icon={HelpCircle}
            title={t('guessNumber.title')}
            description={t('guessNumber.description')}
            badge={t('guessNumber.badge')}
          />
        </div>
      </div>
    </section>
  );
};

export default MoreModesSection;
