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
import {
  BuzzerSettings,
  DEFAULT_BUZZER_SETTINGS,
  DeckType,
  Difficulty,
  GameType,
  RoomSettings,
} from '@/models/Room';
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

type SettingSelectProps = {
  label: string;
  tooltip?: string;
  disabled?: boolean;
  dimLabel?: boolean;
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
};

const SettingSelect = ({
  label,
  tooltip,
  disabled,
  dimLabel,
  value,
  onValueChange,
  children,
}: SettingSelectProps) => (
  <div>
    <div className="flex items-center gap-1">
      <Label className={`text-xs${dimLabel ? ' opacity-40' : ''}`}>{label}</Label>
      {tooltip && (
        <HoverTip content={<span className="block max-w-48 text-wrap">{tooltip}</span>}>
          <span className="flex h-4 w-4 border cursor-pointer items-center justify-center rounded-full text-[10px] leading-none text-muted-foreground">
            ?
          </span>
        </HoverTip>
      )}
    </div>
    <Select disabled={disabled} value={value} onValueChange={onValueChange}>
      <SelectTrigger className="mt-1 h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>{children}</SelectGroup>
      </SelectContent>
    </Select>
  </div>
);

const PENALTY_OPTIONS = [
  { value: '0', label: '不扣分' },
  { value: '1', label: '扣 1 分' },
  { value: '2', label: '扣 2 分' },
  { value: '3', label: '扣 3 分' },
];

