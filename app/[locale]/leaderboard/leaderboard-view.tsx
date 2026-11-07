'use client';

import { useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BackToHomeButton } from '@/components/back-to-home-button';
import { AccountChip } from '@/components/leaderboard/account-chip';
import {
  LevelSegment,
  ModeTabs,
} from '@/components/leaderboard/board-selector';
import { MyRankCard } from '@/components/leaderboard/my-rank-card';
import { Podium } from '@/components/leaderboard/podium';
import { RankingList } from '@/components/leaderboard/ranking-list';
import { Button } from '@/components/ui/button';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useMyRank } from '@/hooks/useMyRank';
import { Link } from '@/i18n/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import { resolveBoard } from '@/lib/leaderboard';

const DESKTOP_QUERY = '(min-width: 1024px)';

function subscribeDesktop(onChange: () => void) {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

/** 與 Tailwind 的 lg 斷點一致；伺服器端先以手機版渲染 */
function useIsDesktop() {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

export default function LeaderboardView() {
  const router = useRouter();
  const t = useTranslations('Leaderboard');
  const tCommon = useTranslations('Common');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { board, level } = resolveBoard(
    searchParams.get('mode'),
    searchParams.get('level'),
  );
  const mode = level.mode;

  const isDesktop = useIsDesktop();
  const { rows, loading, error } = useLeaderboard(mode, true);
  const { state: myRank, myId } = useMyRank(mode);

  const handleChange = (boardId: string, levelId?: string) => {
    const params = new URLSearchParams({ mode: boardId });
    if (levelId) params.set('level', levelId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex shrink-0 items-center justify-between gap-3 px-2 pt-2 lg:px-8">
        <BackToHomeButton />
        <AccountChip />
      </header>

      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col lg:px-10">
        <div className="flex flex-col gap-1.5 px-4 pt-2 pb-4 lg:px-0 lg:pt-6 lg:pb-7">
          <h1 className="text-[28px] font-black tracking-tight text-ink lg:text-[40px]">
            {t('title')}
          </h1>
          <p className="text-[15px] text-ink-2 lg:text-base">{t('subtitle')}</p>
        </div>

        <div className="flex flex-1 flex-col gap-7 lg:flex-row lg:items-start">
          {/* 桌機：左側模式選單 */}
          <ModeTabs
            board={board}
            onChange={handleChange}
            orientation="vertical"
            className="hidden w-[220px] shrink-0 lg:flex"
          />

          <main className="flex min-w-0 flex-1 flex-col pb-6">
            <ModeTabs
              board={board}
              onChange={handleChange}
              orientation="horizontal"
              className="lg:hidden"
            />

            {board.levels.length > 1 && (
              <div className="flex flex-col gap-3 px-4 pt-3 lg:flex-row lg:items-center lg:gap-4 lg:px-0 lg:pt-0 lg:pb-5">
                <LevelSegment
                  board={board}
                  level={level}
                  onChange={handleChange}
                  className="lg:w-auto"
                />
              </div>
            )}

            {loading ? (
              <div
                className="flex flex-col gap-2 px-4 pt-7 lg:px-0 lg:pt-0"
                aria-label={t('loading')}
              >
                {Array.from({ length: 6 }, (_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-2xl bg-surface"
                  />
                ))}
              </div>
            ) : error ? (
              <p className="py-16 text-center text-[15px] font-bold text-danger-ink">
                {t('loadFailed')}
              </p>
            ) : rows.length === 0 ? (
              <div className="mx-4 mt-7 flex flex-col items-center gap-2 rounded-[20px] border border-line bg-surface px-4 py-12 text-center lg:mx-0 lg:mt-0">
                <span className="mb-2 flex h-14 w-14 items-center justify-center rounded-[18px] bg-amber-tint text-amber-ink">
                  <Trophy className="h-7 w-7" />
                </span>
                <p className="text-base font-bold text-ink">{t('empty')}</p>
                <p className="text-sm text-ink-2">{t('emptyHint')}</p>
                <Button variant="tactile" className="mt-4 px-8" asChild>
                  <Link href={board.playHref}>{tCommon('startGame')}</Link>
                </Button>
              </div>
            ) : (
              <div className="lg:overflow-hidden lg:rounded-[20px] lg:border lg:border-line lg:bg-surface">
                <Podium
                  rows={rows.slice(0, 3)}
                  mode={mode}
                  myId={myId}
                  className="px-4 pt-7 lg:border-b lg:border-line lg:bg-sunken lg:px-5"
                />
                {rows.length > 3 && (
                  <RankingList
                    rows={rows.slice(3)}
                    mode={mode}
                    myId={myId}
                    className="mx-4 rounded-b-[18px] border border-line lg:mx-0 lg:rounded-none lg:border-0"
                  />
                )}
              </div>
            )}
          </main>

          {/* 桌機：右側我的名次 */}
          {isDesktop && (
            <aside className="flex w-[300px] shrink-0 flex-col gap-3.5 rounded-[20px] border border-line bg-surface p-5">
              <strong className="text-[15px] text-ink-2">{t('myRank')}</strong>
              <MyRankCard mode={mode} state={myRank} stacked />
            </aside>
          )}
        </div>
      </div>

      {/* 手機：我的名次固定在底部（兩處只渲染一個，避免登入視窗與狀態重複） */}
      {!isDesktop && (
        <div className="sticky bottom-0 border-t border-line bg-surface shadow-[0_-8px_24px_rgba(16,36,33,0.08)]">
          <div className="mx-auto w-full max-w-2xl px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <MyRankCard mode={mode} state={myRank} />
          </div>
        </div>
      )}
    </div>
  );
}
