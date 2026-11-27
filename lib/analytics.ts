import {
  ANALYTICS_STATE_EVENT,
  ANALYTICS_STATE_KEY,
  type AnalyticsPipelineState,
} from './analytics-env';
import type { ShareOutcome } from './share';

/**
 * GA4 事件中的模式代碼，用來在報表裡依模式切分開局與完成數。
 * 代碼一旦上線就不要改名，否則 GA4 的歷史資料會斷成兩段。
 */
export type AnalyticsGameMode =
  | 'classic'
  | 'match'
  | 'challenge'
  | 'tabletop'
  | 'daily'
  | 'quick_math'
  | 'guess_number'
  | 'multiplayer';

type EventParams = Record<string, string | number | boolean | undefined>;

/** gtag 的設定參數（event_callback 等）可以是函式，只在本檔內部使用 */
type GtagParams = Record<
  string,
  string | number | boolean | undefined | (() => void)
>;

declare global {
  interface Window {
    gtag?: (command: 'event', name: string, params?: GtagParams) => void;
  }
}

/** 正在收集事件的呼叫（captureEvents 使用）；平常是 null */
let capturing: [string, EventParams | undefined][] | null = null;

/**
 * 送出 GA4 事件：放進 gtag 的佇列（window.dataLayer）。
 * 回傳 true 代表已排入佇列（Queued），不代表 GA4 伺服器已經收到；
 * 沒有 gtag（伺服器端，或初始化 script 被移除）時回傳 false，不影響遊戲
 */
export function trackEvent(name: string, params?: EventParams): boolean {
  capturing?.push([name, params]);
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return false;
  }
  try {
    window.gtag('event', name, params);
    return true;
  } catch {
    // 分析失敗不能影響遊戲流程
    return false;
  }
}

/** 執行 fn，回傳它送出的事件（名稱與參數），讓呼叫端在需要時原樣重送 */
export function captureEvents(
  fn: () => void,
): [string, EventParams | undefined][] {
  const previous = capturing;
  const events: [string, EventParams | undefined][] = [];
  capturing = events;
  try {
    fn();
  } finally {
    capturing = previous;
  }
  return events;
}

/**
 * 追蹤管線目前的狀態（見 lib/analytics-env.ts 的 AnalyticsPipelineState）。
 * unavailable：沒有 gtag 可以用（伺服器端，或初始化 script 沒有執行）。
 * 有 gtag 但沒有狀態紀錄（例如測試直接注入 gtag）時視為 ready
 */
export function getAnalyticsState(): AnalyticsPipelineState | 'unavailable' {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return 'unavailable';
  }
  const status = (window as unknown as Record<string, unknown>)[
    ANALYTICS_STATE_KEY
  ] as { state?: AnalyticsPipelineState } | undefined;
  return status?.state ?? 'ready';
}

/** 管線狀態變動時呼叫 listener；回傳取消監聽的函式。伺服器端什麼都不做 */
export function onAnalyticsStateChange(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(ANALYTICS_STATE_EVENT, listener);
  return () => window.removeEventListener(ANALYTICS_STATE_EVENT, listener);
}

/**
 * 送出事件後才執行 callback，給「整頁跳轉」用：gtag.js 會把事件稍微延後批次送出，
 * 直接改 window.location 可能讓事件跟著頁面一起消失。
 * 等 gtag 回呼或最多 timeoutMs（GA 被擋、尚未載入時也不會卡住）；callback 保證只執行一次
 */
export function trackEventThen(
  name: string,
  params: EventParams | undefined,
  callback: () => void,
  timeoutMs = 400,
): void {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    callback();
  };
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    run();
    return;
  }
  const timer = setTimeout(run, timeoutMs);
  try {
    window.gtag('event', name, {
      ...params,
      transport_type: 'beacon',
      event_timeout: timeoutMs,
      event_callback: () => {
        clearTimeout(timer);
        run();
      },
    });
  } catch {
    clearTimeout(timer);
    run();
  }
}

