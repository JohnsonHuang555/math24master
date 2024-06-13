'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import MainLayout from '@/components/layouts/main-layout';
import CreateRoomModal from '@/components/modals/create-room-modal';
import { PlayerNameModal } from '@/components/modals/player-name-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import useMultiplePlay from '@/hooks/useMultiplePlay';
import { Room } from '@/models/Room';
import { SocketEvent } from '@/models/SocketEvent';
import { useAlertDialogStore } from '@/providers/alert-dialog-store-provider';

const RELOAD_ROOMS_TIMER = 10000;

export default function MultiplePlayPage() {
  const [rooms, setRooms] = useState<Room[]>([]);

  const router = useRouter();
  const { searchRooms, joinRoom, socket } = useMultiplePlay();
  const [playerName, setPlayerName] = useState<string>('');
  const [isOpenNameModal, setIsOpenNameModal] = useState(false);
  const [isOpenCreateRoomModal, setIsOpenCreateRoomModal] = useState(false);

  const [selectedRoomId, setSelectedRoomId] = useState<string>();

  const { onOpen, isConfirmed, onReset } = useAlertDialogStore(state => state);

  useEffect(() => {
    const playerName = localStorage.getItem('playerName') || '';
    if (!playerName) {
      setIsOpenNameModal(true);
    } else {
      setPlayerName(playerName);
    }
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on(SocketEvent.GetRoomsResponse, (r: Room[]) => {
        setRooms(r || []);
      });

      socket.on(SocketEvent.JoinRoomSuccess, (roomId: string) => {
        if (roomId) {
          router.push(`/multiple-play/${roomId}`);
        } else {
          toast.error('建立失敗');
        }
      });
    }
  }, [router, socket]);

  useEffect(() => {
    if (isConfirmed) {
      router.push(`/multiple-play/${selectedRoomId}`);
      onReset();
    }
  }, [isConfirmed, onReset, router, selectedRoomId]);

  // 每 {RELOAD_ROOMS_TIMER} 秒刷新一次
  useEffect(() => {
    const interval = setInterval(() => {
      searchRooms('');
    }, RELOAD_ROOMS_TIMER);

    return () => clearInterval(interval);
  }, [searchRooms]);

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
      <CreateRoomModal
        isOpen={isOpenCreateRoomModal}
        onOpenChange={v => setIsOpenCreateRoomModal(v)}
        onConfirm={(roomId, roomName, maxPlayers, password) => {
          if (!playerName) {
            console.error('沒有暱稱');
            return;
          }
          joinRoom(playerName, roomId, roomName, maxPlayers, password);
        }}
      />
      <div className="flex h-full flex-col items-center justify-center">
        <div className="h-2/3 w-2/3">
          <h1 className="mb-4 text-xl font-semibold">房間列表</h1>
          <div className="mb-8 flex justify-between">
            <div className="relative">
              <Input
                placeholder="房間名稱"
                className="min-w-[250px] pl-8"
                onChange={e => searchRooms(e.target.value)}
              />
              <Image
                src="/search.svg"
                alt="search"
                className="absolute top-[50%] ml-2 -translate-y-1/2"
                width={20}
                height={20}
                priority
              />
            </div>
            <Button onClick={() => setIsOpenCreateRoomModal(true)}>
              建立房間
            </Button>
          </div>
          {rooms.length > 0 ? (
            <div className="-ml-2 -mt-2 h-[calc(100%-60px)] overflow-y-auto pl-2 pt-2">
              <div className="grid grid-cols-3 gap-4">
                {rooms.map(room => (
                  <motion.div
                    key={room.roomId}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 1 }}
                  >
                    <Card
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedRoomId(room.roomId);
                        onOpen({
                          title: '加入房間',
                          description: `確定要加入 ${room.roomName} 嗎？`,
                        });
                      }}
                    >
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {room.roomName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex justify-between">
                        <div className="flex items-center justify-center">
                          <Image
                            src="/lock.svg"
                            alt="lock"
                            width={20}
                            height={20}
                            priority
                          />
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <Image
                            src="/user.svg"
                            alt="user"
                            width={20}
                            height={20}
                            priority
                          />
                          <div>
                            {room.players.length} / {room.maxPlayers}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center">
              <Image
                src="/no-room.svg"
                alt="no-room"
                className="mb-6"
                width={46}
                height={46}
                priority
              />
              <div className="text-center text-gray-500">目前沒有遊戲房間</div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
