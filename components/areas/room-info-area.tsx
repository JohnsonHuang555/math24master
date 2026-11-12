import { useState } from 'react';
import { BookOpen, CircleHelp, Lock, LogOut, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
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

const PENALTY_OPTIONS = [0, 1, 2, 3];

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
  const t = useTranslations('Multiplayer.settings');
  const tRoom = useTranslations('Multiplayer.room');
  const tLobby = useTranslations('Multiplayer.lobby');
  const tCreate = useTranslations('Multiplayer.createRoom');

  const bs: BuzzerSettings =
    roomSettings.buzzerSettings ?? DEFAULT_BUZZER_SETTINGS;
  const updateBuzzer = (patch: Partial<BuzzerSettings>) =>
    onRoomSettingsChange({ buzzerSettings: { ...bs, ...patch } });
  const roundUnlimited = bs.roundSeconds === null;

  return (
    <section
      aria-label={t('title')}
      className="grow rounded-[20px] border border-line bg-surface px-4 py-3 md:h-full"
    >
      <RuleModal isOpen={isOpenRuleModal} onOpenChange={setIsOpenRuleModal} />

      {
        <div className="mb-1 flex items-center gap-1">
          {/* 手機頂部列已經有房名與編輯鈕，這裡改顯示區塊標題 */}
          <h2 className="flex-1 text-base font-extrabold text-ink md:hidden">
            {t('title')}
          </h2>
          <div className="flex min-w-0 flex-1 items-center gap-1.5 max-md:hidden">
            {password && (
              <Lock
                aria-label={tLobby('hasPassword')}
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
                aria-label={tRoom('edit')}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsOpenRuleModal(true)}
            aria-label={tLobby('rules')}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-ink transition-colors hover:bg-sunken"
          >
            <BookOpen className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onLeaveRoom}
            aria-label={tRoom('leave')}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-ink transition-colors hover:bg-danger-tint hover:text-danger-ink"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      }

      {/* 設定清單 */}
      <div className="flex flex-col divide-y divide-line">
        <SettingSelect
          label={tCreate('maxPlayers')}
          disabled={!isMaster}
          value={String(maxPlayers)}
          onValueChange={v => onRoomSettingsChange({ maxPlayers: Number(v) })}
        >
          {[2, 3, 4, 5, 6].map(n => (
            <SelectItem key={n} value={String(n)}>
              {t('players', { count: n })}
            </SelectItem>
          ))}
        </SettingSelect>

        {roomSettings.gameType !== 'buzzer' && (
          <SettingSelect
            label={t('deckType')}
            disabled={!isMaster}
            value={roomSettings?.deckType}
            onValueChange={v =>
              onRoomSettingsChange({ deckType: v as DeckType })
            }
          >
            <SelectItem value={DeckType.Standard}>
              {t('deckStandard', { count: playersCount * 3 })}
            </SelectItem>
            <SelectItem value={DeckType.Random}>{t('deckRandom')}</SelectItem>
          </SettingSelect>
        )}

        {roomSettings.gameType !== 'buzzer' && (
          <SettingSelect
            label={t('turnSeconds')}
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
            <SelectItem value="infinity">{t('unlimited')}</SelectItem>
            {[30, 60, 90, 120, 150, 180, 240, 300].map(s => (
              <SelectItem key={s} value={String(s)}>
                {t('seconds', { count: s })}
              </SelectItem>
            ))}
          </SettingSelect>
        )}

        <SettingSelect
          label={tCreate('gameType')}
          disabled={!isMaster}
          value={roomSettings.gameType}
          onValueChange={v => onRoomSettingsChange({ gameType: v as GameType })}
        >
          <SelectItem value="buzzer">{tCreate('buzzerMode')}</SelectItem>
        </SettingSelect>

        {roomSettings.gameType === 'buzzer' && (
          <>
            <SettingSelect
              label={t('cardRange')}
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
              label={t('winScore')}
              disabled={!isMaster}
              value={String(bs.winScore)}
              onValueChange={v =>
                updateBuzzer({ winScore: Number(v) as 15 | 20 | 25 | 30 })
              }
            >
              {[15, 20, 25, 30].map(s => (
                <SelectItem key={s} value={String(s)}>
                  {t('winScoreValue', { count: s })}
                </SelectItem>
              ))}
            </SettingSelect>

            <SettingSelect
              label={t('answerSeconds')}
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
                  {t('seconds', { count: s })}
                </SelectItem>
              ))}
            </SettingSelect>

            <SettingSelect
              label={t('penalty')}
              tooltip={t('penaltyTip')}
              disabled={!isMaster}
              value={String(bs.penaltyPoints)}
              onValueChange={v =>
                updateBuzzer({ penaltyPoints: Number(v) as 0 | 1 | 2 | 3 })
              }
            >
              {PENALTY_OPTIONS.map(n => (
                <SelectItem key={n} value={String(n)}>
                  {n === 0 ? t('noPenalty') : t('penaltyValue', { count: n })}
                </SelectItem>
              ))}
            </SettingSelect>

            <SettingSelect
              label={t('lockSeconds')}
              tooltip={t('lockSecondsTip')}
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
                  {t('seconds', { count: s })}
                </SelectItem>
              ))}
            </SettingSelect>

            <SettingSelect
              label={t('roundSeconds')}
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
              <SelectItem value="unlimited">{t('unlimited')}</SelectItem>
              {[30, 60, 90].map(s => (
                <SelectItem key={s} value={String(s)}>
                  {t('seconds', { count: s })}
                </SelectItem>
              ))}
            </SettingSelect>

            <SettingSelect
              label={t('timeoutPenalty')}
              tooltip={t('timeoutPenaltyTip')}
              disabled={!isMaster || roundUnlimited}
              dimLabel={roundUnlimited}
              value={String(bs.roundTimeoutPenalty)}
              onValueChange={v =>
                updateBuzzer({
                  roundTimeoutPenalty: Number(v) as 0 | 1 | 2 | 3,
                })
              }
            >
              {PENALTY_OPTIONS.map(n => (
                <SelectItem key={n} value={String(n)}>
                  {n === 0 ? t('noPenalty') : t('penaltyValue', { count: n })}
                </SelectItem>
              ))}
            </SettingSelect>

            <SettingSelect
              label={t('streakBonus')}
              disabled={!isMaster}
              value={bs.streakBonus}
              onValueChange={v =>
                updateBuzzer({ streakBonus: v as 'none' | 'n1' | 'n2' })
              }
            >
              <SelectItem value="none">{t('streakNone')}</SelectItem>
              <SelectItem value="n1">{t('streakTimes', { n: 1 })}</SelectItem>
              <SelectItem value="n2">{t('streakTimes', { n: 2 })}</SelectItem>
            </SettingSelect>

            <SettingSelect
              label={t('scoreFloor')}
              tooltip={t('scoreFloorTip')}
              disabled={!isMaster}
              value={bs.scoreFloor === null ? 'none' : String(bs.scoreFloor)}
              onValueChange={v =>
                updateBuzzer({
                  scoreFloor: v === 'none' ? null : (Number(v) as 0 | -5 | -10),
                })
              }
            >
              <SelectItem value="none">{t('scoreFloorNone')}</SelectItem>
              {[0, -5, -10].map(n => (
                <SelectItem key={n} value={String(n)}>
                  {t('points', { count: n })}
                </SelectItem>
              ))}
            </SettingSelect>

            <SettingSelect
              label={t('unlockOnNewRound')}
              tooltip={t('unlockOnNewRoundTip')}
              disabled={!isMaster}
              value={bs.clearLockOnNewRound ? 'true' : 'false'}
              onValueChange={v =>
                updateBuzzer({ clearLockOnNewRound: v === 'true' })
              }
            >
              <SelectItem value="true">{t('on')}</SelectItem>
              <SelectItem value="false">{t('off')}</SelectItem>
            </SettingSelect>
          </>
        )}
      </div>
    </section>
  );
};

export default RoomInfoArea;
