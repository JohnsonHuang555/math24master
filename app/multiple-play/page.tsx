'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import CreateRoomModal from '@/components/modals/create-room-modal';
import { PlayerNameModal } from '@/components/modals/player-name-modal';
import { RuleModal } from '@/components/modals/rule-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Room } from '@/models/Room';
import { SocketEvent } from '@/models/SocketEvent';
import { useAlertDialogStore } from '@/providers/alert-dialog-store-provider';
import { useMultiplePlay } from '@/providers/multiple-play-provider';
import { useGuestStore } from '@/stores/guest-store';
import { useSession } from 'next-auth/react';
import AlertDialogModal from '@/components/modals/alert-dialog-modal';
import {
  ArrowLeft,
  BookOpen,
  Lock,
  Pencil,
  Plus,
  Search,
  Users,
  Zap,
} from 'lucide-react';

const RELOAD_ROOMS_TIMER = 1000;
const roomId = uuidv4();

type GameTypeFilter = 'all' | 'classic' | 'rummy' | 'buzzer';

const GAME_TYPE_LABELS: Record<string, string> = {
  classic: '傳統',
  rummy: '拉密',
  buzzer: '搶答',
};

function RoomCard({ room, onClick }: { room: Room; onClick: () => void }) {
  const reduceMotion = useReducedMotion();
  const isFull = room.players.length >= room.maxPlayers;
  const gameType = room.settings.gameType;

  const colorMap = {
    classic: {
      border: 'border-teal-200 dark:border-teal-800',
      bg: 'bg-teal-50 dark:bg-teal-900/20',
      shadow: 'shadow-[0_6px_0_0_theme(colors.teal.200)] dark:shadow-[0_6px_0_0_theme(colors.teal.800)]',
      hover: 'hover:bg-teal-100/70 dark:hover:bg-teal-900/30',
      badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
      icon: 'bg-teal-500',
      name: 'text-teal-800 dark:text-teal-200',
      count: 'text-teal-600 dark:text-teal-400',
    },
    rummy: {
      border: 'border-teal-200 dark:border-teal-800',
      bg: 'bg-teal-50/60 dark:bg-teal-900/10',
      shadow: 'shadow-[0_6px_0_0_theme(colors.teal.200)] dark:shadow-[0_6px_0_0_theme(colors.teal.800)]',
      hover: 'hover:bg-teal-100/50 dark:hover:bg-teal-900/20',
      badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
      icon: 'bg-teal-400',
      name: 'text-teal-800 dark:text-teal-200',
      count: 'text-teal-600 dark:text-teal-400',
    },
    buzzer: {
      border: 'border-amber-200 dark:border-amber-800',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      shadow: 'shadow-[0_6px_0_0_theme(colors.amber.200)] dark:shadow-[0_6px_0_0_theme(colors.amber.800)]',
      hover: 'hover:bg-amber-100/70 dark:hover:bg-amber-900/30',
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      icon: 'bg-amber-500',
      name: 'text-amber-800 dark:text-amber-200',
      count: 'text-amber-600 dark:text-amber-400',
    },
  };

  const c = colorMap[gameType as keyof typeof colorMap] ?? colorMap.classic;

  return (
    <motion.button
      onClick={onClick}
      whileHover={reduceMotion || isFull ? undefined : { y: -4 }}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      disabled={isFull}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left',
        'transition-colors active:translate-y-1 active:shadow-none',
        c.border, c.bg, c.shadow, c.hover,
        isFull && 'cursor-not-allowed opacity-50',
      )}
    >
      {/* 遊戲類型圖示 */}
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white', c.icon)}>
        {gameType === 'buzzer' ? (
          <Zap className="h-5 w-5" />
        ) : (
          <span className="font-display text-base font-black">24</span>
        )}
      </div>

      {/* 房間資訊 */}
      <div className="min-w-0 flex-1">
        <div className={cn('flex items-center gap-1.5 font-display text-base font-black', c.name)}>
          {room.password && <Lock className="h-3.5 w-3.5 shrink-0" />}
          <span className="truncate">{room.roomName}</span>
        </div>
        <div className={cn('mt-0.5 flex items-center gap-2 text-sm', c.count)}>
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', c.badge)}>
            {GAME_TYPE_LABELS[gameType] ?? gameType}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {room.players.length} / {room.maxPlayers}
          </span>
          {isFull && <span className="text-xs font-medium text-rose-500">人數已滿</span>}
        </div>
      </div>
    </motion.button>
  );
}

