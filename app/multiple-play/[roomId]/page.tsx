'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useParams, useRouter } from 'next/navigation';
import ChatArea from '@/components/areas/chat-area';
import PlayersArea from '@/components/areas/players-area';
import MultiplePlayingArea from '@/components/areas/playing/multiple-playing-area';
import RoomInfoArea from '@/components/areas/room-info-area';
import MainLayout from '@/components/layouts/main-layout';
import EditRoomNameModal from '@/components/modals/edit-room-name-modal';
import { PlayerNameModal } from '@/components/modals/player-name-modal';
import RemoveRoomPlayerModal from '@/components/modals/remove-room-player-modal';
import useMultiplePlay from '@/hooks/useMultiplePlay';
import { GameStatus } from '@/models/GameStatus';
import { SocketEvent } from '@/models/SocketEvent';

export default function RoomPage() {
  const router = useRouter();

  const { roomId } = useParams<{ roomId: string }>();
  const [isOpenNameModal, setIsOpenNameModal] = useState(false);
  const [isOpenEditRoomNameModal, setIsOpenEditRoomNameModal] = useState(false);
  const [isOpenRemovePlayerModal, setIsOpenRemovePlayerModal] = useState(false);

  const [removingPlayerId, setRemovingPlayerId] = useState<string>('');

  const {
    socket,
    joinRoom,
    roomInfo,
    playerId,
    onReadyGame,
    onStartGame,
    messages,
    editRoomName,
    editMaxPlayers,
    removePlayer,
    isGameOver,
    checkAnswerCorrect,
    isAnimationFinished,
    onFinishedAnimations,
    updateScore,
    selectedCardSymbols,
    selectedCardNumbers,
    onSelectCardOrSymbol,
    discardCard,
    playCard,
    onReselect,
    onSort,
    drawCard,
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

  useEffect(() => {
    socket.on(SocketEvent.RemovePlayerResponse, (removedPlayerId: string) => {
      if (removedPlayerId === playerId) {
        toast.info('你已被踢出房間');
        router.push('/multiple-play');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const sendMessage = (message: string) => {
    if (socket) {
      socket.emit(SocketEvent.SendMessage, { roomId, message });
    }
  };

  if (!roomInfo) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-xl">連線中，如時常過久請重新整理頁面</div>
      </div>
    );
  }

  if (roomInfo.status === GameStatus.Playing) {
    return (
      <MultiplePlayingArea
        isGameOver={isGameOver}
        roomInfo={roomInfo}
        checkAnswerCorrect={checkAnswerCorrect}
        isAnimationFinished={isAnimationFinished}
        onFinishedAnimations={onFinishedAnimations}
        updateScore={updateScore}
        selectedCardSymbols={selectedCardSymbols}
        selectedCardNumbers={selectedCardNumbers}
        onSelectCardOrSymbol={onSelectCardOrSymbol}
        discardCard={discardCard}
        playCard={playCard}
        onReselect={onReselect}
        onSort={onSort}
        drawCard={drawCard}
        currentPlayer={currentPlayer}
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
          setIsOpenNameModal(false);
        }}
        closeDisabled={true}
      />
      <EditRoomNameModal
        roomName={roomInfo.roomName}
        onSubmit={roomName => {
          editRoomName(roomId, roomName);
          setIsOpenEditRoomNameModal(false);
        }}
        isOpen={isOpenEditRoomNameModal}
        onOpenChange={value => setIsOpenEditRoomNameModal(value)}
      />
      <RemoveRoomPlayerModal
        isOpen={isOpenRemovePlayerModal}
        onOpenChange={value => setIsOpenRemovePlayerModal(value)}
        onSubmit={() => {
          if (removingPlayerId) {
            removePlayer(roomId, removingPlayerId);
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
            onReady={() => onReadyGame(roomId)}
            onStart={() => onStartGame(roomId)}
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
              onMaxPlayersChange={maxPlayers =>
                editMaxPlayers(roomId, maxPlayers)
              }
              onEditRoomName={() => setIsOpenEditRoomNameModal(true)}
            />
            <ChatArea messages={messages} onSend={sendMessage} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
