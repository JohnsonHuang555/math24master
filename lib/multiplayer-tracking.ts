import { GameStatus } from '@/models/GameStatus';
import { RoomView } from '@/models/RoomView';
import {
  MultiplayerGameType,
  PlayerCounts,
  QuickMatchCancelMethod,
  QuickMatchSource,
  RematchSource,
  trackMultiplayerGameCompleted,
  trackMultiplayerGameStarted,
  trackMultiplayerLobbyView,
  trackMultiplayerParticipated,
  trackQuickMatchCancelled,
  trackQuickMatchJoined,
  trackQuickMatchRequested,
  trackQuickMatchStarted,
  trackRematchClicked,
  trackRematchStarted,
} from './analytics';

/**
 * 多人模式的分析事件都從這裡送出，並在這裡去重（見 docs/MULTIPLAYER_ANALYTICS.md）。
 *
 * 不靠 React effect 判斷「是不是新的一局」：一局以伺服器產生的 matchId 識別，
 * 已經送過的事件記在 sessionStorage，所以
 * - 重新整理、斷線重連（同一個分頁、同一局）不會再送一次開局或結束
 * - React Strict Mode 重跑 effect、同一份房間資料收到兩次，也只送一次
 * - 再玩一場換到下一局（新的 matchId）才會再送
 *
 * sessionStorage 不能用時（隱私模式、被停用）退回記憶體，只是重新整理後不能去重。
 * 只送人數、秒數、類型與隨機的場次 id；不送暱稱、房間 id、密碼或 token。
 */

const PREFIX = 'mp_analytics:';
/** 再玩一場的意圖超過這麼久還沒開局，就不再算成再戰開局 */
const REMATCH_INTENT_TTL_MS = 15 * 60 * 1000;

export type TrackerStorage = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>;

type RematchIntent = {
  source: RematchSource;
  gameType: MultiplayerGameType;
  fromMatchId?: string;
  at: number;
};

export function countPlayers(players: { isBot?: boolean }[]): PlayerCounts {
  const bots = players.filter(p => p.isBot).length;
  return { humanPlayerCount: players.length - bots, botPlayerCount: bots };
}

