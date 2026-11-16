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

declare global {
  interface Window {
    gtag?: (command: 'event', name: string, params?: EventParams) => void;
  }
}

/** 送出 GA4 事件；GA 尚未載入、被擋或在伺服器端時直接略過，不影響遊戲 */
export function trackEvent(name: string, params?: EventParams): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }
  try {
    window.gtag('event', name, params);
  } catch {
    // 分析失敗不能影響遊戲流程
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

/** 玩家點了首頁或結算畫面上的入口按鈕 */
export function trackCtaClick(location: CtaLocation, cta: CtaName): void {
  trackEvent('cta_click', { location, cta });
}

/** 每日挑戰的入口（網址 ?from=）；沒帶或不認得的一律算 direct */
export type DailySource = 'home' | 'quick_play' | 'direct';

export function dailySourceFrom(from: string | null): DailySource {
  return from === 'home' || from === 'quick_play' ? from : 'direct';
}

/** 按下分享按鈕，outcome 記錄實際結果（分享、複製、下載、取消、失敗） */
export function trackShare(
  mode: AnalyticsGameMode,
  outcome: ShareOutcome,
): void {
  trackEvent('share_click', { mode, outcome });
}
