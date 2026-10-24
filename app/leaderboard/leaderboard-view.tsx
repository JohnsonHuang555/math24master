'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Trophy } from 'lucide-react';
import { BackToHomeButton } from '@/components/back-to-home-button';
import { AccountChip } from '@/components/leaderboard/account-chip';
import { BoardSelector } from '@/components/leaderboard/board-selector';
import { MyRankCard } from '@/components/leaderboard/my-rank-card';
import { Podium } from '@/components/leaderboard/podium';
import { RankingList } from '@/components/leaderboard/ranking-list';
import { TabletopBetaNotice } from '@/components/tabletop/tabletop-beta-notice';
import { Button } from '@/components/ui/button';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useMyRank } from '@/hooks/useMyRank';
import { resolveBoard } from '@/lib/leaderboard';

export default function LeaderboardView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { board, level } = resolveBoard(
    searchParams.get('mode'),
    searchParams.get('level'),
  );
  const mode = level.mode;

  const { rows, loading, error } = useLeaderboard(mode, true);
  const { state: myRank, myId } = useMyRank(mode);

  const handleChange = (boardId: string, levelId?: string) => {
    const params = new URLSearchParams({ mode: boardId });
    if (levelId) params.set('level', levelId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 px-4">
        <BackToHomeButton />
        <AccountChip />
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pb-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-black tracking-tight text-foreground md:text-4xl">
            全球排行榜
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            每位玩家只保留最佳成績
          </p>
        </div>

        <BoardSelector board={board} level={level} onChange={handleChange} />

        {board.id === 'tabletop' && <TabletopBetaNotice />}

        {loading ? (
          <div className="flex flex-col gap-1.5" aria-label="載入中">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60"
              />
            ))}
          </div>
        ) : error ? (
          <p className="py-16 text-center text-sm text-rose-500 dark:text-rose-400">
            {error}
          </p>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Trophy className="h-10 w-10 text-amber-400" />
            <p className="text-base font-bold text-foreground">榜單還是空的</p>
            <p className="text-sm text-muted-foreground">
              成為第一個上榜的玩家
            </p>
            <Button variant="tactile" className="mt-3 h-11 px-8" asChild>
              <Link href={board.playHref}>開始遊戲</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Podium rows={rows.slice(0, 3)} mode={mode} myId={myId} />
            {rows.length > 3 && (
              <RankingList rows={rows.slice(3)} mode={mode} myId={myId} />
            )}
          </div>
        )}
      </main>

      {/* 漸層色與 app/layout.tsx 的全站底色一致，避免捲動時出現色帶 */}
      <div className="sticky bottom-0 bg-linear-to-t from-[#f3faf8] via-[#f3faf8]/95 to-transparent pt-4 dark:from-zinc-950 dark:via-zinc-950/95">
        <div className="mx-auto w-full max-w-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <MyRankCard mode={mode} state={myRank} />
        </div>
      </div>
    </div>
  );
}