/** 一局開始（玩家可以開始操作的那一刻） */
export function trackGameStart(
  mode: AnalyticsGameMode,
  params?: EventParams,
): void {
  trackEvent('game_start', { mode, ...params });
}

/** 一局正常結束（看到結算畫面），中途離開或重開不算 */
export function trackGameComplete(
  mode: AnalyticsGameMode,
  params?: EventParams,
): void {
  trackEvent('game_complete', { mode, ...params });
}

// ---------------------------------------------------------------------------
// 快速試玩／新手引導（Growth Phase 1 P0）
// 參數一律 snake_case；秒數四捨五入到整數，不送題目數字、算式或任何個人資料。
// ---------------------------------------------------------------------------

/** 快速試玩的入口：首頁主按鈕、完成畫面的「再玩一次」、直接開網址 */
export type QuickPlaySource = 'home_hero' | 'replay' | 'direct';

/** 中途離開的方式：按離開按鈕、瀏覽器上一頁、關閉分頁或切走 App */
export type OnboardingExitReason = 'back_button' | 'navigate' | 'page_hide';

const toSeconds = (ms: number) => Math.max(0, Math.round(ms / 1000));

/** 第 1 題出現、玩家可以開始操作時，每一輪送一次 */
export function trackQuickPlayStart(params: {
  source: QuickPlaySource;
  isFirstTime: boolean;
}): void {
  trackEvent('quick_play_start', {
    source: params.source,
    is_first_time: params.isFirstTime,
  });
}

/** 這台裝置第一次在快速試玩答對任一題（呼叫端以 localStorage 保證只送一次） */
export function trackFirstPuzzleSolved(params: {
  step: number;
  elapsedMs: number;
  hintLevel: number;
}): void {
  trackEvent('first_puzzle_solved', {
    step: params.step,
    elapsed_sec: toSeconds(params.elapsedMs),
    hint_level: params.hintLevel,
  });
}

/**
 * 每一輪中每答對一題送一次（step 1–3），用來畫「每一輪」的快速試玩漏斗：
 * quick_play_start → step=1 → step=2 → step=3（等同 onboarding_complete）。
 * 與 first_puzzle_solved（每台裝置終身一次）互補；首次玩家與回訪玩家用 is_first_time 區分
 */
export function trackQuickPlayPuzzleSolved(params: {
  step: number;
  isFirstTime: boolean;
  hintLevel: number;
}): void {
  trackEvent('quick_play_puzzle_solved', {
    step: params.step,
    is_first_time: params.isFirstTime,
    hint_level: params.hintLevel,
  });
}

/** 三題全部答對、看到完成畫面，每一輪送一次 */
export function trackOnboardingComplete(params: {
  durationMs: number;
  hintsUsed: number;
  isFirstTime: boolean;
}): void {
  trackEvent('onboarding_complete', {
    duration_sec: toSeconds(params.durationMs),
    hints_used: params.hintsUsed,
    is_first_time: params.isFirstTime,
  });
}

/** 完成前離開，每一輪最多送一次；關閉分頁時用 beacon 送出 */
export function trackOnboardingExit(params: {
  step: number;
  elapsedMs: number;
  reason: OnboardingExitReason;
  isFirstTime: boolean;
}): void {
  trackEvent('onboarding_exit', {
    step: params.step,
    elapsed_sec: toSeconds(params.elapsedMs),
    reason: params.reason,
    is_first_time: params.isFirstTime,
    transport_type: 'beacon',
  });
}

// ---------------------------------------------------------------------------
// 入口點擊：補上「看到首頁 → 點了哪個入口 → 真的開始玩」之間的那一步。
// 首頁主 CTA 位在首屏，曝光直接以首頁 page_view 計算，不另送曝光事件。
// ---------------------------------------------------------------------------

/** 點擊發生的位置 */
export type CtaLocation = 'home_hero' | 'home_more_games' | 'quick_play_result';

/** 被點的入口；代碼上線後不要改名 */
export type CtaName =
  | 'quick_play'
  | 'daily_challenge'
  | 'choose_mode'
  | 'multiplayer'
  | 'quick_math'
  | 'guess_number'
  | 'replay'
  | 'explore_modes';

