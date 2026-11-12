'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GameType } from '@/models/Room';

// ── 型別 ─────────────────────────────────────────────────────────────────────

type CreateRoomModalProps = {
  roomId: string;
  /** 預填的房間名稱（例如大廳搜尋不到時，用關鍵字建立房間） */
  defaultRoomName?: string;
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (
    roomName: string,
    maxPlayers: number,
    password: string,
    gameType: GameType,
  ) => void;
};

// ── 元件 ─────────────────────────────────────────────────────────────────────

const CreateRoomModal = ({
  defaultRoomName = '',
  isOpen,
  onOpenChange,
  onConfirm,
}: CreateRoomModalProps) => {
  const [roomName, setRoomName] = useState(defaultRoomName);
  const [maxPlayers, setMaxPlayers] = useState('2');
  const [password, setPassword] = useState('');
  const [isSetPassword, setIsSetPassword] = useState(false);
  const [gameType, setGameType] = useState<GameType>('buzzer');
  const t = useTranslations('Multiplayer.createRoom');
  const tCommon = useTranslations('Common');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent sheet className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* 房間名稱 */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="room-name" className="text-right">
              {t('roomName')}
            </Label>
            <Input
              id="room-name"
              placeholder={t('roomNamePlaceholder')}
              className="col-span-3"
              onChange={e => setRoomName(e.target.value)}
            />
          </div>

          {/* 玩家人數 */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="max-players" className="text-right">
              {t('maxPlayers')}
            </Label>
            <Select
              defaultValue={maxPlayers}
              onValueChange={v => setMaxPlayers(v)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue
                  id="max-players"
                  placeholder={t('maxPlayersPlaceholder')}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="6">6</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* 遊戲類型 */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="game-type" className="text-right">
              {t('gameType')}
            </Label>
            <Select
              defaultValue={gameType}
              onValueChange={v => setGameType(v as GameType)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue
                  id="game-type"
                  placeholder={t('gameTypePlaceholder')}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="buzzer">{t('buzzerMode')}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* 房間密碼 */}
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="flex justify-end">
              <Checkbox
                className="border-border"
                id="allow-password"
                onCheckedChange={v => setIsSetPassword(Boolean(v))}
              />
            </div>
            <label
              htmlFor="allow-password"
              className="col-span-3 text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {t('setPassword')}
            </label>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div />
            <Input
              id="room-password"
              placeholder={t('passwordPlaceholder')}
              className="col-span-3"
              onChange={e => setPassword(e.target.value)}
              disabled={!isSetPassword}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button
            type="submit"
            onClick={() => {
              onConfirm(roomName, Number(maxPlayers), password, gameType);
            }}
          >
            {tCommon('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRoomModal;
