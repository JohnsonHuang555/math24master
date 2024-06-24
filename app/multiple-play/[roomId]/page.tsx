'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useParams, useRouter } from 'next/navigation';
import type { Metadata } from 'next';
import ChatArea from '@/components/areas/chat-area';
import MultiplePlayingArea from '@/components/areas/multiple-playing-area';
import PlayersArea from '@/components/areas/players-area';
import RoomInfoArea from '@/components/areas/room-info-area';
import MainLayout from '@/components/layouts/main-layout';
import EditRoomModal from '@/components/modals/edit-room-modal';
import EnterRoomPasswordModal from '@/components/modals/enter-room-password-modal';
import { PlayerNameModal } from '@/components/modals/player-name-modal';
import RemoveRoomPlayerModal from '@/components/modals/remove-room-player-modal';
import { GameStatus } from '@/models/GameStatus';
import { SocketEvent } from '@/models/SocketEvent';
import { useMultiplePlay } from '@/providers/multiple-play-provider';

// export function generateMetadata({
//   params,
// }: {
//   params: { roomId: string },
// }): Metadata {
//   return {
//     alternates: {
//       canonical: `https://linkorchard.com/${params.roomId}`,
//     },
//   };
// }

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
  const [showCloseGamePlayingBtn, setShowCloseGamePlayingBtn] = useState(true);
  const [showGamePlayingScreen, setShowGamePlayingScreen] = useState(false);

  const {
    socket,
    joinRoom,
    roomInfo,
    playerId,
    onReadyGame,
    onStartGame,
    messages,
    editRoom,
    editMaxPlayers,
    removePlayer,
    currentPlayer,
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
      joinRoom(playerName, roomId);

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

  useEffect(() => {
    // 監聽遊戲是否結束要顯示關閉遊玩視窗按鈕
    if (roomInfo?.status === GameStatus.Idle) {
      setShowCloseGamePlayingBtn(true);
    } else if (roomInfo?.status === GameStatus.Playing) {
      setShowGamePlayingScreen(true);
      setShowCloseGamePlayingBtn(false);
    }
  }, [roomInfo?.status]);

  const sendMessage = (message: string) => {
    if (socket) {
      socket.emit(SocketEvent.SendMessage, { roomId, message });
    }
  };

  if (!roomInfo) {
    return (
      <div className="flex h-full items-center justify-center">
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
        <div className="text-xl">連線中，如果時長過久請重新整理頁面</div>
      </div>
    );
  }

  if (roomInfo?.status === GameStatus.Playing && showGamePlayingScreen) {
    return (
      <MultiplePlayingArea
        showCloseGamePlayingBtn={showCloseGamePlayingBtn}
        onCloseScreen={() => {
          setShowGamePlayingScreen(false);
          setShowCloseGamePlayingBtn(false);
        }}
      />
    );
  }

  return (
    <MainLayout>
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
      <div className="flex h-full flex-col items-center justify-center">
        <div className="flex h-2/3 w-2/3 gap-4 bg-transparent">
          <PlayersArea
            players={roomInfo?.players}
            currentPlayer={currentPlayer}
            onReady={onReadyGame}
            onStart={onStartGame}
            onRemovePlayer={playerId => {
              setRemovingPlayerId(playerId);
              setIsOpenRemovePlayerModal(true);
            }}
          />
          <div className="flex flex-[3] flex-col gap-4">
            <RoomInfoArea
              isMaster={currentPlayer?.isMaster}
              roomName={roomInfo?.roomName}
              password={roomInfo?.password}
              maxPlayers={roomInfo?.maxPlayers}
              onLeaveRoom={() => {
                window.location.href = '/multiple-play';
              }}
              onMaxPlayersChange={editMaxPlayers}
              onEditRoomName={() => setIsOpenEditRoomModal(true)}
            />
            <ChatArea messages={messages} onSend={sendMessage} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
