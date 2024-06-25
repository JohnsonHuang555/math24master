'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import HoverTip from '@/components/hover-tip';
import MainLayout from '@/components/layouts/main-layout';
import CreateRoomModal from '@/components/modals/create-room-modal';
import { PlayerNameModal } from '@/components/modals/player-name-modal';
import { RuleModal } from '@/components/modals/rule-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Room } from '@/models/Room';
import { SocketEvent } from '@/models/SocketEvent';
import { useAlertDialogStore } from '@/providers/alert-dialog-store-provider';
import { useMultiplePlay } from '@/providers/multiple-play-provider';

const RELOAD_ROOMS_TIMER = 1000;

const roomId = uuidv4();

export default function MultiplePlayPage() {
  const [rooms, setRooms] = useState<Room[]>([]);

  const router = useRouter();
  const { searchRooms, joinRoom, socket } = useMultiplePlay();
  const [searchedRoomName, setSearchedRoomName] = useState('');
  const [searchedShowEmpty, setSearchedShowEmpty] = useState('all');
  const [playerName, setPlayerName] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>();

  const [isOpenNameModal, setIsOpenNameModal] = useState(false);
  const [isOpenCreateRoomModal, setIsOpenCreateRoomModal] = useState(false);
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);

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
    // 加入房間
    if (isConfirmed) {
      window.location.href = `/multiple-play/${selectedRoomId}`;
      onReset();
    }
  }, [isConfirmed, onReset, selectedRoomId]);

  // 每 {RELOAD_ROOMS_TIMER} 秒刷新一次
  useEffect(() => {
    const interval = setInterval(() => {
      searchRooms({
        roomName: searchedRoomName,
        showEmpty: searchedShowEmpty !== 'all',
      });
    }, RELOAD_ROOMS_TIMER);

    return () => clearInterval(interval);
  }, [searchRooms, searchedRoomName, searchedShowEmpty]);

  return (
    <MainLayout>
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
        onConfirm={(roomName, maxPlayers, password) => {
          joinRoom(playerName, roomId, roomName, maxPlayers, password);
        }}
      />
      <div className="flex h-full flex-col items-center justify-center">
        <div className="h-2/3 w-2/3 max-md:h-full max-md:w-full max-md:p-4 md:h-5/6 md:w-5/6">
          <div className="mb-4 flex justify-between">
            <h1 className="text-xl font-semibold">房間列表</h1>
            <div className="flex items-center">
              <div className="text-lg">Hi, {playerName}</div>
              <HoverTip content="編輯名稱">
                <Image
                  src="/edit.svg"
                  alt="edit"
                  className="ml-3"
                  width={20}
                  height={20}
                  priority
                  onClick={() => setIsOpenNameModal(true)}
                />
              </HoverTip>
            </div>
          </div>
          <div className="mb-8 flex justify-between max-md:mb-3">
            <div className="flex gap-4 max-md:w-full max-md:gap-2">
              <div className="relative w-[150px] max-md:w-1/2">
                <Input
                  placeholder="房間名稱"
                  className="pl-8"
                  onChange={e => setSearchedRoomName(e.target.value)}
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
              <Select
                value={searchedShowEmpty}
                onValueChange={setSearchedShowEmpty}
              >
                <SelectTrigger className="w-[120px] max-md:w-1/2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">全部房間</SelectItem>
                    <SelectItem value="only-empty">人數未滿</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4 max-md:hidden">
              <Button variant="secondary" onClick={() => router.push('/')}>
                回首頁
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsOpenRuleModal(true)}
              >
                遊戲規則
              </Button>
              <Button onClick={() => setIsOpenCreateRoomModal(true)}>
                <Image
                  src="/add-room.svg"
                  alt="add-room"
                  className="mr-1"
                  width={20}
                  height={20}
                  priority
                />
                建立房間
              </Button>
            </div>
          </div>
          {/* mobile only */}
          <div className="mb-6 max-md:flex max-md:justify-between md:hidden">
            <div className="flex gap-4 ">
              <Button variant="secondary" onClick={() => router.push('/')}>
                回首頁
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsOpenRuleModal(true)}
              >
                遊戲規則
              </Button>
            </div>
            <Button onClick={() => setIsOpenCreateRoomModal(true)}>
              <Image
                src="/add-room.svg"
                alt="add-room"
                className="mr-1"
                width={20}
                height={20}
                priority
              />
              建立房間
            </Button>
          </div>
          {rooms.length > 0 ? (
            <div className="-ml-2 -mt-2 h-[calc(100%-60px)] overflow-y-auto pl-2 pt-2">
              <div className="grid grid-cols-3 gap-4 max-md:grid-cols-2">
                {rooms.map(room => (
                  <motion.div
                    key={room.roomId}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 1 }}
                  >
                    <Card
                      className="cursor-pointer"
                      onClick={() => {
                        if (room.players.length === room.maxPlayers) {
                          toast.info('房間人數已滿');
                          return;
                        }
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
                          {room.password && (
                            <Image
                              src="/lock.svg"
                              alt="lock"
                              width={20}
                              height={20}
                              priority
                            />
                          )}
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
            <div className="mt-14 flex flex-col items-center">
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
