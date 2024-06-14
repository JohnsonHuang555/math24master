'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ChatArea from '@/components/areas/chat-area';
import PlayersArea from '@/components/areas/players-area';
import RoomInfoArea from '@/components/areas/room-info-area';
import MainLayout from '@/components/layouts/main-layout';
import { PlayerNameModal } from '@/components/modals/player-name-modal';
import useMultiplePlay from '@/hooks/useMultiplePlay';
import { SocketEvent } from '@/models/SocketEvent';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [isOpenNameModal, setIsOpenNameModal] = useState(false);

  const {
    socket,
    joinRoom,
    roomInfo,
    playerId,
    onReadyGame,
    onStartGame,
    messages,
  } = useMultiplePlay();

  const currentPlayer = roomInfo?.players.find(p => p.id === playerId);

  useEffect(() => {
    const playerName = localStorage.getItem('playerName') || '';
    if (!playerName) {
      setIsOpenNameModal(true);
    }

    joinRoom(playerName, roomId);

    const handleBeforeUnload = (event: any) => {
      event.preventDefault();
      event.returnValue = '';
    };

    const handleUnload = () => {
      socket.disconnect();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [socket, joinRoom, roomId]);

  const sendMessage = (message: string) => {
    if (socket) {
      socket.emit(SocketEvent.SendMessage, { roomId, message });
    }
  };

  if (!roomInfo) {
    return null;
  }

  return (
    <MainLayout>
      <PlayerNameModal
        isOpen={isOpenNameModal}
        onOpenChange={value => setIsOpenNameModal(value)}
        onConfirm={value => {
          if (!value) return;
          localStorage.setItem('playerName', value);
          setIsOpenNameModal(false);
        }}
        closeDisabled={true}
      />
      <div className="flex h-full flex-col items-center justify-center">
        <div className="flex h-2/3 w-2/3 gap-4 bg-transparent">
          <PlayersArea
            players={roomInfo?.players}
            currentPlayer={currentPlayer}
            onReady={() => onReadyGame(roomId)}
            onStart={() => onStartGame(roomId)}
          />
          <div className="flex flex-[3] flex-col gap-4">
            <RoomInfoArea
              roomName={roomInfo?.roomName}
              password={roomInfo?.password}
              maxPlayers={roomInfo?.maxPlayers}
              onLeaveRoom={() => {
                window.location.href = '/multiple-play';
              }}
              onMaxPlayersChange={() => {}}
            />
            <ChatArea messages={messages} onSend={sendMessage} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