export default function MultiplePlayPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const [rooms, setRooms] = useState<Room[]>([]);
  const router = useRouter();
  const { searchRooms, joinRoom, socket } = useMultiplePlay();
  const [searchedRoomName, setSearchedRoomName] = useState('');
  const [gameTypeFilter, setGameTypeFilter] = useState<GameTypeFilter>('all');
  const [playerName, setPlayerName] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>();
  const [isOpenNameModal, setIsOpenNameModal] = useState(false);
  const [isOpenCreateRoomModal, setIsOpenCreateRoomModal] = useState(false);
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);

  const { onOpen, isConfirmed, onReset } = useAlertDialogStore(state => state);
  const { data: session, status } = useSession();
  const { guestName } = useGuestStore();

  useEffect(() => {
    if (status === 'loading') return;
    const stored = localStorage.getItem('playerName') || '';
    if (stored) {
      setPlayerName(stored);
      return;
    }
    const authName = session?.user?.name ?? guestName ?? '';
    if (authName) {
      localStorage.setItem('playerName', authName);
      setPlayerName(authName);
    } else {
      setIsOpenNameModal(true);
    }
  }, [status, session, guestName]);

  useEffect(() => {
    searchRooms();

    socket.on(SocketEvent.GetRoomsResponse, (r: Room[]) => {
      setRooms(r || []);
    });

    socket.on(SocketEvent.JoinRoomSuccess, (room: Room) => {
      if (room.roomId) {
        router.push(`/multiple-play/${room.roomId}`);
      } else {
        toast.error('建立失敗');
      }
    });
  }, [router, socket, searchRooms]);

  useEffect(() => {
    if (isConfirmed) {
      window.location.href = `/multiple-play/${selectedRoomId}`;
      onReset();
    }
  }, [isConfirmed, onReset, selectedRoomId]);

  useEffect(() => {
    const interval = setInterval(() => {
      searchRooms({
        roomName: searchedRoomName,
        showEmpty: false,
      });
    }, RELOAD_ROOMS_TIMER);
    return () => clearInterval(interval);
  }, [searchRooms, searchedRoomName]);

  const filteredRooms =
    gameTypeFilter === 'all'
      ? rooms
      : rooms.filter(r => r.settings.gameType === gameTypeFilter);

  // const FILTERS: { value: GameTypeFilter; label: string }[] = [
  //   { value: 'all', label: '全部' },
  //   { value: 'classic', label: '傳統' },
  //   { value: 'rummy', label: '拉密' },
  //   { value: 'buzzer', label: '搶答' },
  // ];

  return (
    <main className="flex h-full flex-col">
      <AlertDialogModal />
      <RuleModal isOpen={isOpenRuleModal} onOpenChange={setIsOpenRuleModal} />
      <PlayerNameModal
        isOpen={isOpenNameModal}
        onOpenChange={setIsOpenNameModal}
        onConfirm={value => {
          if (!value) return;
          localStorage.setItem('playerName', value);
          setPlayerName(value);
          setIsOpenNameModal(false);
        }}
        closeDisabled={!playerName}
        defaultValue={playerName}
      />
      <CreateRoomModal
        roomId={roomId}
        isOpen={isOpenCreateRoomModal}
        onOpenChange={setIsOpenCreateRoomModal}
        onConfirm={(roomName, maxPlayers, password, gameType) => {
          joinRoom(playerName, roomId, roomName, maxPlayers, password, gameType);
        }}
      />

      {/* Memphis 底圖 */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[url('/b2.webp')] bg-cover bg-center opacity-[0.20]"
      />

      {/* 頁面捲動容器 */}
      <div ref={scrollRef} className="flex h-full flex-col overflow-y-auto">
        {/* Header */}
        <header className="relative z-10 flex h-16 shrink-0 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.webp"
              alt="24點大師"
              width={100}
              height={30}
              className="h-7 w-auto dark:invert cursor-pointer"
              priority
              onClick={() => router.push('/')}
            />
          </div>
          <nav className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="hidden font-bold text-muted-foreground hover:text-foreground md:flex"
              onClick={() => setIsOpenRuleModal(true)}
            >
              <BookOpen className="mr-1.5 h-4 w-4" />
              遊戲規則
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground md:hidden"
              onClick={() => setIsOpenRuleModal(true)}
            >
              <BookOpen className="h-5 w-5" />
            </Button>
            {/* 玩家名稱 */}
            <button
              onClick={() => setIsOpenNameModal(true)}
              className="ml-1 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <span className="hidden md:inline">Hi, </span>
              <span className="font-bold">{playerName}</span>
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </nav>
        </header>

        {/* Main */}
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pb-8 md:px-8">
          {/* 頁面標題 */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6 mt-2 flex items-end justify-between"
          >
            <div>
              <h1 className="font-display text-3xl font-black leading-tight text-foreground md:text-4xl">
                多人對戰
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                加入房間或建立你的專屬對局
              </p>
            </div>
            <Button
              onClick={() => setIsOpenCreateRoomModal(true)}
              className="h-11 gap-2 rounded-2xl bg-primary px-5 font-bold text-white shadow-[0_4px_0_0_hsl(175_84%_22%)] transition-all active:translate-y-1 active:shadow-none dark:shadow-[0_4px_0_0_hsl(173_66%_28%)]"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">建立房間</span>
              <span className="sm:hidden">建立</span>
            </Button>
          </motion.div>

          {/* 篩選列 */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.07, ease: [0.16, 1, 0.3, 1] }}
            className="mb-5 flex flex-wrap items-center gap-3"
          >
            {/* 搜尋框 */}
            <div className="relative min-w-0 flex-1 sm:max-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜尋房間..."
                className="rounded-xl border-zinc-200 pl-9 focus-visible:ring-primary dark:border-zinc-700"
                onChange={e => setSearchedRoomName(e.target.value)}
              />
            </div>

            {/* TODO: 之後再做, 遊戲類型篩選 */}
            {/* <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white/60 p-1 backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/40">
              {FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setGameTypeFilter(f.value)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-bold transition-colors',
                    gameTypeFilter === f.value
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div> */}
          </motion.div>

          {/* 房間計數 */}
          {filteredRooms.length > 0 && (
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              {filteredRooms.length} 個房間
            </p>
          )}

          {/* 房間列表 */}
          {filteredRooms.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredRooms.map((room, i) => (
                <motion.div
                  key={room.roomId}
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                >
                  <RoomCard
                    room={room}
                    onClick={() => {
                      if (room.players.length >= room.maxPlayers) {
                        toast.info('房間人數已滿');
                        return;
                      }
                      setSelectedRoomId(room.roomId);
                      onOpen({
                        title: '加入房間',
                        description: `確定要加入 ${room.roomName} 嗎？`,
                      });
                    }}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-1 flex-col items-center justify-center pb-20"
            >
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                <Users className="h-7 w-7 text-zinc-400" />
              </div>
              <p className="font-display text-xl font-black text-zinc-600 dark:text-zinc-400">
                目前沒有房間
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                建立房間，邀請朋友一起來玩吧！
              </p>
              <Button
                onClick={() => setIsOpenCreateRoomModal(true)}
                className="mt-6 h-11 gap-2 rounded-2xl bg-primary px-6 font-bold text-white shadow-[0_4px_0_0_hsl(175_84%_22%)] active:translate-y-1 active:shadow-none dark:shadow-[0_4px_0_0_hsl(173_66%_28%)]"
              >
                <Plus className="h-4 w-4" />
                建立第一個房間
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );
}
