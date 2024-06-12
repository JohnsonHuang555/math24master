'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import HoverTip from '@/components/hover-tip';
import MainLayout from '@/components/layouts/main-layout';
import { PlayerNameModal } from '@/components/modals/player-name-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import useMultiplePlay from '@/hooks/useMultiplePlay';
import { useAlertDialogStore } from '@/providers/alert-dialog-store-provider';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { socket } = useMultiplePlay();
  const [playerName, setPlayerName] = useState<string>();
  const [isOpenNameModal, setIsOpenNameModal] = useState(false);

  useEffect(() => {
    const playerName = localStorage.getItem('playerName') || '';
    if (!playerName) {
      setIsOpenNameModal(true);
    } else {
      setPlayerName(playerName);
    }
  }, []);

  useEffect(() => {
    return () => {
      socket.disconnect();
    };
  }, [socket]);

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
          <Card className="flex h-full flex-1 flex-col gap-3 p-6">
            {/* Players */}
            <div className="flex justify-between">
              <div className="flex flex-col">
                <div className="text-lg">Johnson</div>
                <div className="text-sm">分數: 100</div>
              </div>
              <Image
                src="/crown.svg"
                alt="crown"
                width={30}
                height={30}
                priority
              />
            </div>
            <hr />
            <div className="flex justify-between">
              <div className="flex flex-col">
                <div className="text-lg">Johnson</div>
                <div className="text-sm">分數: 100</div>
              </div>
              <Image
                src="/ready.svg"
                alt="ready"
                width={32}
                height={32}
                priority
              />
            </div>
            <hr />
            <Button className="mt-auto">準備遊戲</Button>
          </Card>
          <div className="flex flex-[2] flex-col gap-4">
            <Card className="grow p-6">
              <div className="flex gap-3">
                <div className="flex grow items-center gap-2">
                  <Image
                    src="/lock.svg"
                    alt="lock"
                    width={18}
                    height={18}
                    priority
                  />
                  <div className="mt-1">房間名稱: Hello</div>
                </div>
                <HoverTip content="編輯房間">
                  <Image
                    src="/edit.svg"
                    alt="edit"
                    width={26}
                    height={26}
                    priority
                  />
                </HoverTip>
                <HoverTip content="遊戲規則">
                  <Image
                    src="/document.svg"
                    alt="document"
                    width={20}
                    height={20}
                    priority
                  />
                </HoverTip>
                <HoverTip content="離開房間">
                  <Image
                    src="/leave.svg"
                    alt="leave"
                    width={24}
                    height={24}
                    priority
                  />
                </HoverTip>
              </div>
            </Card>
            <Card className="flex min-h-[220px] flex-col p-6">
              <div className="grow">
                <div className="text-sm">Johnson: 123</div>
                <div className="text-sm">Johnson: 123</div>
                <div className="text-sm">Johnson: 123</div>
                <div className="text-sm">Johnson: 123</div>
              </div>
              <div className="flex gap-2">
                <Input />
                <Button variant="secondary">送出</Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