/** 玩家點了首頁或結算畫面上的入口按鈕（站內軟導覽用，頁面不會卸載） */
export function trackCtaClick(location: CtaLocation, cta: CtaName): void {
  trackEvent('cta_click', { location, cta });
}

/** 同 trackCtaClick，但要整頁跳轉時用：事件送出（或逾時）後才執行 navigate */
export function trackCtaClickThen(
  location: CtaLocation,
  cta: CtaName,
  navigate: () => void,
): void {
  trackEventThen('cta_click', { location, cta }, navigate);
}

/** 每日挑戰的入口（網址 ?from=）；沒帶或不認得的一律算 direct */
export type DailySource = 'home' | 'quick_play' | 'direct';

export function dailySourceFrom(from: string | null): DailySource {
  return from === 'home' || from === 'quick_play' ? from : 'direct';
}

/**
 * 分享的方式：
 * system（系統分享選單分享圖片）、system_text（圖卡失敗時只分享文字）、
 * download（下載／儲存圖片）、copy_image、copy_text、copy_link；
 * render 表示圖卡沒有產生成功
 */
export type ShareMethod =
  | 'system'
  | 'system_text'
  | 'download'
  | 'copy_image'
  | 'copy_text'
  | 'copy_link'
  | 'render';

/** 玩家在分享畫面做了一個動作，outcome 記錄實際結果（分享、複製、下載、取消、失敗） */
export function trackShare(
  mode: AnalyticsGameMode,
  outcome: ShareOutcome,
  method?: ShareMethod,
): void {
  trackEvent('share_click', { mode, outcome, method });
}

/**
 * 分享預覽打開（漏斗：結算 → 開啟預覽 → share_click）。
 * has_image=false 表示圖卡產生失敗、只能分享文字與連結
 */
export function trackShareCardOpen(
  mode: AnalyticsGameMode,
  hasImage: boolean,
): void {
  trackEvent('share_card_open', { mode, has_image: hasImage });
}

// ---------------------------------------------------------------------------
// 多人模式漏斗（Phase 3：配對與再戰）
// 大廳曝光 → 按快速開始 → 配對完成開局（或取消）→ 一局結束 → 再玩一場 → 下一局開局。
// 只送人數、秒數、類型等統計值；不送暱稱、房間名稱、密碼、token 或房間 id。
// 開局與完成沿用既有的 game_start / game_complete（mode: multiplayer），配對完成沿用 quick_match_start。
// ---------------------------------------------------------------------------

export type MultiplayerGameType = 'classic' | 'buzzer';

/** 快速開始的來源：大廳按鈕，或結算畫面的「再玩一場」 */
export type QuickMatchSource = 'lobby' | 'rematch';

/** 再玩一場的來源：快速配對的房間會重新配對，私人房間留在原房間再開一局 */
export type RematchSource = 'quick_match' | 'private_room';

export type PlayerCounts = {
  humanPlayerCount: number;
  botPlayerCount: number;
};

/**
 * 伺服器產生的場次 id（每局一個隨機 uuid，與玩家身分無關）。
 * 用來把同一局的開局、結束、再戰串起來；不是使用者或裝置識別碼
 */
const matchParam = (matchId: string | undefined) =>
  matchId ? { match_id: matchId } : {};

const countParams = (c: PlayerCounts) => ({
  human_player_count: c.humanPlayerCount,
  bot_player_count: c.botPlayerCount,
});

/** 等待的秒數取整數，負數或非數字視為 0 */
const seconds = (value: number) =>
  Number.isFinite(value) && value > 0 ? Math.round(value) : 0;

export function trackMultiplayerLobbyView(): void {
  trackEvent('multiplayer_lobby_view');
}

export function trackQuickMatchRequested(source: QuickMatchSource): void {
  trackEvent('quick_match_requested', { source });
}

/**
 * 配對結束開局（沿用既有事件名 quick_match_start；humans、bots、outcome 也保留，讓舊報表接得上）
 */
