import { useEffect, useState } from 'react';
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

type CreateRoomModalProps = {
  roomId: string;
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (
    roomName: string,
    maxPlayers: number,
    password: string,
    gameType: GameType,
    remainSeconds: number | null,
  ) => void;
};

const CreateRoomModal = ({
  isOpen,
  onOpenChange,
  onConfirm,
}: CreateRoomModalProps) => {
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('2');
  const [password, setPassword] = useState('');
  const [isSetPassword, setIsSetPassword] = useState(false);
  const [gameType, setGameType] = useState<GameType>('classic');
  const [remainSeconds, setRemainSeconds] = useState<number | null>(60);

  useEffect(() => {
    setRemainSeconds(gameType === 'rummy' ? 120 : 60);
  }, [gameType]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>建立房間</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="room-name" className="text-right">
              房間名稱
            </Label>
            <Input
              id="room-name"
              placeholder="請輸入房間名稱"
              className="col-span-3"
              onChange={e => setRoomName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="max-players" className="text-right">
              玩家人數
            </Label>
            <Select
              defaultValue={maxPlayers}
              onValueChange={v => setMaxPlayers(v)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue id="max-players" placeholder="請選擇玩家人數" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="game-type" className="text-right">
              遊戲類型
            </Label>
            <Select
              defaultValue={gameType}
              onValueChange={v => setGameType(v as GameType)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue id="game-type" placeholder="請選擇遊戲類型" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="classic">傳統模式</SelectItem>
                  <SelectItem value="rummy">拉密模式</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="remain-seconds" className="text-right">
              每回合時間
            </Label>
            <Select
              value={remainSeconds === null ? 'unlimited' : String(remainSeconds)}
              onValueChange={v =>
                setRemainSeconds(v === 'unlimited' ? null : Number(v))
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue id="remain-seconds" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="30">30 秒</SelectItem>
                  <SelectItem value="60">60 秒</SelectItem>
                  <SelectItem value="90">90 秒</SelectItem>
                  <SelectItem value="120">120 秒</SelectItem>
                  <SelectItem value="unlimited">無限時</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
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
              className="col-span-3 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              是否設定房間密碼
            </label>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div />
            <Input
              id="room-password"
              placeholder="請輸入房間密碼"
              className="col-span-3"
              onChange={e => setPassword(e.target.value)}
              disabled={!isSetPassword}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="submit"
            onClick={() => {
              onConfirm(roomName, Number(maxPlayers), password, gameType, remainSeconds);
            }}
          >
            確定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRoomModal;
