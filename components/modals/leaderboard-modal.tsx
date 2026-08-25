'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Trophy, User } from 'lucide-react';
import { signIn, signOut, useSession } from 'next-auth/react';
import {
  LeaderboardMode,
  LeaderboardRow,
  useLeaderboard,
} from '@/hooks/useLeaderboard';
import { formatTime, formatTimePrecise } from '@/lib/utils';
import { useGuestStore } from '@/stores/guest-store';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { GuestLoginModal } from './guest-login-modal';

type LeaderboardModalProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: LeaderboardMode;
};

const TABS: { mode: LeaderboardMode; label: string }[] = [
  { mode: 'classic', label: '經典' },
  { mode: 'challenge', label: '挑戰' },
  { mode: 'match', label: '消消樂' },
  { mode: 'quickmath', label: '快答' },
];

const SCORE_HEADER: Record<LeaderboardMode, string> = {
  normal: '得分 / 時間',
  challenge: '關卡',
  classic: '分數',
  quickmath: '完成時間',
  match: '分數 / 時間',
};

function ScoreCell({
  row,
  mode,
}: {
  row: LeaderboardRow;
  mode: LeaderboardMode;
}) {
  if (mode === 'quickmath') {
    return (
      <div className="min-w-[72px] text-right text-xs">
        <div className="font-semibold">
          {formatTimePrecise(row.seconds ?? 0)}
        </div>
      </div>
    );
  }
  if (mode === 'normal') {
    return (
      <div className="min-w-[72px] text-right text-xs">
        <div className="font-semibold">{row.rankingScore ?? '-'} pt</div>
        <div className="text-muted-foreground">
          {formatTime(row.seconds ?? 0)}
        </div>
      </div>
    );
  }
  if (mode === 'challenge') {
    return (
      <div className="min-w-[72px] text-right text-xs">
        <div className="font-semibold">第 {row.stage} 關</div>
      </div>
    );
  }
  if (mode === 'match') {
    return (
      <div className="min-w-[72px] text-right text-xs">
        <div className="font-semibold">{row.score} 分</div>
        <div className="text-muted-foreground">
          {formatTimePrecise(row.elapsedSeconds ?? 0)}
        </div>
      </div>
    );
  }
  return (
    <div className="min-w-[72px] text-right text-xs">
      <div className="font-semibold">{row.score} 分</div>
    </div>
  );
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
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
        <span className="text-3xl" aria-hidden="true">
          🏆
        </span>
        <p className="text-sm font-semibold text-foreground">榜單還是空的</p>
        <p className="text-xs text-muted-foreground">成為第一個上榜的玩家！</p>
        <Link
          href={mode === 'quickmath' ? '/quick-math' : '/single-play'}
          className="mt-1 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          開始遊戲 →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col text-sm">
      {/* 欄位標頭 */}
      <div className="mb-1 flex items-center gap-3 px-1 text-xs text-muted-foreground">
        <span className="w-6" />
        <span className="flex-1">玩家</span>
        <span className="min-w-[72px] text-right">{SCORE_HEADER[mode]}</span>
      </div>
      <div className="divide-y">
        {rows.map(row => {
          const isMe = row.userId === myId;
          return (
            <div
              key={row.userId}
              className={`flex items-center gap-3 px-1 py-2 ${isMe ? 'rounded-md bg-blue-50 font-semibold dark:bg-blue-950' : ''}`}
            >
              <span
                className={`w-6 text-right tabular-nums ${row.rank <= 3 ? 'text-base' : 'text-xs text-muted-foreground'}`}
              >
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
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                    <User className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                  </div>
                )}
                <span className="truncate">{row.displayName}</span>
                {isMe && (
                  <span className="rounded bg-blue-100 px-1 py-px text-[10px] text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                    我
                  </span>
                )}
              </div>
              <ScoreCell row={row} mode={mode} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TabPanel({
  mode,
  myId,
  active,
}: {
  mode: LeaderboardMode;
  myId?: string;
  active: boolean;
}) {
  const { rows, loading, error } = useLeaderboard(mode, active);
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

export function LeaderboardModal({
  isOpen,
  onClose,
  defaultTab = 'classic',
}: LeaderboardModalProps) {
  const { data: session, status } = useSession();
  const { guestId, guestName, setGuest, clearGuest } = useGuestStore();
  const [activeTab, setActiveTab] = useState<LeaderboardMode>(defaultTab);
  const [showGuestLogin, setShowGuestLogin] = useState(false);

  const googleId = (session?.user as { id?: string })?.id;
  const myId = googleId ?? guestId ?? undefined;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={v => !v && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              全球排行榜
            </DialogTitle>
          </DialogHeader>

          {/* 登入狀態列 */}
          {status === 'authenticated' && session.user ? (
            // Google 已登入
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
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
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => signOut()}
              >
                登出
              </Button>
            </div>
          ) : guestId && guestName ? (
            // 訪客已登入
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                  <User className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </div>
                <span>{guestName}</span>
                <span className="rounded bg-slate-100 px-1 py-px text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  訪客
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={clearGuest}
              >
                登出
              </Button>
            </div>
          ) : (
            // 未登入
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 dark:border-orange-900 dark:bg-orange-950/40">
              <p className="mb-2 text-xs text-orange-700 dark:text-orange-300">
                🔑 登入後，讓你的紀錄出現在這裡！
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 flex-1 text-xs"
                  onClick={() => signIn('google')}
                >
                  Google 登入
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 flex-1 text-xs"
                  onClick={() => setShowGuestLogin(true)}
                >
                  訪客登入
                </Button>
              </div>
            </div>
          )}

          <Tabs
            value={activeTab}
            onValueChange={v => setActiveTab(v as LeaderboardMode)}
          >
            <TabsList className="w-full">
              {TABS.map(t => (
                <TabsTrigger key={t.mode} value={t.mode} className="flex-1">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {TABS.map(t => (
              <TabsContent
                key={t.mode}
                value={t.mode}
                className="mt-3 max-h-[360px] overflow-y-auto"
              >
                <TabPanel
                  mode={t.mode}
                  myId={myId}
                  active={activeTab === t.mode}
                />
              </TabsContent>
            ))}
          </Tabs>

          <Button variant="outline" onClick={onClose}>
            關閉
          </Button>
        </DialogContent>
      </Dialog>

      <GuestLoginModal
        isOpen={showGuestLogin}
        onClose={() => setShowGuestLogin(false)}
        onConfirm={name => {
          setGuest(name);
          setShowGuestLogin(false);
        }}
      />
    </>
  );
}
