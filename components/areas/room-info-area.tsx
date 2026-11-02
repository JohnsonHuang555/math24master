import { useState } from 'react';
import { BookOpen, CircleHelp, Lock, LogOut, Pencil } from 'lucide-react';
import HoverTip from '@/components/hover-tip';
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

// 一列一項：左邊名稱與說明，右邊下拉選單；非房主看到的是唯讀值
const SettingSelect = ({
  label,
  tooltip,
  disabled,
  dimLabel,
  value,
  onValueChange,
  children,
}: SettingSelectProps) => (
  <div className="flex min-h-14 items-center gap-2 py-1.5">
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <Label
        className={`text-sm font-semibold text-ink-2${dimLabel ? 'opacity-40' : ''}`}
      >
        {label}
      </Label>
      {tooltip && (
        <HoverTip
          content={<span className="block max-w-48 text-wrap">{tooltip}</span>}
        >
          <span
            aria-label={tooltip}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ink-2 hover:bg-sunken"
          >
            <CircleHelp aria-hidden className="h-4 w-4" />
          </span>
        </HoverTip>
      )}
    </div>
    <Select disabled={disabled} value={value} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label={label}
        className="h-11 w-[150px] shrink-0 rounded-xl border-line-strong bg-surface text-sm font-bold text-ink disabled:cursor-default disabled:border-transparent disabled:bg-transparent disabled:opacity-100 [&:disabled>svg]:hidden"
      >
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

  const bs: BuzzerSettings =
    roomSettings.buzzerSettings ?? DEFAULT_BUZZER_SETTINGS;
  const updateBuzzer = (patch: Partial<BuzzerSettings>) =>
    onRoomSettingsChange({ buzzerSettings: { ...bs, ...patch } });
  const roundUnlimited = bs.roundSeconds === null;

  return (
    <section
      aria-label="房間設定"
      className="grow rounded-[20px] border border-line bg-surface px-4 py-3 md:h-full"
    >
      <RuleModal isOpen={isOpenRuleModal} onOpenChange={setIsOpenRuleModal} />

      {
        <div className="mb-1 flex items-center gap-1">
          {/* 手機頂部列已經有房名與編輯鈕，這裡改顯示區塊標題 */}
          <h2 className="flex-1 text-base font-extrabold text-ink md:hidden">
            房間設定
          </h2>
          <div className="flex min-w-0 flex-1 items-center gap-1.5 max-md:hidden">
            {password && (
              <Lock
                aria-label="有密碼"
                className="h-4 w-4 shrink-0 text-ink-2"
              />
            )}
            <h2 className="truncate text-lg font-extrabold text-ink">
              {roomName}
            </h2>
            {isMaster && (
              <button
                type="button"
                onClick={onEditRoomName}
                aria-label="編輯房間"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsOpenRuleModal(true)}
            aria-label="遊戲規則"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-ink transition-colors hover:bg-sunken"
          >
            <BookOpen className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onLeaveRoom}
            aria-label="離開房間"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-ink transition-colors hover:bg-danger-tint hover:text-danger-ink"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      }

      {/* 設定清單 */}
      <div className="flex flex-col divide-y divide-line">
        <SettingSelect
          label="玩家人數"
          disabled={!isMaster}
          value={String(maxPlayers)}
          onValueChange={v => onRoomSettingsChange({ maxPlayers: Number(v) })}
        >
          {[2, 3, 4, 5, 6].map(n => (
            <SelectItem key={n} value={String(n)}>
              {n} 人
            </SelectItem>
          ))}
        </SettingSelect>

        {roomSettings.gameType !== 'buzzer' && (
          <SettingSelect
            label="牌庫類型"
            disabled={!isMaster}
            value={roomSettings?.deckType}
            onValueChange={v =>
              onRoomSettingsChange({ deckType: v as DeckType })
            }
          >
            <SelectItem value={DeckType.Standard}>
              標準 (1-10 各 {playersCount * 3} 張)
            </SelectItem>
            <SelectItem value={DeckType.Random}>全部隨機</SelectItem>
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
              onRoomSettingsChange({
                remainSeconds: v === 'infinity' ? null : Number(v),
              })
            }
          >
            <SelectItem value="infinity">無限時</SelectItem>
            {[30, 60, 90, 120, 150, 180, 240, 300].map(s => (
              <SelectItem key={s} value={String(s)}>
                {s} 秒
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

        {roomSettings.gameType === 'buzzer' && (
          <>
            <SettingSelect
              label="牌面範圍"
              disabled={!isMaster}
              value={String(bs.cardMaxValue)}
              onValueChange={v =>
                updateBuzzer({ cardMaxValue: Number(v) as 10 | 13 })
              }
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
                updateBuzzer({
                  answerSeconds: Number(v) as 10 | 15 | 20 | 25 | 30,
                })
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
                updateBuzzer({
                  lockSeconds: Number(v) as 10 | 15 | 20 | 25 | 30,
                })
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
              value={
                bs.roundSeconds === null ? 'unlimited' : String(bs.roundSeconds)
              }
              onValueChange={v =>
                updateBuzzer({
                  roundSeconds:
                    v === 'unlimited' ? null : (Number(v) as 30 | 60 | 90),
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
                updateBuzzer({
                  roundTimeoutPenalty: Number(v) as 0 | 1 | 2 | 3,
                })
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
              onValueChange={v =>
                updateBuzzer({ clearLockOnNewRound: v === 'true' })
              }
            >
              <SelectItem value="true">開啟</SelectItem>
              <SelectItem value="false">關閉</SelectItem>
            </SettingSelect>
          </>
        )}
      </div>
    </section>
  );
};

export default RoomInfoArea;