export function trackQuickMatchStarted(
  params: PlayerCounts & { matchWaitSeconds: number },
): void {
  trackEvent('quick_match_start', {
    humans: params.humanPlayerCount,
    bots: params.botPlayerCount,
    outcome: params.humanPlayerCount > 1 ? 'matched' : 'bots_only',
    game_type: 'buzzer',
    ...countParams(params),
    match_wait_seconds: seconds(params.matchWaitSeconds),
  });
}

/** 成功進到配對中的房間（漏斗 A 第 3 步：伺服器接受了快速開始） */
export function trackQuickMatchJoined(source: QuickMatchSource): void {
  trackEvent('quick_match_joined', { source });
}

/** 取消的方式：配對面板的「取消配對」，或頂部的「離開房間」 */
export type QuickMatchCancelMethod = 'cancel_button' | 'leave_button';

export function trackQuickMatchCancelled(
  params: PlayerCounts & {
    matchWaitSeconds: number;
    cancelMethod?: QuickMatchCancelMethod;
  },
): void {
  trackEvent('quick_match_cancelled', {
    ...countParams(params),
    match_wait_seconds: seconds(params.matchWaitSeconds),
    ...(params.cancelMethod ? { cancel_method: params.cancelMethod } : {}),
  });
}

/**
 * 這位玩家在這一局第一次參與作答（搶答成功或出牌），漏斗 B 第 2 步。每局每位玩家最多一次
 */
export function trackMultiplayerParticipated(params: {
  gameType: MultiplayerGameType;
  matchId?: string;
}): void {
  trackEvent('multiplayer_participated', {
    game_type: params.gameType,
    ...matchParam(params.matchId),
  });
}

/** 多人開局：沿用 game_start（mode: multiplayer），variant 保留給舊報表 */
export function trackMultiplayerGameStarted(
  params: PlayerCounts & {
    gameType: MultiplayerGameType;
    rematchSource?: RematchSource;
    matchId?: string;
  },
): void {
  trackGameStart('multiplayer', {
    variant: params.gameType,
    game_type: params.gameType,
    ...matchParam(params.matchId),
    ...countParams(params),
    ...(params.rematchSource ? { rematch_source: params.rematchSource } : {}),
  });
}

/**
 * 多人一局結束。completion_status：won／lost 是正常結算（送 game_complete），
 * aborted 是有人離開造成中斷（送 multiplayer_game_aborted，不灌高完成數）
 */
export function trackMultiplayerGameCompleted(
  params: PlayerCounts & {
    gameType: MultiplayerGameType;
    completionStatus: 'won' | 'lost' | 'aborted';
    matchId?: string;
  },
): void {
  const payload = {
    game_type: params.gameType,
    completion_status: params.completionStatus,
    ...matchParam(params.matchId),
    ...countParams(params),
  };
  if (params.completionStatus === 'aborted') {
    trackEvent('multiplayer_game_aborted', payload);
    return;
  }
  trackGameComplete('multiplayer', { variant: params.gameType, ...payload });
}

export function trackRematchClicked(params: {
  gameType: MultiplayerGameType;
  rematchSource: RematchSource;
  /** 剛結束的那一局 */
  fromMatchId?: string;
}): void {
  trackEvent('multiplayer_rematch_clicked', {
    game_type: params.gameType,
    rematch_source: params.rematchSource,
    ...(params.fromMatchId ? { from_match_id: params.fromMatchId } : {}),
  });
}

/** 按了再玩一場之後，下一局真的開局了 */
export function trackRematchStarted(
  params: PlayerCounts & {
    gameType: MultiplayerGameType;
    rematchSource: RematchSource;
    /** 再戰開始的這一局，與按下再玩一場時的那一局 */
    matchId?: string;
    fromMatchId?: string;
  },
): void {
  trackEvent('multiplayer_rematch_started', {
    game_type: params.gameType,
    rematch_source: params.rematchSource,
    ...matchParam(params.matchId),
    ...(params.fromMatchId ? { from_match_id: params.fromMatchId } : {}),
    ...countParams(params),
  });
}
