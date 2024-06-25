import { useState } from 'react';
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
import { DeckType, RoomSettings } from '@/models/Room';
import { RuleModal } from '../modals/rule-modal';
import { Label } from '../ui/label';

type RoomInfoAreaProps = {
  isMaster?: boolean;
  roomName?: string;
  password?: string;
  maxPlayers?: number;
  roomSettings?: RoomSettings;
  onLeaveRoom: () => void;
  onEditRoomName: () => void;
  onRoomSettingsChange: (
    settings: Partial<RoomSettings> & { maxPlayers?: number },
  ) => void;
};

const RoomInfoArea = ({
  isMaster,
  roomName,
  password,
  maxPlayers,
  roomSettings,
  onLeaveRoom,
  onEditRoomName,
  onRoomSettingsChange,
}: RoomInfoAreaProps) => {
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);

  return (
    <Card className="grow p-4">
      <RuleModal isOpen={isOpenRuleModal} onOpenChange={setIsOpenRuleModal} />

      <div className="mb-4 flex gap-4">
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
            onClick={() => setIsOpenRuleModal(true)}
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
            onValueChange={v => onRoomSettingsChange({ maxPlayers: Number(v) })}
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
            牌庫類型
          </Label>
          <Select
            disabled={!isMaster}
            value={roomSettings?.deckType}
            onValueChange={v =>
              onRoomSettingsChange({ deckType: v as DeckType })
            }
          >
            <SelectTrigger className="mt-1 h-8">
              <SelectValue id="remain-seconds" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={DeckType.Standard}>標準</SelectItem>
                <SelectItem value={DeckType.Random}>全部隨機</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        {/* <div>
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
        </div> */}
      </div>
    </Card>
  );
};

export default RoomInfoArea;
