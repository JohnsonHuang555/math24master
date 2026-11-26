/**
 * GA4 只在正式網域載入 gtag.js：本機開發、E2E、Vercel preview 與其他網域的事件
 * 只留在瀏覽器的 dataLayer，不會送到 Google，避免混進正式報表（見 docs/MULTIPLAYER_ANALYTICS.md）。
 *
 * 正式網域上加 `?ga_debug=1` 會開啟 GA4 DebugView（debug_mode），
 * 記在 sessionStorage，同一個分頁換頁後仍然有效；`?ga_debug=0` 關閉。
 */
export const ANALYTICS_PRODUCTION_HOSTS = [
  'math24master.com',
  'www.math24master.com',
] as const;

export function isAnalyticsHost(hostname: string): boolean {
  return (ANALYTICS_PRODUCTION_HOSTS as readonly string[]).includes(
    hostname.toLowerCase(),
  );
}

export const GA_DEBUG_STORAGE_KEY = 'ga_debug';

/**
 * 追蹤管線的狀態（記在 window[ANALYTICS_STATE_KEY].state，變動時發出 ANALYTICS_STATE_EVENT）：
 * - local：不是正式網域，事件只放進本地 dataLayer，不會送往 Google
 * - loading：正式網域，事件已放進 dataLayer 佇列，等 gtag.js 載入後依序處理
 * - ready：gtag.js 已載入並處理過佇列；之後的事件直接交給 gtag.js
 * - blocked：gtag.js 載入失敗（廣告攔截、網路錯誤），事件不會送出，也不重試
 *
 * 注意：ready 代表「已交給 gtag.js」，不代表 GA4 伺服器已經收到
 */
export type AnalyticsPipelineState = 'local' | 'loading' | 'ready' | 'blocked';

export const ANALYTICS_STATE_KEY = '__m24Analytics';
export const ANALYTICS_STATE_EVENT = 'm24:analytics-state';

/**
 * 產生 GA4 初始化的 inline script。由 next/script 的 beforeInteractive 放在 <head>，
 * 在任何 React 程式碼執行前就跑完，所以事件觸發時 window.gtag 一定已經存在：
 * - 每個網域都定義 window.gtag（只把指令放進本地的 window.dataLayer），
 *   已經有 gtag（測試注入的記錄器）就不覆蓋；E2E 從 dataLayer 讀事件來驗證
 * - 只有正式網域才送出 config 並載入 gtag.js；其他網域的 dataLayer 不會被送往 Google
 * - gtag.js 載入成功或失敗時更新管線狀態，讓多人 tracker 知道佇列裡的事件有沒有交出去
 */
export function gaInitScript(measurementId: string): string {
  const hosts = JSON.stringify(ANALYTICS_PRODUCTION_HOSTS);
  const id = JSON.stringify(measurementId);
  const debugKey = JSON.stringify(GA_DEBUG_STORAGE_KEY);
  const stateKey = JSON.stringify(ANALYTICS_STATE_KEY);
  const stateEvent = JSON.stringify(ANALYTICS_STATE_EVENT);
  return `(function () {
  var hosts = ${hosts};
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function () { window.dataLayer.push(arguments); };
  }
  var status = window[${stateKey}] = window[${stateKey}] || {};
  function setState(next) {
    status.state = next;
    try { window.dispatchEvent(new Event(${stateEvent})); } catch (e) {}
  }
  if (hosts.indexOf(location.hostname.toLowerCase()) === -1) {
    setState('local');
    return;
  }
  var debug = false;
  try {
    var param = new URLSearchParams(location.search).get('ga_debug');
    if (param === '1') sessionStorage.setItem(${debugKey}, '1');
    if (param === '0') sessionStorage.removeItem(${debugKey});
    debug = sessionStorage.getItem(${debugKey}) === '1';
  } catch (e) {}
  window.gtag('js', new Date());
  window.gtag('config', ${id}, debug ? { debug_mode: true } : {});
  setState('loading');
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(${id});
  s.onload = function () { setState('ready'); };
  s.onerror = function () { setState('blocked'); };
  document.head.appendChild(s);
})();`;
}