const BUZZER_SECONDS = [10, 15, 20, 25, 30];

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

  const bs: BuzzerSettings = roomSettings.buzzerSettings ?? DEFAULT_BUZZER_SETTINGS;
  const updateBuzzer = (patch: Partial<BuzzerSettings>) =>
    onRoomSettingsChange({ buzzerSettings: { ...bs, ...patch } });
  const roundUnlimited = bs.roundSeconds === null;

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
        <SettingSelect
          label="玩家人數"
          disabled={!isMaster}
          value={String(maxPlayers)}
          onValueChange={v => onRoomSettingsChange({ maxPlayers: Number(v) })}
        >
          {[2, 3, 4, 5, 6].map(n => (
            <SelectItem key={n} value={String(n)}>
              {n}
            </SelectItem>
          ))}
        </SettingSelect>

        {roomSettings.gameType !== 'rummy' && roomSettings.gameType !== 'buzzer' && (
          <SettingSelect
            label="牌庫類型"
            disabled={!isMaster}
            value={roomSettings?.deckType}
            onValueChange={v => onRoomSettingsChange({ deckType: v as DeckType })}
          >
            <SelectItem value={DeckType.Standard}>
              標準 (1-10 各 {playersCount * 3} 張)
            </SelectItem>
            <SelectItem value={DeckType.Random}>全部隨機 (所有數字牌隨機產生)</SelectItem>
          </SettingSelect>
        )}

        {roomSettings.gameType !== 'buzzer' && (
          <SettingSelect
            label="每回合秒數"
            disabled={!isMaster}
            value={
              roomSettings.remainSeconds === null
                ? 'infinity'
                : String(roomSettings.remainSeconds)
            }
            onValueChange={v =>
              onRoomSettingsChange({ remainSeconds: v === 'infinity' ? null : Number(v) })
            }
          >
            <SelectItem value="infinity">無限時</SelectItem>
            {[30, 60, 90, 120, 150, 180, 240, 300].map(s => (
              <SelectItem key={s} value={String(s)}>
                {s}
              </SelectItem>
            ))}
          </SettingSelect>
        )}

        <SettingSelect
          label="遊戲類型"
          disabled={!isMaster}
          value={roomSettings.gameType}
          onValueChange={v => onRoomSettingsChange({ gameType: v as GameType })}
        >
          <SelectItem value="buzzer">搶答模式</SelectItem>
        </SettingSelect>

        {roomSettings.gameType === 'rummy' && (
          <SettingSelect
            label="遊戲難度"
            disabled={!isMaster}
            value={roomSettings.difficulty}
            onValueChange={v => onRoomSettingsChange({ difficulty: v as Difficulty })}
          >
            <SelectItem value={Difficulty.Easy}>簡單（10 張・無顏色限制）</SelectItem>
            <SelectItem value={Difficulty.Normal}>普通（14 張・標準規則）</SelectItem>
          </SettingSelect>
        )}

        {roomSettings.gameType === 'buzzer' && (
          <>
            <SettingSelect
              label="牌面範圍"
              disabled={!isMaster}
              value={String(bs.cardMaxValue)}
              onValueChange={v => updateBuzzer({ cardMaxValue: Number(v) as 10 | 13 })}
            >
              <SelectItem value="10">1 – 10</SelectItem>
              <SelectItem value="13">1 – 13</SelectItem>
            </SettingSelect>

            <SettingSelect
              label="獲勝條件"
              disabled={!isMaster}
              value={String(bs.winScore)}
              onValueChange={v =>
                updateBuzzer({ winScore: Number(v) as 15 | 20 | 25 | 30 })
              }
            >
              {[15, 20, 25, 30].map(s => (
                <SelectItem key={s} value={String(s)}>
                  先獲得 {s} 分
                </SelectItem>
              ))}
            </SettingSelect>

            <SettingSelect
              label="作答秒數"
              disabled={!isMaster}
              value={String(bs.answerSeconds)}
              onValueChange={v =>
                updateBuzzer({ answerSeconds: Number(v) as 10 | 15 | 20 | 25 | 30 })
              }
            >
              {BUZZER_SECONDS.map(s => (
                <SelectItem key={s} value={String(s)}>
                  {s} 秒
                </SelectItem>
              ))}
            </SettingSelect>

            <SettingSelect
              label="失敗扣分"
              tooltip="搶答後答錯或作答時間到時，從該玩家分數中扣除的分數"
              disabled={!isMaster}
              value={String(bs.penaltyPoints)}
              onValueChange={v =>
                updateBuzzer({ penaltyPoints: Number(v) as 0 | 1 | 2 | 3 })
              }
            >
              {PENALTY_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SettingSelect>

            <SettingSelect
              label="鎖定秒數"
              tooltip="答題失敗後，該玩家在指定秒數內無法再次搶答"
              disabled={!isMaster}
              value={String(bs.lockSeconds)}
              onValueChange={v =>
                updateBuzzer({ lockSeconds: Number(v) as 10 | 15 | 20 | 25 | 30 })
              }
            >
              {BUZZER_SECONDS.map(s => (
                <SelectItem key={s} value={String(s)}>
                  {s} 秒
                </SelectItem>
              ))}
            </SettingSelect>

            <SettingSelect
              label="每回合時間"
              disabled={!isMaster}
              value={bs.roundSeconds === null ? 'unlimited' : String(bs.roundSeconds)}
              onValueChange={v =>
                updateBuzzer({
                  roundSeconds: v === 'unlimited' ? null : (Number(v) as 30 | 60 | 90),
                })
              }
            >
              <SelectItem value="unlimited">不限時</SelectItem>
              {[30, 60, 90].map(s => (
                <SelectItem key={s} value={String(s)}>
                  {s} 秒
                </SelectItem>
              ))}
            </SettingSelect>

            <SettingSelect
              label="逾時扣分"
              tooltip="每回合時間結束時，若無人答出則所有玩家被扣除的分數（需設定回合時間才生效）"
              disabled={!isMaster || roundUnlimited}
              dimLabel={roundUnlimited}
              value={String(bs.roundTimeoutPenalty)}
              onValueChange={v =>
                updateBuzzer({ roundTimeoutPenalty: Number(v) as 0 | 1 | 2 | 3 })
              }
            >
              {PENALTY_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SettingSelect>

            <SettingSelect
              label="連續答對加分"
              disabled={!isMaster}
              value={bs.streakBonus}
              onValueChange={v =>
                updateBuzzer({ streakBonus: v as 'none' | 'n1' | 'n2' })
              }
            >
              <SelectItem value="none">不加分</SelectItem>
              <SelectItem value="n1">連勝數 × 1 分</SelectItem>
              <SelectItem value="n2">連勝數 × 2 分</SelectItem>
            </SettingSelect>

            <SettingSelect
              label="最低分數"
              tooltip="玩家分數的下限，被扣分後不會低於此值"
              disabled={!isMaster}
              value={bs.scoreFloor === null ? 'none' : String(bs.scoreFloor)}
              onValueChange={v =>
                updateBuzzer({
                  scoreFloor: v === 'none' ? null : (Number(v) as 0 | -5 | -10),
                })
              }
            >
              <SelectItem value="none">不設定</SelectItem>
              <SelectItem value="0">0 分</SelectItem>
              <SelectItem value="-5">-5 分</SelectItem>
              <SelectItem value="-10">-10 分</SelectItem>
            </SettingSelect>

            <SettingSelect
              label="換回合解鎖"
              tooltip="開啟時，新回合開始時自動解除所有玩家的鎖定狀態"
              disabled={!isMaster}
              value={bs.clearLockOnNewRound ? 'true' : 'false'}
              onValueChange={v => updateBuzzer({ clearLockOnNewRound: v === 'true' })}
            >
              <SelectItem value="true">開啟</SelectItem>
              <SelectItem value="false">關閉</SelectItem>
            </SettingSelect>
          </>
        )}
      </div>
    </Card>
  );
};

export default RoomInfoArea;
