'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import ChatArea from '@/components/areas/chat-area';
import BuzzerGameBoard from '@/components/areas/buzzer/buzzer-game-board';
import MultiplePlayingArea from '@/components/areas/multiple-playing-area';
import PlayersArea from '@/components/areas/players-area';
import RoomInfoArea from '@/components/areas/room-info-area';
import { BuzzerPlayProvider } from '@/providers/buzzer-play-provider';
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
import { GameStatus } from '@/models/GameStatus';
import { SocketEvent } from '@/models/SocketEvent';
import { useMultiplePlay } from '@/providers/multiple-play-provider';

export default function RoomPage() {
  const router = useRouter();
  const { roomId } = useParams<{ roomId: string }>();

  const [isOpenNameModal, setIsOpenNameModal] = useState(false);
  const [isOpenEditRoomModal, setIsOpenEditRoomModal] = useState(false);
  const [isOpenRemovePlayerModal, setIsOpenRemovePlayerModal] = useState(false);
  const [isOpenEnterRoomPasswordModal, setIsOpenEnterRoomPasswordModal] =
    useState(false);
  const [playerName, setPlayerName] = useState<string>('');
  const [removingPlayerId, setRemovingPlayerId] = useState<string>('');

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
    gameOverData,
    onCloseGameOver,
    gameAbortedData,
    clearGameAbortedData,
    connectionStatus,
  } = useMultiplePlay();

  useEffect(() => {
    const localStoragePlayerName = localStorage.getItem('playerName') || '';
    if (!localStoragePlayerName) {
      setIsOpenNameModal(true);
      return;
    }
    setPlayerName(localStoragePlayerName);
  }, []);

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
    };
  }, [joinRoom, playerName, roomId, socket]);

  useEffect(() => {
    if (playerId) {
      socket.on(SocketEvent.RemovePlayerResponse, (removedPlayerId: string) => {
        if (removedPlayerId === playerId) {
          toast.info('你已被踢出房間');
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
              toast.error('發生錯誤，請稍後再試');
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
              alt="24點大師"
              width={100}
              height={30}
              className="h-8 w-auto dark:invert"
              priority
            />
          </div>

          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="font-display text-xl font-black text-foreground">
              連線中...
            </p>
            <p className="max-w-xs text-sm text-muted-foreground">
              如果等待時間過長，請嘗試重新整理頁面
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="gap-2 rounded-2xl border border-zinc-200 px-5 font-bold dark:border-zinc-700"
              onClick={() => (window.location.href = '/')}
            >
              <ArrowLeft className="h-4 w-4" />
              回首頁
            </Button>
            <Button
              variant="ghost"
              className="gap-2 rounded-2xl border border-zinc-200 px-5 font-bold dark:border-zinc-700"
              onClick={() => (window.location.href = '/multiple-play')}
            >
              回房間列表
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
              <DialogTitle className="text-center text-xl">遊戲中斷</DialogTitle>
            </DialogHeader>
            <p className="text-center text-sm text-muted-foreground">
              由於{' '}
              <span className="font-semibold">{gameAbortedData.playerName}</span>{' '}
              離開，遊戲已中斷
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  sessionStorage.removeItem('reconnectToken');
                  sessionStorage.removeItem('reconnectRoomId');
                  window.location.href = '/multiple-play';
                }}
                className="flex-1"
                variant="secondary"
              >
                回房間列表
              </Button>
              <Button
                onClick={clearGameAbortedData}
                className="flex-1 rounded-2xl bg-primary font-bold text-white shadow-[0_4px_0_0_hsl(175_84%_22%)] active:translate-y-1 active:shadow-none dark:shadow-[0_4px_0_0_hsl(173_66%_28%)]"
              >
                關閉視窗
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

          {/* 等待大廳主體 */}
          <div className="flex flex-1 items-center justify-center overflow-hidden px-4 py-6 md:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="flex h-full w-full max-w-5xl flex-col gap-4 md:flex-row"
            >
              {/* 左欄：玩家列表 */}
              <div className="w-full md:w-[300px] md:shrink-0">
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
                    (roomInfo.settings.gameType === 'rummy' ||
                      roomInfo.settings.gameType === 'buzzer') &&
                    roomInfo.players.length < roomInfo.maxPlayers
                  }
                />
              </div>

              {/* 右欄：房間設定 + 聊天 */}
              <div className="flex min-h-0 flex-1 flex-col gap-4">
                <div className="flex-3 overflow-y-auto">
                  <RoomInfoArea
                    isMaster={currentPlayer?.isMaster}
                    roomName={roomInfo.roomName}
                    password={roomInfo.password}
                    maxPlayers={roomInfo.maxPlayers}
                    roomSettings={roomInfo.settings}
                    playersCount={roomInfo.players.length}
                    onLeaveRoom={() => {
                      sessionStorage.removeItem('reconnectToken');
                      sessionStorage.removeItem('reconnectRoomId');
                      window.location.href = '/multiple-play';
                    }}
                    onRoomSettingsChange={editRoomSettings}
                    onEditRoomName={() => setIsOpenEditRoomModal(true)}
                  />
                </div>
                <ChatArea
                  messages={messages}
                  onSend={sendMessage}
                  currentPlayerName={currentPlayer?.name}
                />
              </div>
            </motion.div>
          </div>
        </main>
      )}
    </>
  );
}
