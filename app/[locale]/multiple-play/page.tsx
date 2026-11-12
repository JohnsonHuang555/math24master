'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import {
  BookOpen,
  ChevronRight,
  Layers,
  LoaderCircle,
  Lock,
  Pencil,
  Plus,
  Search,
  SearchX,
  Users,
  Zap,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { BackToHomeButton } from '@/components/back-to-home-button';
import AlertDialogModal from '@/components/modals/alert-dialog-modal';
import CreateRoomModal from '@/components/modals/create-room-modal';
import { PlayerNameModal } from '@/components/modals/player-name-modal';
import { RuleModal } from '@/components/modals/rule-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useHardNavigate, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { QUICK_MATCH } from '@/models/Room';
import { Room } from '@/models/Room';
import { SocketEvent } from '@/models/SocketEvent';
import { useAlertDialogStore } from '@/providers/alert-dialog-store-provider';
import { useMultiplePlay } from '@/providers/multiple-play-provider';
import { useGuestStore } from '@/stores/guest-store';

const RELOAD_ROOMS_TIMER = 1000;
const roomId = uuidv4();

type GameTypeFilter = 'all' | 'classic' | 'buzzer';

function RoomCard({ room, onClick }: { room: Room; onClick: () => void }) {
  const t = useTranslations('Multiplayer.lobby');
  const isFull = room.players.length >= room.maxPlayers;
  const gameType = room.settings.gameType;

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
          {t(`gameTypes.${gameType}`)}
          {room.password && ` · ${t('hasPassword')}`}
        </span>
      </div>
      {isFull ? (
        <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-danger-tint px-2.5 text-[13px] font-bold whitespace-nowrap text-danger-ink">
          <Users aria-hidden className="h-3.5 w-3.5" />
          {t('full', { count: room.players.length, max: room.maxPlayers })}
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

/** 房間數：手機在列表上方，桌機在搜尋列右側 */
function RoomCount({
  count,
  isSearching,
  className,
}: {
  count: number;
  isSearching: boolean;
  className?: string;
}) {
  const t = useTranslations('Multiplayer.lobby');
  return (
    <span className={cn('text-sm font-bold text-ink-2', className)}>
      {t.rich(isSearching ? 'matchCount' : 'roomCount', {
        count,
        n: chunks => (
          <span className="font-display text-base text-ink lg:text-lg">
            {chunks}
          </span>
        ),
      })}
    </span>
  );
}

export default function MultiplePlayPage() {
  const hardNavigate = useHardNavigate();
  const reduceMotion = useReducedMotion();

  const [rooms, setRooms] = useState<Room[]>([]);
  const router = useRouter();
  const { searchRooms, joinRoom, socket, quickMatch } = useMultiplePlay();
  const t = useTranslations('Multiplayer');
  const tLobby = useTranslations('Multiplayer.lobby');
  const tHome = useTranslations('Home');
  const tError = useTranslations('ServerError');
  const [isMatching, setIsMatching] = useState(false);
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
        // 房間頁看到同一間房的 token 就不會重複加入（快速配對由 server 直接分配房間）
        sessionStorage.setItem('reconnectRoomId', room.roomId);
        router.push(`/multiple-play/${room.roomId}`);
      } else {
        toast.error(tLobby('createFailed'));
      }
    });
  }, [router, socket, searchRooms, tLobby]);

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

  const handleQuickMatch = () => {
    if (!playerName) {
      setIsOpenNameModal(true);
      return;
    }
    setIsMatching(true);
    quickMatch(playerName);
  };

  // 建立房間可帶入預填名稱；modal 以 key 重新掛載，用預填值初始化
  const openCreateRoom = (name: string) => {
    setCreateRoomName(name);
    setIsOpenCreateRoomModal(true);
  };

  const filteredRooms =
    gameTypeFilter === 'all'
      ? rooms
      : rooms.filter(r => r.settings.gameType === gameTypeFilter);

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
        {/* 手機：回首頁＋工具；桌機：整條頂部列，logo 回首頁 */}
        <header className="flex shrink-0 items-center gap-0.5 px-2 pt-2 lg:h-16 lg:gap-1 lg:border-b lg:border-line lg:bg-surface/75 lg:px-10 lg:pt-0">
          <BackToHomeButton className="lg:hidden" />
          <Link href="/" className="mr-auto hidden rounded-xl lg:block">
            <Image
              src="/logo.webp"
              alt={tHome('logoAlt')}
              width={100}
              height={30}
              className="h-7 w-auto"
            />
          </Link>
          <span className="flex-1 lg:hidden" />
          <Button
            variant="ghost"
            className="h-11 w-11 px-0 font-bold text-ink md:w-auto md:gap-1.5 md:px-3"
            onClick={() => setIsOpenRuleModal(true)}
            aria-label={tLobby('rules')}
          >
            <BookOpen className="h-5 w-5" />
            <span className="hidden md:inline">{tLobby('rules')}</span>
          </Button>
          {/* 玩家暱稱 */}
          <button
            type="button"
            onClick={() => setIsOpenNameModal(true)}
            aria-label={tLobby('editName', { name: playerName })}
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

        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col pb-10 lg:max-w-[1120px]">
          <div className="flex items-end gap-4 px-4 pt-2 pb-[18px] md:px-8 lg:px-10 lg:pt-9 lg:pb-[22px]">
            <BackToHomeButton className="hidden border border-line bg-surface lg:flex" />
            <div className="flex flex-1 flex-col gap-1.5 lg:gap-1">
              <h1 className="text-[28px] font-black tracking-tight text-ink lg:text-4xl">
                {t('title')}
              </h1>
              <p className="text-[15px] text-ink-2 lg:text-base">
                {t('subtitle')}
              </p>
            </div>
          </div>

          {/* 快速開始與私人房間：多人模式的主要入口 */}
          <div className="grid gap-3 px-4 pb-6 md:px-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-4 lg:px-10 lg:pb-8">
            <section className="flex flex-col gap-3.5 rounded-[22px] border-2 border-primary bg-surface p-[18px] shadow-[0_4px_0_0_var(--primary-edge)] lg:p-6">
              <div className="flex items-start gap-3.5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-primary text-primary-foreground">
                  <Zap aria-hidden className="h-6 w-6" />
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <h2 className="text-xl font-extrabold text-ink lg:text-2xl">
                    {t('quickMatch.title')}
                  </h2>
                  <p className="text-sm text-ink-2 lg:text-[15px]">
                    {t('quickMatch.description', {
                      seconds: QUICK_MATCH.waitSeconds,
                    })}
                  </p>
                </div>
              </div>
              <Button
                variant="tactile"
                className="w-full gap-2"
                onClick={handleQuickMatch}
                disabled={isMatching}
              >
                {isMatching ? (
                  <LoaderCircle
                    aria-hidden
                    className="h-5 w-5 animate-spin motion-reduce:animate-none"
                  />
                ) : (
                  <Zap aria-hidden className="h-5 w-5" />
                )}
                {t('quickMatch.action')}
              </Button>
            </section>
            <button
              type="button"
              onClick={() => openCreateRoom('')}
              className="group flex items-center gap-3.5 rounded-[22px] border border-line bg-surface p-[18px] text-left transition-colors hover:border-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus lg:p-6"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-primary-tint text-primary-ink">
                <Plus aria-hidden className="h-6 w-6" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <strong className="text-lg text-ink">
                  {t('privateRoom.title')}
                </strong>
                <span className="text-sm text-ink-2">
                  {t('privateRoom.description')}
                </span>
              </span>
              <ChevronRight
                aria-hidden
                className="h-5 w-5 shrink-0 text-ink-2 group-hover:text-primary-ink"
              />
            </button>
          </div>

          {/* 公開房間：沒有房間時整塊不顯示，避免一進來就看到空大廳 */}
          {(rooms.length > 0 || isSearching) && (
            <>
              <h2 className="px-4 pb-2.5 text-base font-extrabold text-ink md:px-8 lg:px-10">
                {t('openRooms')}
              </h2>
              {/* 搜尋 */}
              <div className="flex items-center gap-2.5 px-4 md:px-8 lg:gap-3 lg:px-10">
                <div className="relative min-w-0 flex-1 md:max-w-xs lg:w-[380px] lg:max-w-none lg:flex-none">
                  <label htmlFor="room-search" className="sr-only">
                    {tLobby('searchLabel')}
                  </label>
                  <Search
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-ink-2"
                  />
                  <Input
                    id="room-search"
                    placeholder={tLobby('searchPlaceholder')}
                    value={searchedRoomName}
                    className="h-12 rounded-xl border-[1.5px] border-line-strong bg-surface pr-3 pl-[42px] text-base text-ink"
                    onChange={e => setSearchedRoomName(e.target.value)}
                  />
                </div>

                <RoomCount
                  className="ml-auto hidden lg:inline"
                  count={filteredRooms.length}
                  isSearching={isSearching}
                />
              </div>

              {/* 房間計數（手機） */}
              <div className="flex items-center justify-between px-4 pt-[18px] pb-2.5 md:px-8 lg:hidden">
                <RoomCount
                  count={filteredRooms.length}
                  isSearching={isSearching}
                />
              </div>

              {/* 房間列表 */}
              {filteredRooms.length > 0 ? (
                <div className="grid gap-2.5 px-4 sm:grid-cols-2 md:px-8 lg:gap-3.5 lg:px-10 lg:pt-[22px]">
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
                            toast.info(tError('ROOM_FULL'));
                            return;
                          }
                          setSelectedRoomId(room.roomId);
                          onOpen({
                            title: tLobby('joinTitle'),
                            description: tLobby('joinDescription', {
                              name: room.roomName ?? '',
                            }),
                          });
                        }}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : isSearching ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 pt-10 pb-20 text-center">
                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-[20px] bg-primary-tint text-primary-ink">
                    <SearchX className="h-7 w-7" />
                  </div>
                  <p className="text-xl font-extrabold break-words text-ink">
                    {tLobby('notFound', { query: searchedRoomName.trim() })}
                  </p>
                  <p className="text-[15px] text-ink-2">
                    {tLobby('notFoundHint')}
                  </p>
                  <div className="mt-5 flex w-full max-w-sm flex-col gap-3">
                    <Button
                      variant="tactile"
                      className="w-full gap-2"
                      onClick={() => openCreateRoom(searchedRoomName.trim())}
                    >
                      <Plus className="h-5 w-5 shrink-0" />
                      <span className="truncate">
                        {tLobby('createNamed', {
                          name: searchedRoomName.trim(),
                        })}
                      </span>
                    </Button>
                    <Button
                      variant="tactileOutline"
                      className="w-full"
                      onClick={() => setSearchedRoomName('')}
                    >
                      {tLobby('clearSearch')}
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
