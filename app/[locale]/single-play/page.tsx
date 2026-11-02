'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ChevronRight,
  Layers,
  LayoutGrid,
  Shapes,
  Timer,
  Trophy,
} from 'lucide-react';
import ChallengePlayGame from '@/app/[locale]/single-play/[mode]/challenge-play-game';
import ClassicPlayGame from '@/app/[locale]/single-play/[mode]/classic-play-game';
import MatchPlayGame from '@/app/[locale]/single-play/[mode]/match-play-game';
import TabletopPlayGame from '@/app/[locale]/single-play/[mode]/tabletop-play-game';
import { BackToHomeButton } from '@/components/back-to-home-button';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Link } from '@/i18n/navigation';
import { prewarmMatchGenerator } from '@/lib/match-board-generator';
import { useStatsStore } from '@/stores/stats-store';

// 關卡模式（normal）暫時下架，改版為固定題庫後再回歸
type PlayMode = 'classic' | 'challenge' | 'match' | 'tabletop';

// 模式之間用圖示區分，不用顏色（設計系統：所有模式卡都是 teal）
const MODE_CONFIG = [
  {
    value: 'classic' as const,
    label: '經典模式',
    badge: undefined as string | undefined,
    tagline: '牌值 1–13 · 累積最高分',
    chips: ['解題獲得分數', '尋找最佳解答', '牌庫抽完即遊戲結束'],
    Icon: Layers,
  },
  {
    value: 'challenge' as const,
    label: '挑戰模式',
    badge: undefined as string | undefined,
    tagline: '倒數 5 分鐘 · 無限關卡',
    chips: ['答對加秒數', '跳過會懲罰', '挑戰通過最多關卡數'],
    Icon: Timer,
  },
  {
    value: 'match' as const,
    label: '消消樂模式',
    badge: undefined as string | undefined,
    tagline: '16 張牌 · 自由配對消除',
    chips: ['任選 2–4 張湊 24', '無時間限制', '全部清除才計分上榜'],
    Icon: LayoutGrid,
  },
  {
    value: 'tabletop' as const,
    label: '牌桌模式',
    badge: 'Beta' as string | undefined,
    tagline: '改編自拉密 · 對戰電腦搶先出完',
    chips: ['拆開重組桌上算式', '同色或全異色', '和 2 個電腦搶分'],
    Icon: Shapes,
  },
] as const;

export default function SinglePlayPage() {
  const reduceMotion = useReducedMotion();
  const [activeMode, setActiveMode] = useState<PlayMode | null>(null);

  const {
    classicBestScore,
    challengeBestStage,
    matchBestScore,
    tabletopBestScores,
  } = useStatsStore();

  // 三個難度的分數不能互相比較，顯示最高難度的那筆紀錄
  const tabletopBest = (
    [
      ['hard', '困難'],
      ['normal', '普通'],
      ['easy', '簡單'],
    ] as const
  ).find(([d]) => tabletopBestScores[d] > 0);

  // 消消樂模式牌局的反向構造需要先窮舉可解組合，趁玩家瀏覽模式選單的空檔背景預熱，
  // 避免點「開始遊戲」時卡頓（詳見 lib/match-board-generator.ts）
  useEffect(() => {
    prewarmMatchGenerator();
  }, []);

  const bestLabel: Record<PlayMode, { prefix?: string; value: string } | null> =
    {
      classic:
        classicBestScore > 0 ? { value: `${classicBestScore} 分` } : null,
      challenge:
        challengeBestStage > 0
          ? { value: `第 ${challengeBestStage} 關` }
          : null,
      match: matchBestScore > 0 ? { value: `${matchBestScore} 分` } : null,
      tabletop: tabletopBest
        ? {
            prefix: tabletopBest[1],
            value: `${tabletopBestScores[tabletopBest[0]]} 分`,
          }
        : null,
    };

  if (activeMode === 'challenge') {
    return <ChallengePlayGame onBack={() => setActiveMode(null)} autoStart />;
  }
  if (activeMode === 'classic') {
    return <ClassicPlayGame onBack={() => setActiveMode(null)} autoStart />;
  }
  if (activeMode === 'match') {
    return <MatchPlayGame onBack={() => setActiveMode(null)} autoStart />;
  }
  if (activeMode === 'tabletop') {
    return <TabletopPlayGame onBack={() => setActiveMode(null)} />;
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex shrink-0 items-center gap-1 px-2 pt-2">
        <BackToHomeButton />
        <span className="flex-1" />
        <Link
          href="/leaderboard"
          aria-label="排行榜"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-ink transition-colors hover:bg-sunken"
        >
          <Trophy className="h-5 w-5" />
        </Link>
        <LocaleSwitcher className="text-ink" />
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-col gap-1.5 px-4 pt-2 pb-5">
        <h1 className="text-[28px] font-black tracking-tight text-ink">
          單人模式
        </h1>
        <p className="text-[15px] text-ink-2">選一個模式開始，點了就進入遊戲</p>
      </div>

      <main className="mx-auto flex w-full max-w-lg flex-col gap-3.5 px-4 pb-10">
        {MODE_CONFIG.map((mode, i) => {
          const best = bestLabel[mode.value];
          return (
            <motion.button
              key={mode.value}
              type="button"
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.28,
                delay: reduceMotion ? 0 : i * 0.05,
                ease: [0.2, 0, 0, 1],
              }}
              onClick={() => setActiveMode(mode.value)}
              className="group flex w-full flex-col gap-3 rounded-[20px] border border-line bg-surface p-[18px] text-left transition-[border-color,translate] duration-[90ms] hover:border-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus active:translate-y-0.5"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-primary-tint text-primary-ink">
                  <mode.Icon className="h-6 w-6" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2">
                    <strong className="text-[19px] text-ink">
                      {mode.label}
                    </strong>
                    {mode.badge && (
                      <span className="rounded-[5px] bg-amber px-1.5 py-[3px] text-[10px] font-extrabold tracking-[0.06em] text-on-amber uppercase">
                        {mode.badge}
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-ink-2">{mode.tagline}</span>
                </div>
                <ChevronRight
                  aria-hidden
                  className="h-5 w-5 shrink-0 text-ink-2 group-hover:text-primary-ink"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {mode.chips.map(chip => (
                  <span
                    key={chip}
                    className="inline-flex h-[26px] items-center rounded-full bg-sunken px-[9px] text-xs font-semibold whitespace-nowrap text-ink"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              {best && (
                <div className="flex items-center justify-between border-t border-line pt-3">
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-2">
                    <Trophy aria-hidden className="h-4 w-4" />
                    個人最佳
                  </span>
                  <span className="flex items-baseline gap-1.5">
                    {best.prefix && (
                      <span className="text-[13px] font-bold text-ink-2">
                        {best.prefix}
                      </span>
                    )}
                    <span className="font-display text-[22px] font-extrabold text-ink">
                      {best.value}
                    </span>
                  </span>
                </div>
              )}
            </motion.button>
          );
        })}
      </main>
    </div>
  );
}
