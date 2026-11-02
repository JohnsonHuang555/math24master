'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  BookOpen,
  ChevronRight,
  Layers,
  Lock,
  Pencil,
  Plus,
  Search,
  SearchX,
  Users,
  Zap,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { BackToHomeButton } from '@/components/back-to-home-button';
import AlertDialogModal from '@/components/modals/alert-dialog-modal';
import CreateRoomModal from '@/components/modals/create-room-modal';
import { PlayerNameModal } from '@/components/modals/player-name-modal';
import { RuleModal } from '@/components/modals/rule-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useHardNavigate, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { Room } from '@/models/Room';
import { SocketEvent } from '@/models/SocketEvent';
import { useAlertDialogStore } from '@/providers/alert-dialog-store-provider';
import { useMultiplePlay } from '@/providers/multiple-play-provider';
import { useGuestStore } from '@/stores/guest-store';

const RELOAD_ROOMS_TIMER = 1000;
const roomId = uuidv4();

type GameTypeFilter = 'all' | 'classic' | 'buzzer';

const GAME_TYPE_LABELS: Record<string, string> = {
  classic: '傳統',
  buzzer: '搶答',
};

function RoomCard({ room, onClick }: { room: Room; onClick: () => void }) {
  const isFull = room.players.length >= room.maxPlayers;
  const gameType = room.settings.gameType;
  const typeLabel = GAME_TYPE_LABELS[gameType] ?? gameType;

  // 遊戲類型用圖示區分，不用顏色；人數已滿時整張卡退成 sunken 並標示「已滿」
  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={isFull}
      className={cn(
        'flex min-h-[68px] w-full items-center gap-3 rounded-[18px] border border-line bg-surface py-3 pr-3 pl-3.5 text-left text-ink transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
        isFull ? 'cursor-not-allowed bg-sunken' : 'hover:border-primary',
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary-ink',
          isFull && 'opacity-55',
        )}
      >
        {gameType === 'buzzer' ? (
          <Zap className="h-5 w-5" />
        ) : (
          <Layers className="h-5 w-5" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn('truncate text-base font-bold', isFull && 'text-ink-2')}
        >
          {room.roomName}
        </span>
        <span className="flex items-center gap-1 text-[13px] text-ink-2">
          {room.password && <Lock aria-hidden className="h-3.5 w-3.5" />}
          {typeLabel}
          {room.password && ' · 有密碼'}
        </span>
      </div>
      {isFull ? (
        <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-danger-tint px-2.5 text-[13px] font-bold whitespace-nowrap text-danger-ink">
          <Users aria-hidden className="h-3.5 w-3.5" />
          已滿 {room.players.length}/{room.maxPlayers}
        </span>
      ) : (
        <>
          <span className="flex shrink-0 items-center gap-1 text-sm font-bold">
            <Users aria-hidden className="h-4 w-4 text-ink-2" />
            {room.players.length}/{room.maxPlayers}
          </span>
          <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-ink-2" />
        </>
      )}
    </button>
  );
}

