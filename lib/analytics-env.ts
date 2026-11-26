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
 * 產生 GA4 初始化的 inline script。
 * - 每個網域都定義 window.gtag（只把指令放進本地的 window.dataLayer），
 *   已經有 gtag（測試注入的記錄器）就不覆蓋；E2E 從 dataLayer 讀事件來驗證
 * - 只有正式網域才送出 config 並載入 gtag.js；其他網域的 dataLayer 不會被送往 Google
 */
export function gaInitScript(measurementId: string): string {
  const hosts = JSON.stringify(ANALYTICS_PRODUCTION_HOSTS);
  const id = JSON.stringify(measurementId);
  const debugKey = JSON.stringify(GA_DEBUG_STORAGE_KEY);
  return `(function () {
  var hosts = ${hosts};
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function () { window.dataLayer.push(arguments); };
  }
  if (hosts.indexOf(location.hostname.toLowerCase()) === -1) return;
  var debug = false;
  try {
    var param = new URLSearchParams(location.search).get('ga_debug');
    if (param === '1') sessionStorage.setItem(${debugKey}, '1');
    if (param === '0') sessionStorage.removeItem(${debugKey});
    debug = sessionStorage.getItem(${debugKey}) === '1';
  } catch (e) {}
  window.gtag('js', new Date());
  window.gtag('config', ${id}, debug ? { debug_mode: true } : {});
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(${id});
  document.head.appendChild(s);
})();`;
}
