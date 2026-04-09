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
import { DeckType, Difficulty, GameType, RoomSettings } from '@/models/Room';
import { RuleModal } from '../modals/rule-modal';
import { Label } from '../ui/label';

type RoomInfoAreaProps = {
  isMaster?: boolean;
  roomName?: string;
  password?: string;
  maxPlayers: number;
  roomSettings: RoomSettings;
  playersCount: number;
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
  playersCount = 2,
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
      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1 max-sm:gap-2">
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
        {roomSettings.gameType !== 'rummy' && (
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
                  <SelectItem value={DeckType.Standard}>
                    標準 (1-10 各 {playersCount * 3} 張)
                  </SelectItem>
                  <SelectItem value={DeckType.Random}>
                    全部隨機 (所有數字牌隨機產生)
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label className="text-xs" htmlFor="remain-seconds">
            每回合秒數
          </Label>
          <Select
            disabled={!isMaster}
            value={
              roomSettings.remainSeconds === null
                ? 'infinity'
                : String(roomSettings.remainSeconds)
            }
            onValueChange={v => {
              onRoomSettingsChange({
                remainSeconds: v === 'infinity' ? null : Number(v),
              });
            }}
          >
            <SelectTrigger className="mt-1 h-8">
              <SelectValue id="remain-seconds" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="infinity">無限時</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="60">60</SelectItem>
                <SelectItem value="90">90</SelectItem>
                <SelectItem value="120">120</SelectItem>
                <SelectItem value="150">150</SelectItem>
                <SelectItem value="180">180</SelectItem>
                <SelectItem value="240">240</SelectItem>
                <SelectItem value="300">300</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs" htmlFor="game-type">
            遊戲類型
          </Label>
          <Select
            disabled={!isMaster}
            value={roomSettings.gameType}
            onValueChange={v => onRoomSettingsChange({ gameType: v as GameType })}
          >
            <SelectTrigger className="mt-1 h-8">
              <SelectValue id="game-type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="classic">經典模式</SelectItem>
                <SelectItem value="rummy">拉密模式</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        {roomSettings.gameType === 'rummy' && (
          <div>
            <Label className="text-xs" htmlFor="rummy-difficulty">
              遊戲難度
            </Label>
            <Select
              disabled={!isMaster}
              value={roomSettings.difficulty}
              onValueChange={v => onRoomSettingsChange({ difficulty: v as Difficulty })}
            >
              <SelectTrigger className="mt-1 h-8">
                <SelectValue id="rummy-difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={Difficulty.Easy}>簡單（10 張・無顏色限制）</SelectItem>
                  <SelectItem value={Difficulty.Normal}>普通（14 張・標準規則）</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </Card>
  );
};

export default RoomInfoArea;
