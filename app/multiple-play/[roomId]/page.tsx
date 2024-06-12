'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import MainLayout from '@/components/layouts/main-layout';
import { PlayerNameModal } from '@/components/modals/player-name-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import useMultiplePlay from '@/hooks/useMultiplePlay';
import { useAlertDialogStore } from '@/providers/alert-dialog-store-provider';

export default function RoomPage() {
  const { rooms, searchRooms } = useMultiplePlay();
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

  return (
    <MainLayout>
      <PlayerNameModal
        isOpen={isOpenNameModal}
        onOpenChange={v => setIsOpenNameModal(v)}
        onConfirm={v => {
          if (!v) return;
          localStorage.setItem('playerName', v);
          setPlayerName(playerName);
          setIsOpenNameModal(false);
        }}
        closeDisabled={true}
      />
      <div className="flex h-full flex-col items-center justify-center">
        123
      </div>
    </MainLayout>
  );
}
