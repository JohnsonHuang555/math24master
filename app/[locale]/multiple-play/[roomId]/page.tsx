'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, Lock, Pencil, RefreshCw } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import BuzzerGameBoard from '@/components/areas/buzzer/buzzer-game-board';
import ChatArea from '@/components/areas/chat-area';
import MultiplePlayingArea from '@/components/areas/multiple-playing-area';
import PlayersArea, {
  WaitingRoomAction,
} from '@/components/areas/players-area';
import {
  InviteFriendsButton,
  QuickMatchAction,
} from '@/components/areas/quick-match-panel';
import RoomInfoArea from '@/components/areas/room-info-area';
import AlertDialogModal from '@/components/modals/alert-dialog-modal';
import EditRoomModal from '@/components/modals/edit-room-modal';
import EnterRoomPasswordModal from '@/components/modals/enter-room-password-modal';
import { GameOverModal } from '@/components/modals/game-over-modal';
import { PlayerNameModal } from '@/components/modals/player-name-modal';
import { ReconnectOverlay } from '@/components/modals/reconnect-overlay';
import RemoveRoomPlayerModal from '@/components/modals/remove-room-player-modal';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePlayerName } from '@/hooks/usePlayerName';
import { useHardNavigate, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { GameStatus } from '@/models/GameStatus';
import { SystemMessageCode } from '@/models/Message';
import { SocketEvent } from '@/models/SocketEvent';
import { BuzzerPlayProvider } from '@/providers/buzzer-play-provider';
import { useMultiplePlay } from '@/providers/multiple-play-provider';
import { useGuestStore } from '@/stores/guest-store';

type WaitingTab = 'players' | 'settings' | 'chat';

const WAITING_TABS: WaitingTab[] = ['players', 'settings', 'chat'];

export default function RoomPage() {
  const hardNavigate = useHardNavigate();
  const router = useRouter();
  const { roomId } = useParams<{ roomId: string }>();

  const [isOpenNameModal, setIsOpenNameModal] = useState(false);
  const [isOpenEditRoomModal, setIsOpenEditRoomModal] = useState(false);
  const [isOpenRemovePlayerModal, setIsOpenRemovePlayerModal] = useState(false);
  const [isOpenEnterRoomPasswordModal, setIsOpenEnterRoomPasswordModal] =
    useState(false);
  const [playerName, setPlayerName] = useState<string>('');
  const [removingPlayerId, setRemovingPlayerId] = useState<string>('');
  const [waitingTab, setWaitingTab] = useState<WaitingTab>('players');
  const reduceMotion = useReducedMotion();
  const t = useTranslations('Multiplayer.room');
  const tLobby = useTranslations('Multiplayer.lobby');
  const tHome = useTranslations('Home');
  const tError = useTranslations('ServerError');
  const playerDisplayName = usePlayerName();

  const {
    socket,
    joinRoom,
    roomInfo,
    playerId,
    onReadyGame,
    onStartGame,
    messages,
    editRoom,
    editRoomSettings,
    removePlayer,
    currentPlayer,
    sendMessage,
    addBot,
    quickMatchSecondsLeft,
    startQuickMatchNow,
    gameOverData,
    onCloseGameOver,
    gameAbortedData,
    clearGameAbortedData,
    connectionStatus,
  } = useMultiplePlay();

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
    const handleBeforeUnload = (event: any) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const handleUnload = () => {
      socket.disconnect();
    };
    if (playerName) {
      const storedToken = sessionStorage.getItem('reconnectToken');
      const storedRoomId = sessionStorage.getItem('reconnectRoomId');
      if (!storedToken || storedRoomId !== roomId) {
        joinRoom(playerName, roomId);
      }
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('unload', handleUnload);
    }
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
      // SPA 導頁（例如按瀏覽器上一頁）：主動通知 server 離開，避免幽靈玩家殘留
      if (playerName) {
        socket.emit(SocketEvent.LeaveRoom);
        sessionStorage.removeItem('reconnectToken');
        sessionStorage.removeItem('reconnectRoomId');
      }
    };
  }, [joinRoom, playerName, roomId, socket]);

  useEffect(() => {
    if (playerId) {
      socket.on(SocketEvent.RemovePlayerResponse, (removedPlayerId: string) => {
        if (removedPlayerId === playerId) {
          toast.info(t('kicked'));
          router.push('/multiple-play');
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, playerId]);

  useEffect(() => {
    socket.on(SocketEvent.NeedRoomPassword, () => {
      setIsOpenEnterRoomPasswordModal(true);
    });
  }, [socket, joinRoom]);

  const tQuickMatch = useTranslations('Multiplayer.quickMatch');
  // 快速配對的房間沒有房名，顯示「快速配對」
  const roomDisplayName =
    roomInfo?.roomName ??
    (roomInfo?.isQuickMatch ? tQuickMatch('roomName') : '');
  const quickMatchProps = roomInfo?.quickMatchPending
    ? { secondsLeft: quickMatchSecondsLeft, onStartNow: startQuickMatchNow }
    : undefined;

  const leaveRoom = () => {
    sessionStorage.removeItem('reconnectToken');
    sessionStorage.removeItem('reconnectRoomId');
    hardNavigate('/multiple-play');
  };

  // 最新一則系統訊息是開始倒數時，手機底部也顯示秒數（聊天分頁不一定開著）
  const lastSystemMessage = [...messages].reverse().find(m => m.isSystem);
  const countdownSeconds =
    lastSystemMessage?.isSystem &&
    lastSystemMessage.code === SystemMessageCode.GameStartsIn
      ? Number(lastSystemMessage.params?.seconds)
      : null;

  if (!roomInfo) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        {/* Memphis 底圖 */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-[url('/b2.webp')] bg-cover bg-center opacity-[0.20]"
        />
        <PlayerNameModal
          isOpen={isOpenNameModal}
          onOpenChange={value => setIsOpenNameModal(value)}
          onConfirm={value => {
            if (!value) return;
            localStorage.setItem('playerName', value);
            setPlayerName(value);
            setIsOpenNameModal(false);
          }}
          closeDisabled={true}
        />
        <EnterRoomPasswordModal
          isOpen={isOpenEnterRoomPasswordModal}
          onOpenChange={setIsOpenEnterRoomPasswordModal}
          onSubmit={password => {
            if (!roomId) {
              toast.error(tError('UNEXPECTED'));
              return;
            }
            joinRoom(playerName, roomId, undefined, undefined, password);
          }}
          closeDisabled={true}
        />

        {/* 連線中畫面 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-6 px-4 text-center"
        >
          <div className="relative">
            <Image
              src="/logo.webp"
              alt={tHome('logoAlt')}
              width={100}
              height={30}
              className="h-8 w-auto dark:invert"
              priority
            />
          </div>

          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="font-display text-xl font-black text-foreground">
              {t('connecting')}
            </p>
            <p className="max-w-xs text-sm text-muted-foreground">
              {t('connectingHint')}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="gap-2 rounded-2xl border border-zinc-200 px-5 font-bold dark:border-zinc-700"
              onClick={() => hardNavigate('/')}
            >
              <ArrowLeft className="h-4 w-4" />
              {t('backHome')}
            </Button>
            <Button
              variant="ghost"
              className="gap-2 rounded-2xl border border-zinc-200 px-5 font-bold dark:border-zinc-700"
              onClick={() => hardNavigate('/multiple-play')}
            >
              {t('backToLobby')}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <ReconnectOverlay
        status={connectionStatus}
        onLeave={() => {
          sessionStorage.removeItem('reconnectToken');
          sessionStorage.removeItem('reconnectRoomId');
          router.push('/multiple-play');
        }}
      />
      {gameOverData && (
        <GameOverModal
          isOpen={!!gameOverData}
          onClose={onCloseGameOver}
          players={gameOverData.players}
          currentPlayerId={playerId}
          isPenaltyGameOver={gameOverData.isPenaltyGameOver}
          isMultiplePlay
          onPlayAgain={onCloseGameOver}
          onGoHome={onCloseGameOver}
        />
      )}
      {gameAbortedData && (
        <Dialog open>
          <DialogContent
            className="sm:max-w-sm"
            onPointerDownOutside={e => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="text-center text-xl">
                {t('aborted.title')}
              </DialogTitle>
            </DialogHeader>
            <p className="text-center text-sm text-muted-foreground">
              {t.rich('aborted.description', {
                name: playerDisplayName(gameAbortedData.playerName),
                b: chunks => <span className="font-semibold">{chunks}</span>,
              })}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  sessionStorage.removeItem('reconnectToken');
                  sessionStorage.removeItem('reconnectRoomId');
                  hardNavigate('/multiple-play');
                }}
                className="flex-1"
                variant="secondary"
              >
                {t('backToLobby')}
              </Button>
              <Button
                onClick={clearGameAbortedData}
                className="flex-1 rounded-2xl bg-primary font-bold text-white shadow-[0_4px_0_0_hsl(175_84%_22%)] active:translate-y-1 active:shadow-none dark:shadow-[0_4px_0_0_hsl(173_66%_28%)]"
              >
                {t('aborted.close')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {roomInfo.status === GameStatus.Playing ? (
        roomInfo.settings.gameType === 'buzzer' ? (
          <BuzzerPlayProvider>
            <BuzzerGameBoard roomId={roomId} />
          </BuzzerPlayProvider>
        ) : (
          <MultiplePlayingArea />
        )
      ) : (
        <main className="flex h-full flex-col">
          <AlertDialogModal />

          {/* Memphis 底圖 */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 -z-10 bg-[url('/b2.webp')] bg-cover bg-center opacity-[0.20]"
          />

          <PlayerNameModal
            isOpen={isOpenNameModal}
            onOpenChange={value => setIsOpenNameModal(value)}
            onConfirm={value => {
              if (!value) return;
              localStorage.setItem('playerName', value);
              setPlayerName(value);
              setIsOpenNameModal(false);
            }}
            closeDisabled={true}
          />
          <EditRoomModal
            roomName={roomInfo.roomName || ''}
            password={roomInfo.password}
            onSubmit={(roomName, password) => {
              editRoom(roomName, password);
              setIsOpenEditRoomModal(false);
            }}
            isOpen={isOpenEditRoomModal}
            onOpenChange={value => setIsOpenEditRoomModal(value)}
          />
          <RemoveRoomPlayerModal
            isOpen={isOpenRemovePlayerModal}
            onOpenChange={value => setIsOpenRemovePlayerModal(value)}
            onSubmit={() => {
              if (removingPlayerId) {
                removePlayer(removingPlayerId);
                setIsOpenRemovePlayerModal(false);
                setRemovingPlayerId('');
              }
            }}
          />

          {/* 手機頂部列：離開、房名、編輯；桌機由右欄的房間設定負責 */}
          <header className="flex items-center gap-1 px-2 pt-2 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0 text-ink"
              onClick={leaveRoom}
              aria-label={t('leave')}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex min-w-0 flex-1 flex-col">
              <strong className="flex items-center gap-1 truncate text-[17px] text-ink">
                {roomInfo.password && (
                  <Lock
                    aria-label={tLobby('hasPassword')}
                    className="h-4 w-4 shrink-0 text-ink-2"
                  />
                )}
                <span className="truncate">{roomDisplayName}</span>
              </strong>
              <span className="text-xs text-ink-2">
                {t('summary', {
                  gameType: tLobby(`gameTypes.${roomInfo.settings.gameType}`),
                  count: roomInfo.maxPlayers,
                })}
              </span>
            </div>
            {currentPlayer?.isMaster && !roomInfo.isQuickMatch && (
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 shrink-0 text-ink"
                onClick={() => setIsOpenEditRoomModal(true)}
                aria-label={t('edit')}
              >
                <Pencil className="h-5 w-5" />
              </Button>
            )}
          </header>

          {/* 手機分頁：玩家／設定／聊天 */}
          <div
            role="tablist"
            aria-label={t('waitingRoom')}
            className="mx-4 mt-2 flex gap-1 rounded-[14px] border border-line bg-sunken p-1 md:hidden"
          >
            {WAITING_TABS.map(tab => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={waitingTab === tab}
                onClick={() => setWaitingTab(tab)}
                className={cn(
                  'flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] text-sm font-bold',
                  waitingTab === tab
                    ? 'bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong)]'
                    : 'text-ink-2',
                )}
              >
                {t(`tabs.${tab}`)}
                {tab === 'players' && (
                  <span className="rounded-full bg-sunken px-1.5 font-display text-xs text-ink">
                    {roomInfo.players.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 等待大廳主體：手機依分頁顯示一塊，桌機左欄玩家、右欄設定與聊天 */}
          <div className="flex min-h-0 flex-1 justify-center overflow-y-auto px-4 pt-3.5 md:items-center md:overflow-hidden md:px-8 md:py-6">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="flex w-full max-w-5xl flex-col gap-4 md:h-full md:flex-row"
            >
              <div
                className={cn(
                  'w-full md:block md:w-[300px] md:shrink-0',
                  waitingTab !== 'players' && 'max-md:hidden',
                )}
              >
                <PlayersArea
                  players={roomInfo?.players}
                  currentPlayer={currentPlayer}
                  onReady={onReadyGame}
                  onStart={onStartGame}
                  onRemovePlayer={playerId => {
                    setRemovingPlayerId(playerId);
                    setIsOpenRemovePlayerModal(true);
                  }}
                  onAddBot={addBot}
                  canAddBot={
                    !!currentPlayer?.isMaster &&
                    !roomInfo.quickMatchPending &&
                    roomInfo.settings.gameType === 'buzzer' &&
                    roomInfo.players.length < roomInfo.maxPlayers
                  }
                  quickMatch={quickMatchProps}
                />
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-4">
                <div
                  className={cn(
                    'md:block md:min-h-0 md:flex-1 md:overflow-y-auto',
                    waitingTab !== 'settings' && 'max-md:hidden',
                  )}
                >
                  <RoomInfoArea
                    // 配對倒數中不開放改設定，開局後才和一般房間一樣
                    isMaster={
                      currentPlayer?.isMaster && !roomInfo.quickMatchPending
                    }
                    roomName={roomDisplayName}
                    password={roomInfo.password}
                    maxPlayers={roomInfo.maxPlayers}
                    roomSettings={roomInfo.settings}
                    playersCount={roomInfo.players.length}
                    onLeaveRoom={leaveRoom}
                    onRoomSettingsChange={editRoomSettings}
                    onEditRoomName={() => setIsOpenEditRoomModal(true)}
                  />
                </div>
                <ChatArea
                  className={cn(
                    'md:h-[260px] md:flex-none',
                    waitingTab !== 'chat' && 'max-md:hidden',
                  )}
                  messages={messages}
                  onSend={sendMessage}
                  currentPlayerName={currentPlayer?.name}
                />
              </div>
            </motion.div>
          </div>

          {/* 手機底部：狀態與主要按鈕，切到任何分頁都看得到 */}
          <div className="flex flex-col gap-2.5 px-4 pt-3 pb-6 md:hidden">
            {quickMatchProps ? (
              <QuickMatchAction {...quickMatchProps} />
            ) : (
              <WaitingRoomAction
                players={roomInfo.players}
                currentPlayer={currentPlayer}
                onReady={onReadyGame}
                onStart={onStartGame}
                notice={
                  countdownSeconds !== null && (
                    <span className="flex items-center gap-2 text-ink">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber font-display text-base font-extrabold text-on-amber">
                        {countdownSeconds}
                      </span>
                      {t('startingSoon')}
                    </span>
                  )
                }
              />
            )}
            <InviteFriendsButton />
          </div>
        </main>
      )}
    </>
  );
}
