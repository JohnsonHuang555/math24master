'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import ChatArea from '@/components/areas/chat-area';
import PlayersArea from '@/components/areas/players-area';
import RoomInfoArea from '@/components/areas/room-info-area';
import MainLayout from '@/components/layouts/main-layout';
import { PlayerNameModal } from '@/components/modals/player-name-modal';
import useMultiplePlay from '@/hooks/useMultiplePlay';
import { Message } from '@/models/Message';
import { SocketEvent } from '@/models/SocketEvent';
import { useAlertDialogStore } from '@/providers/alert-dialog-store-provider';

export default function RoomPage() {
  const router = useRouter();
  const { roomId } = useParams<{ roomId: string }>();
  const [playerName, setPlayerName] = useState<string>();
  const [isOpenNameModal, setIsOpenNameModal] = useState(false);
  const { onOpen, isConfirmed, onReset } = useAlertDialogStore(state => state);

  const [messages, setMessages] = useState<Message[]>([]);

  const { socket, joinRoom } = useMultiplePlay();

  useEffect(() => {
    const playerName = localStorage.getItem('playerName') || '';
    if (!playerName) {
      setIsOpenNameModal(true);
    } else {
      setPlayerName(playerName);
    }

    joinRoom(playerName, roomId);

    const handleBeforeUnload = (event: any) => {
      // Perform actions before the component unloads
      event.preventDefault();
      event.returnValue = '';
      socket.disconnect();
    };

    socket.on(SocketEvent.GetMessage, (message: Message) => {
      setMessages(state => [...state, message]);
    });

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [socket, joinRoom, roomId]);

  useEffect(() => {
    if (isConfirmed) {
      router.push('/multiple-play');
      onReset();
    }
  }, [isConfirmed, onReset, router]);

  const sendMessage = (message: string) => {
    if (socket) {
      socket.emit(SocketEvent.SendMessage, { roomId, message });
    }
  };

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
      <div className="flex h-full flex-col items-center justify-center">
        <div className="flex h-2/3 w-2/3 gap-4 bg-transparent">
          <PlayersArea players={[]} onReady={() => {}} onStart={() => {}} />
          <div className="flex flex-[3] flex-col gap-4">
            <RoomInfoArea
              roomName="123"
              password="2222"
              onLeaveRoom={() => {
                onOpen({
                  title: '離開房間',
                  description: '離開遊戲後，當前進度將會消失，確定要離開嗎？',
                });
              }}
            />
            <ChatArea messages={messages} onSend={sendMessage} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