export default function MultiplePlayPage() {
  const hardNavigate = useHardNavigate();
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
  const [createRoomName, setCreateRoomName] = useState('');
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
      hardNavigate(`/multiple-play/${selectedRoomId}`);
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

  const isSearching = searchedRoomName.trim() !== '';

  // 建立房間可帶入預填名稱；modal 以 key 重新掛載，用預填值初始化
  const openCreateRoom = (name: string) => {
    setCreateRoomName(name);
    setIsOpenCreateRoomModal(true);
  };

  const filteredRooms =
    gameTypeFilter === 'all'
      ? rooms
      : rooms.filter(r => r.settings.gameType === gameTypeFilter);

  // const FILTERS: { value: GameTypeFilter; label: string }[] = [
  //   { value: 'all', label: '全部' },
  //   { value: 'classic', label: '傳統' },
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
        key={createRoomName}
        defaultRoomName={createRoomName}
        roomId={roomId}
        isOpen={isOpenCreateRoomModal}
        onOpenChange={setIsOpenCreateRoomModal}
        onConfirm={(roomName, maxPlayers, password, gameType) => {
          joinRoom(
            playerName,
            roomId,
            roomName,
            maxPlayers,
            password,
            gameType,
          );
        }}
      />

      {/* Memphis 底圖 */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[url('/b2.webp')] bg-cover bg-center opacity-[0.20]"
      />

      {/* 頁面捲動容器 */}
      <div className="flex h-full flex-col overflow-y-auto">
        <header className="flex shrink-0 items-center gap-0.5 px-2 pt-2">
          <BackToHomeButton />
          <span className="flex-1" />
          <Button
            variant="ghost"
            className="h-11 w-11 px-0 font-bold text-ink md:w-auto md:gap-1.5 md:px-3"
            onClick={() => setIsOpenRuleModal(true)}
            aria-label="遊戲規則"
          >
            <BookOpen className="h-5 w-5" />
            <span className="hidden md:inline">遊戲規則</span>
          </Button>
          {/* 玩家暱稱 */}
          <button
            type="button"
            onClick={() => setIsOpenNameModal(true)}
            aria-label={`修改暱稱：${playerName}`}
            className="ml-1 flex h-11 max-w-40 items-center gap-2 rounded-full border border-line bg-surface pr-3 pl-1.5 text-sm font-bold text-ink transition-colors hover:border-line-strong"
          >
            <span
              aria-hidden
              className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-extrabold text-primary-foreground"
            >
              {Array.from(playerName.trim())[0]?.toUpperCase() ?? '?'}
            </span>
            <span className="truncate">{playerName}</span>
            <Pencil aria-hidden className="h-3.5 w-3.5 shrink-0 text-ink-2" />
          </button>
        </header>

        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col pb-10">
          <div className="flex flex-col gap-1.5 px-4 pt-2 pb-[18px] md:px-8">
            <h1 className="text-[28px] font-black tracking-tight text-ink">
              多人對戰
            </h1>
            <p className="text-[15px] text-ink-2">加入房間或建立你的專屬對局</p>
          </div>

          {/* 搜尋 + 建立 */}
          <div className="flex gap-2.5 px-4 md:px-8">
            <div className="relative min-w-0 flex-1 md:max-w-xs">
              <label htmlFor="room-search" className="sr-only">
                搜尋房間
              </label>
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-ink-2"
              />
              <Input
                id="room-search"
                placeholder="搜尋房間..."
                value={searchedRoomName}
                className="h-12 rounded-xl border-[1.5px] border-line-strong bg-surface pr-3 pl-[42px] text-base text-ink"
                onChange={e => setSearchedRoomName(e.target.value)}
              />
            </div>
            <Button
              variant="tactile"
              className="h-12 gap-1.5 px-4 text-[19px] shadow-[0_4px_0_0_var(--primary-edge)]"
              onClick={() => openCreateRoom('')}
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">建立房間</span>
              <span className="sm:hidden">建立</span>
            </Button>
          </div>

          {/* 房間計數 */}
          <div className="flex items-center justify-between px-4 pt-[18px] pb-2.5 md:px-8">
            <span className="text-sm font-bold text-ink-2">
              <span className="font-display text-base text-ink">
                {filteredRooms.length}
              </span>{' '}
              {isSearching ? '個房間符合' : '個房間'}
            </span>
          </div>

          {/* 房間列表 */}
          {filteredRooms.length > 0 ? (
            <div className="grid gap-2.5 px-4 sm:grid-cols-2 md:px-8 lg:grid-cols-3">
              {filteredRooms.map((room, i) => (
                <motion.div
                  key={room.roomId}
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.28,
                    delay: reduceMotion ? 0 : i * 0.04,
                    ease: [0.2, 0, 0, 1],
                  }}
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
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 pt-10 pb-20 text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-[20px] bg-primary-tint text-primary-ink">
                {isSearching ? (
                  <SearchX className="h-7 w-7" />
                ) : (
                  <Users className="h-7 w-7" />
                )}
              </div>
              <p className="text-xl font-extrabold text-ink">
                {isSearching
                  ? `找不到「${searchedRoomName.trim()}」`
                  : '目前沒有房間'}
              </p>
              <p className="text-[15px] text-ink-2">
                {isSearching
                  ? '換個關鍵字，或用這個名稱建立一個新房間'
                  : '建立房間，邀請朋友一起來玩吧！'}
              </p>
              <div className="mt-5 flex w-full max-w-sm flex-col gap-3">
                <Button
                  variant="tactile"
                  className="w-full gap-2"
                  onClick={() =>
                    openCreateRoom(isSearching ? searchedRoomName.trim() : '')
                  }
                >
                  <Plus className="h-5 w-5" />
                  {isSearching
                    ? `建立「${searchedRoomName.trim()}」`
                    : '建立第一個房間'}
                </Button>
                {isSearching && (
                  <Button
                    variant="tactileOutline"
                    className="w-full"
                    onClick={() => setSearchedRoomName('')}
                  >
                    清除搜尋
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
