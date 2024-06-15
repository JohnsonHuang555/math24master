import Image from 'next/image';
import HoverTip from '@/components/hover-tip';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '../ui/label';

type RoomInfoAreaProps = {
  isMaster?: boolean;
  roomName?: string;
  password?: string;
  maxPlayers?: number;
  onLeaveRoom: () => void;
  onMaxPlayersChange: (max: number) => void;
  onEditRoomName: () => void;
};

const RoomInfoArea = ({
  isMaster,
  roomName,
  password,
  maxPlayers,
  onLeaveRoom,
  onMaxPlayersChange,
  onEditRoomName,
}: RoomInfoAreaProps) => {
  return (
    <Card className="grow p-4">
      <div className="mb-4 flex gap-3">
        <div className="flex grow items-center gap-2">
          {password && (
            <Image src="/lock.svg" alt="lock" width={18} height={18} priority />
          )}
          <div className="mr-1 mt-[2px]">房間名稱: {roomName}</div>
          {isMaster && (
            <HoverTip content="編輯名稱">
              <Image
                onClick={onEditRoomName}
                src="/edit.svg"
                alt="edit"
                width={20}
                height={20}
                priority
              />
            </HoverTip>
          )}
        </div>
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
            onClick={onLeaveRoom}
            src="/leave.svg"
            alt="leave"
            width={24}
            height={24}
            priority
          />
        </HoverTip>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs" htmlFor="max-players">
            玩家人數
          </Label>
          <Select
            disabled={!isMaster}
            value={String(maxPlayers)}
            onValueChange={v => onMaxPlayersChange(Number(v))}
          >
            <SelectTrigger className="mt-1 h-8">
              <SelectValue id="max-players" />
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
        <div>
          <Label className="text-xs" htmlFor="remain-seconds">
            回合秒數
          </Label>
          <Select
            disabled={!isMaster}
            defaultValue="30"
            onValueChange={v => onMaxPlayersChange(Number(v))}
          >
            <SelectTrigger className="mt-1 h-8">
              <SelectValue id="remain-seconds" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="40">40</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="60">60</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
};

export default RoomInfoArea;
