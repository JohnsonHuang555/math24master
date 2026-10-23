'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import type { LeaderboardSubmitState } from '@/hooks/useLeaderboardSubmit';
import { useMyRank } from '@/hooks/useMyRank';
import {
  type LeaderboardMode,
  findBoardByMode,
  leaderboardHref,
} from '@/lib/leaderboard';
import { cn } from '@/lib/utils';
import { usePendingScoreStore } from '@/stores/pending-score-store';
import { MyRankCard } from './my-rank-card';
import { RankingList } from './ranking-list';

type ResultRankProps = {
  mode: LeaderboardMode;
  submit: LeaderboardSubmitState;
  className?: string;
};

// 結算畫面的「第 N 名 · 查看排行榜」按鈕與精簡 modal（我的名次 + 前 3 名 + 完整排行榜連結）
export function ResultRank({ mode, submit, className }: ResultRankProps) {
  const [open, setOpen] = useState(false);
  // 送分中先不查，送完（enabled 由 false 轉 true）會自動重查拿到新名次
  const { state, myId, refetch } = useMyRank(
    mode,
    submit.status !== 'submitting',
  );
  const { rows, loading } = useLeaderboard(mode, open);

  // 結算後才登入的補送路徑：PendingScoreSubmitter 送完會清空 pendingScore，此時重查名次
  const pendingScore = usePendingScoreStore(s => s.pendingScore);
  const hadPendingRef = useRef(false);
  useEffect(() => {
    if (pendingScore) {
      hadPendingRef.current = true;
    } else if (hadPendingRef.current) {
      hadPendingRef.current = false;
      refetch();
    }
  }, [pendingScore, refetch]);

  const isNewRecord = submit.status === 'done' && submit.updated;
  const { board, level } = findBoardByMode(mode);
  const title =
    board.levels.length > 1
      ? `${board.label}排行榜 · ${level.label}`
      : `${board.label}排行榜`;

  return (
    <>
      <Button
        variant="outline"
        className={cn('w-full gap-1.5', className)}
        onClick={() => setOpen(true)}
      >
        <Trophy className="h-4 w-4 text-amber-500" />
        {state.status === 'ranked'
          ? `第 ${state.row.rank} 名 · 查看排行榜`
          : '查看排行榜'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              {title}
            </DialogTitle>
          </DialogHeader>

          <MyRankCard
            mode={mode}
            state={state}
            badge={
              isNewRecord && (
                <span className="rounded-md bg-amber-100 px-1.5 py-px text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                  新紀錄
                </span>
              )
            }
          />

          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-muted-foreground">前 3 名</p>
            {loading ? (
              <div className="flex flex-col gap-1.5">
                {Array.from({ length: 3 }, (_, i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60"
                  />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                榜單還是空的
              </p>
            ) : (
              <RankingList rows={rows.slice(0, 3)} mode={mode} myId={myId} />
            )}
          </div>

          <Button variant="tactileOutline" className="w-full gap-1" asChild>
            <Link href={leaderboardHref(mode)}>
              查看完整排行榜
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
