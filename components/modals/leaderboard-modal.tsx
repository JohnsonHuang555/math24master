'use client';

import { useState } from 'react';
import Image from 'next/image';
import { signIn, signOut, useSession } from 'next-auth/react';
import { Trophy } from 'lucide-react';
import {
  LeaderboardMode,
  LeaderboardRow,
  useLeaderboard,
} from '@/hooks/useLeaderboard';
import { formatTime } from '@/lib/utils';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

type LeaderboardModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const TABS: { mode: LeaderboardMode; label: string }[] = [
  { mode: 'normal', label: '關卡' },
  { mode: 'challenge', label: '挑戰' },
  { mode: 'classic', label: '經典' },
];

function ScoreCell({ row, mode }: { row: LeaderboardRow; mode: LeaderboardMode }) {
  if (mode === 'normal') {
    return (
      <div className="text-right text-xs">
        <div className="font-semibold">{row.rankingScore ?? '-'} pt</div>
        <div className="text-muted-foreground">{formatTime(row.seconds ?? 0)}</div>
      </div>
    );
  }
  if (mode === 'challenge') return <span>第 {row.stage} 關</span>;
  return <span>{row.score} 分</span>;
}

function LeaderboardTable({
  rows,
  loading,
  error,
  mode,
  myId,
}: {
  rows: LeaderboardRow[];
  loading: boolean;
  error: string | null;
  mode: LeaderboardMode;
  myId?: string;
}) {
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        載入中...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-red-400">
        {error}
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        還沒有人上榜，成為第一個！
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y text-sm">
      {rows.map(row => {
        const isMe = row.userId === myId;
        return (
          <div
            key={row.userId}
            className={`flex items-center gap-3 px-1 py-2 ${isMe ? 'rounded-md bg-blue-50 font-semibold dark:bg-blue-950' : ''}`}
          >
            <span className={`w-6 text-right tabular-nums text-xs ${row.rank <= 3 ? 'font-bold' : 'text-muted-foreground'}`}>
              {row.rank <= 3 ? ['🥇', '🥈', '🥉'][row.rank - 1] : row.rank}
            </span>
            <div className="flex flex-1 items-center gap-2 overflow-hidden">
              {row.photoURL ? (
                <Image
                  src={row.photoURL}
                  alt={row.displayName}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              ) : (
                <div className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-700" />
              )}
              <span className="truncate">{row.displayName}</span>
              {isMe && <span className="text-xs text-blue-500">（我）</span>}
            </div>
            <ScoreCell row={row} mode={mode} />
          </div>
        );
      })}
    </div>
  );
}

function TabPanel({ mode, myId }: { mode: LeaderboardMode; myId?: string }) {
  const { rows, loading, error } = useLeaderboard(mode, true);
  return (
    <LeaderboardTable
      rows={rows}
      loading={loading}
      error={error}
      mode={mode}
      myId={myId}
    />
  );
}

export function LeaderboardModal({ isOpen, onClose }: LeaderboardModalProps) {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<LeaderboardMode>('normal');
  const myId = (session?.user as { id?: string })?.id;

  return (
    <Dialog open={isOpen} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            全球排行榜
          </DialogTitle>
        </DialogHeader>

        {/* 登入狀態列 */}
        <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
          {status === 'authenticated' && session.user ? (
            <div className="flex items-center gap-2">
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name ?? ''}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              )}
              <span>{session.user.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">登入後可上榜</span>
          )}
          {status === 'authenticated' ? (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => signOut()}>
              登出
            </Button>
          ) : (
            <Button size="sm" className="h-7 text-xs" onClick={() => signIn('google')}>
              Google 登入
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as LeaderboardMode)}>
          <TabsList className="w-full">
            {TABS.map(t => (
              <TabsTrigger key={t.mode} value={t.mode} className="flex-1">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map(t => (
            <TabsContent key={t.mode} value={t.mode} className="mt-3 max-h-[360px] overflow-y-auto">
              <TabPanel mode={t.mode} myId={myId} />
            </TabsContent>
          ))}
        </Tabs>

        <Button variant="outline" onClick={onClose}>
          關閉
        </Button>
      </DialogContent>
    </Dialog>
  );
}