export function createMultiplayerTracker(
  storage: TrackerStorage | null,
  now: () => number = Date.now,
) {
  const memory = new Map<string, string>();
  const get = (key: string): string | null => {
    try {
      const value = storage?.getItem(PREFIX + key);
      if (value !== null && value !== undefined) return value;
    } catch {
      // 讀不到就看記憶體
    }
    return memory.get(key) ?? null;
  };
  const set = (key: string, value: string) => {
    memory.set(key, value);
    try {
      storage?.setItem(PREFIX + key, value);
    } catch {
      // 存不進去（空間滿、被停用）：至少這個分頁的記憶體裡有
    }
  };
  const remove = (key: string) => {
    memory.delete(key);
    try {
      storage?.removeItem(PREFIX + key);
    } catch {
      // 忽略
    }
  };
  /** 同一個 key 只執行一次（跨重新整理） */
  const once = (key: string, fn: () => void) => {
    if (get(`once:${key}`)) return false;
    set(`once:${key}`, '1');
    fn();
    return true;
  };

  const readRematch = (): RematchIntent | null => {
    const raw = get('rematch');
    if (!raw) return null;
    try {
      const intent = JSON.parse(raw) as RematchIntent;
      if (now() - intent.at > REMATCH_INTENT_TTL_MS) {
        remove('rematch');
        return null;
      }
      return intent;
    } catch {
      remove('rematch');
      return null;
    }
  };

  const waitSeconds = () => {
    const startedAt = Number(get('qm_started_at'));
    return startedAt > 0 ? (now() - startedAt) / 1000 : 0;
  };

  const quickMatchRequested = (source: QuickMatchSource) => {
    set('qm_started_at', String(now()));
    trackQuickMatchRequested(source);
  };

  return {
    /** 已經等了幾秒（從按下快速開始或再玩一場起算；重新整理後仍然接得上） */
    quickMatchWaitSeconds: waitSeconds,

    /** 進入多人大廳。回到大廳代表不是在等再戰，清掉還沒用掉的再戰意圖 */
    lobbyView() {
      remove('rematch');
      trackMultiplayerLobbyView();
    },

    quickMatchRequested,

    /**
     * 每次收到自己所在房間的資料（加入、更新、重連）都呼叫。
     * 依房間狀態判斷漏斗進度，每一步每間房／每一局只送一次
     */
    roomView(room: RoomView | undefined) {
      if (!room?.self) return;
      const counts = countPlayers(room.players);
      const rematch = readRematch();

      // 漏斗 A：進到配對中的房間 → 配對完成
      if (room.isQuickMatch && room.quickMatchPending) {
        once(`qm_joined:${room.roomId}`, () =>
          trackQuickMatchJoined(
            rematch?.source === 'quick_match' ? 'rematch' : 'lobby',
          ),
        );
      }
      if (
        room.isQuickMatch &&
        !room.quickMatchPending &&
        // 只算自己在配對中待過的房間（從邀請連結進到已開局的房間不算配對完成）
        get(`once:qm_joined:${room.roomId}`)
      ) {
        once(`qm_start:${room.roomId}`, () => {
          trackQuickMatchStarted({
            ...counts,
            matchWaitSeconds: waitSeconds(),
          });
          remove('qm_started_at');
        });
      }

      // 開局：一局（matchId）只算一次；按過再玩一場的話也記一次再戰開局
      if (room.status === GameStatus.Playing && room.matchId) {
        const matchId = room.matchId;
        once(`start:${matchId}`, () => {
          const isRematch = !!rematch && rematch.fromMatchId !== matchId;
          trackMultiplayerGameStarted({
            gameType: room.settings.gameType,
            matchId,
            rematchSource: isRematch ? rematch.source : undefined,
            ...counts,
          });
          if (isRematch) {
            trackRematchStarted({
              gameType: room.settings.gameType,
              rematchSource: rematch.source,
              matchId,
              fromMatchId: rematch.fromMatchId,
              ...counts,
            });
          }
          remove('rematch');
        });
      }
    },

    /** 這一局第一次參與作答（搶答成功、出牌） */
    participated(room: RoomView | undefined) {
      if (!room?.matchId || room.status !== GameStatus.Playing) return;
      const matchId = room.matchId;
      once(`participated:${matchId}`, () =>
        trackMultiplayerParticipated({
          gameType: room.settings.gameType,
          matchId,
        }),
      );
    },

    /** 正常結算（自己收到結算、看到結算畫面）；同一局只算一次 */
    gameOver(params: {
      gameType: MultiplayerGameType;
      matchId?: string;
      won: boolean;
      players: { isBot?: boolean }[];
    }) {
      const record = () =>
        trackMultiplayerGameCompleted({
          gameType: params.gameType,
          matchId: params.matchId,
          completionStatus: params.won ? 'won' : 'lost',
          ...countPlayers(params.players),
        });
      // 舊版伺服器沒有 matchId 時無法去重，照常送一次
      if (!params.matchId) return record();
      once(`end:${params.matchId}`, record);
    },

    /** 有人離開造成這一局中斷（不算完成）；和正常結算共用去重，一局只會有其中一個 */
    aborted(room: RoomView | undefined) {
      if (!room) return;
      const record = () =>
        trackMultiplayerGameCompleted({
          gameType: room.settings.gameType,
          matchId: room.matchId,
          completionStatus: 'aborted',
          ...countPlayers(room.players),
        });
      if (!room.matchId) return record();
      once(`end:${room.matchId}`, record);
    },

    /** 結算畫面按「再玩一場」；同一局連點只算一次 */
    rematchClicked(room: RoomView) {
      const source: RematchSource = room.isQuickMatch
        ? 'quick_match'
        : 'private_room';
      const gameType = room.settings.gameType;
      once(`rematch_click:${room.matchId ?? room.roomId}`, () => {
        trackRematchClicked({
          gameType,
          rematchSource: source,
          fromMatchId: room.matchId,
        });
        set(
          'rematch',
          JSON.stringify({
            source,
            gameType,
            fromMatchId: room.matchId,
            at: now(),
          } satisfies RematchIntent),
        );
        if (source === 'quick_match') quickMatchRequested('rematch');
      });
      return source;
    },

    /** 開局前離開配對（取消配對或離開房間）；同一間房只算一次 */
    quickMatchCancelled(room: RoomView, method: QuickMatchCancelMethod) {
      if (!room.quickMatchPending) return;
      once(`qm_cancel:${room.roomId}`, () => {
        trackQuickMatchCancelled({
          ...countPlayers(room.players),
          matchWaitSeconds: waitSeconds(),
          cancelMethod: method,
        });
        remove('qm_started_at');
        remove('rematch');
      });
    },
  };
}

export type MultiplayerTracker = ReturnType<typeof createMultiplayerTracker>;

let shared: MultiplayerTracker | null = null;

/** 瀏覽器裡共用一個（同一個分頁的 sessionStorage） */
export function getMultiplayerTracker(): MultiplayerTracker {
  if (!shared) {
    let storage: TrackerStorage | null = null;
    try {
      storage = typeof window !== 'undefined' ? window.sessionStorage : null;
    } catch {
      storage = null;
    }
    shared = createMultiplayerTracker(storage);
  }
  return shared;
}
