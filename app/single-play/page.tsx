'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Layers, LayoutGrid, Timer } from 'lucide-react';
import ChallengePlayGame from '@/app/single-play/[mode]/challenge-play-game';
import ClassicPlayGame from '@/app/single-play/[mode]/classic-play-game';
import MatchPlayGame from '@/app/single-play/[mode]/match-play-game';
import { BackToHomeButton } from '@/components/back-to-home-button';
import { prewarmMatchGenerator } from '@/lib/match-board-generator';
import { cn } from '@/lib/utils';
import { useStatsStore } from '@/stores/stats-store';

// 關卡模式（normal）暫時下架，改版為固定題庫後再回歸
type PlayMode = 'classic' | 'challenge' | 'match';

const MODE_CONFIG = [
  {
    value: 'classic' as const,
    label: '經典模式',
    badge: undefined as string | undefined,
    tagline: '牌值 1–13 · 累積最高分',
    chips: ['解題獲得分數', '尋找 最佳解答', '牌庫抽完即遊戲結束'],
    Icon: Layers,
    color: {
      icon: 'bg-teal-500',
      chip: 'bg-teal-50 border-teal-200 text-teal-700',
      shadow: 'shadow-[0_8px_0_0_hsl(175,84%,78%)]',
      hoverShadow: 'hover:shadow-[0_10px_0_0_hsl(175,84%,78%)]',
      activeShadow: 'active:shadow-[0_3px_0_0_hsl(175,84%,78%)]',
    },
  },
  {
    value: 'challenge' as const,
    label: '挑戰模式',
    badge: undefined as string | undefined,
    tagline: '倒數 5 分鐘 · 無限關卡',
    chips: ['答對加秒數', '跳過會懲罰', '挑戰通過最多關卡數'],
    Icon: Timer,
    color: {
      icon: 'bg-amber-400',
      chip: 'bg-amber-50 border-amber-200 text-amber-700',
      shadow: 'shadow-[0_8px_0_0_hsl(36,100%,72%)]',
      hoverShadow: 'hover:shadow-[0_10px_0_0_hsl(36,100%,72%)]',
      activeShadow: 'active:shadow-[0_3px_0_0_hsl(36,100%,72%)]',
    },
  },
  {
    value: 'match' as const,
    label: '消消樂模式',
    badge: undefined as string | undefined,
    tagline: '16 張牌 · 自由配對消除',
    chips: ['任選 2-4 張湊 24', '無時間限制', '全部清除才計分上榜'],
    Icon: LayoutGrid,
    color: {
      icon: 'bg-primary',
      chip: 'bg-zinc-50 border-zinc-200 text-zinc-700',
      shadow: 'shadow-[0_8px_0_0_rgba(0,0,0,0.10)]',
      hoverShadow: 'hover:shadow-[0_10px_0_0_rgba(0,0,0,0.10)]',
      activeShadow: 'active:shadow-[0_3px_0_0_rgba(0,0,0,0.10)]',
    },
  },
] as const;

export default function SinglePlayPage() {
  const [activeMode, setActiveMode] = useState<PlayMode | null>(null);

  const { classicBestScore, challengeBestStage, matchBestScore } =
    useStatsStore();

  // 消消樂模式牌局的反向構造需要先窮舉可解組合，趁玩家瀏覽模式選單的空檔背景預熱，
  // 避免點「開始遊戲」時卡頓（詳見 lib/match-board-generator.ts）
  useEffect(() => {
    prewarmMatchGenerator();
  }, []);

  const bestLabel: Record<PlayMode, string | null> = {
    classic: classicBestScore > 0 ? `${classicBestScore} 分` : null,
    challenge: challengeBestStage > 0 ? `第 ${challengeBestStage} 關` : null,
    match: matchBestScore > 0 ? `${matchBestScore} 分` : null,
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

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center px-4">
        <BackToHomeButton />
      </header>

      {/* Main */}
      <main className="mb-10 flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-8 pt-0">
        <div className="text-center">
          <h1 className="font-display text-3xl font-black tracking-tight text-foreground md:text-4xl">
            選擇模式
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            挑選適合你的遊戲方式
          </p>
        </div>

        <div className="flex w-full max-w-lg flex-col gap-4 space-y-4">
          {MODE_CONFIG.map((mode, i) => {
            const best = bestLabel[mode.value];
            return (
              <motion.button
                key={mode.value}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: i * 0.07,
                  ease: [0.16, 1, 0.3, 1],
                }}
                whileHover={{ y: -4 }}
                whileTap={{ y: 2 }}
                onClick={() => {
                  setTimeout(() => {
                    setActiveMode(mode.value);
                  }, 500);
                }}
                className={cn(
                  'w-full cursor-pointer rounded-3xl border-2 border-zinc-200 bg-white/90 p-5 text-left backdrop-blur-sm transition-shadow dark:bg-zinc-900/80',
                  mode.color.shadow,
                  mode.color.hoverShadow,
                  mode.color.activeShadow,
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white',
                      mode.color.icon,
                    )}
                  >
                    <mode.Icon className="h-7 w-7" />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-xl font-black text-foreground">
                        {mode.label}
                      </span>
                      {mode.badge && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                          {mode.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {mode.tagline}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {mode.chips.map(chip => (
                        <span
                          key={chip}
                          className={cn(
                            'rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                            mode.color.chip,
                          )}
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Personal best */}
                {best && (
                  <div className="mt-4 border-t border-zinc-100 pt-3.5 dark:border-zinc-800">
                    <p className="text-xs text-muted-foreground">個人最佳</p>
                    <p className="font-display text-xl font-bold text-foreground">
                      {best}
                    </p>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
