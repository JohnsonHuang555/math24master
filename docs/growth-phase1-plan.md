# Growth Optimization Phase 1 — 技術方案

> 狀態：方案已確認（2026-11-13），P0 實作中
> 範圍：P0 首次遊玩流程、P1 每日挑戰留存、P2 好友挑戰分享。每個階段各自一個 PR，可獨立驗證與回滾。
> 基準：`main` @ `0829d74`

---

## 1. 現況盤點：哪些已經有、可以直接複用

| 需求 | 現況 | 結論 |
|------|------|------|
| 數字牌、算式列、符號鍵、操作列 | `components/areas/puzzle-play-area.tsx`（經典、挑戰共用），內含 `NumberCard`、`ExpressionBar`、`Symbols`、鍵盤快捷鍵、即時結果預覽 | **P0 直接複用**，不另做一套 UI |
| 算式驗算 | `lib/utils.ts` 的 `calculateAnswer(SelectedCard[])`（mathjs） | P0 沿用；另抽出純函式做「是否用滿 4 張＋等於 24」判斷，方便單元測試 |
| 有解驗證、所有解法 | `lib/daily-seed.ts` 的 `canMake24()`、`findAllSolutions()` | P0 題庫驗證、提示與「看答案」、P2 連結驗證都用它 |
| 隨機有解題 | `lib/puzzle-generator.ts` 的 `generateOnePuzzle()`（1–13） | P0 第三題（一般難度）可直接用 |
| 結算畫面 | `components/game/game-result-screen.tsx`（大數字＋統計格＋兩顆按鈕） | P0 完成畫面複用，額外按鈕放 `children` |
| GA4 | `lib/analytics.ts`：`trackEvent` / `trackGameStart` / `trackGameComplete` / `trackShare`，已有單元測試 | P0/P1/P2 都在這裡擴充 |
| 首頁每日挑戰狀態 | `more-modes-section.tsx` 的 `DailyStatusPills` 已顯示「今日完成／未完成」與連續天數 | **P1-1 大半已存在**，主要是把它提升成主要區塊 |
| 每日挑戰結算 | 已顯示總分、連續天數、距離換題倒數（`NextPuzzleCountdown`）、分享文字、各題解法 | **P1-2 大半已存在**，只缺「明天回來」的鼓勵資訊與追蹤事件 |
| UTC+8 日期 | `lib/date.ts` 的 `getTaipeiDateString()`、`msUntilNextTaipeiDay()` | 沿用，不改每日出題規則 |
| 分享 | `lib/share.ts` 的 `shareResult()`（Web Share API → 複製 fallback），已支援 `url` | P2 沿用 |
| SEO | `i18n/seo.ts` 的 `pageMetadata()`（canonical、hreflang、OG）、`translated-paths.ts` | P2 新頁面套用；OG 圖目前全站共用 `logo.webp` |
| 可信成績 | ADR 0011：HMAC 簽章的開局憑證＋成績收據（`app/api/leaderboard/*`） | P2-3 若要比較邀請者成績，沿用同一套簽章機制，不另建資料庫 |

---

## 2. 需求與現有規則的衝突、需要先決定的事

### 2.1 「正確算式驗證與既有規則一致」——但既有規則不一致

| 模式 | 必須用滿全部牌？ | 誤差容忍 | 驗算函式 |
|------|----------------|---------|---------|
| 經典 | 是（`mustUseAll`） | — | `calculateAnswer` |
| 每日挑戰 | 是（4 張） | `1e-6` | `evaluateFormula`（另一套 `FormulaItem` 結構） |
| 挑戰模式 | **否**（`4 × 6` 只用 2 張也算對） | `1e-9` | `calculateAnswer` |

建議：新手引導採 **經典／每日挑戰的規則（4 張都要用）**，也就是一般人認知的 24 點。挑戰模式接受部分用牌的行為不在本次範圍，不改（會動到計分與排行榜），但列為已知差異，之後另開 issue 討論。

每日挑戰頁自己實作了一套選牌與驗算（`FormulaItem`），與 `PuzzlePlayArea` 重複。本次 **不重構每日挑戰頁**，避免 P1 不破壞每日出題的驗收風險；P0 只用 `PuzzlePlayArea` 那套。

### 2.1.1 既有 bug：相鄰數字會被串成多位數

`calculateAnswer()` 把選牌直接 `join('')` 後交給 mathjs，所以連點 `2`、`4` 會變成 `24`，`(1+2)(3+5)` 也會被當成隱式乘法。經典、挑戰、每日挑戰與多人模式都受影響（例如每日挑戰牌面 `2 4 3 3` 可以送出 `24 × 3 ÷ 3`）。牌桌模式已有 `isWellFormed` 擋下。

本次不改既有模式（會影響計分與排行榜，需另行討論），只在快速試玩使用新的 `checkAnswer()`（數字與符號必須交替、括號平衡），並另開 issue 追蹤既有模式的修正。

### 2.2 `PuzzlePlayArea` 空送出會跳「跳過」確認

目前在沒選牌時按「確認」會跳出「要跳過這題嗎？」彈窗。新手引導沒有跳過機制，需要加一個可選 prop（例如 `onEmptySubmit`）讓呼叫端改為顯示提示；預設行為不變，經典與挑戰不受影響。

### 2.3 快速試玩放在哪裡（**需要你決定**）

| 方案 | 做法 | 優點 | 缺點 |
|------|------|------|------|
| **A. 獨立路由 `/quick-play`（建議）** | 首頁「立即開始」導到 `/quick-play`，直接出第一題，無模式選擇 | 首頁 HTML／JS 完全不動，SEO 與效能零風險；返回鍵行為正常；GA4 有獨立 page_view 方便看漏斗；回滾只要改回 CTA 連結 | 多一次頁面切換（但不用選模式，仍是一次點擊進題目） |
| B. 首頁內嵌全螢幕遊戲層 | 按「立即開始」在首頁開啟遊戲層，元件用 `next/dynamic` 點擊後才載入 | 字面上最符合「在首頁提供」 | 返回鍵、捲動鎖定、鍵盤焦點要另外處理；首頁 client 元件變複雜 |
| C. Hero 直接放可玩的題目 | Hero 的四張牌就是第一題 | 轉換最短 | 首屏需要遊戲 JS，影響 LCP／INP；手機 hero 空間不夠放符號鍵與操作列 |

`/quick-play` 會設 `noindex`、不列入 sitemap（它是功能頁，不是內容頁），所以不會稀釋首頁 SEO。

### 2.4 首頁 CTA 的分流（**需要你決定**）

建議：主 CTA「立即開始」→ `/quick-play`；原本的 `/single-play` 保留為次要按鈕「選擇模式」（與「多人對戰」並列）。
不建議依 localStorage 判斷新舊玩家改變 CTA 目的地：首頁是 SSR，掛載後才換連結會閃一下，也讓 GA4 很難比較。
已完成新手引導的玩家再進 `/quick-play`：直接給 3 題一般難度、不顯示操作提示，等於「隨手一局」。

### 2.5 新手題目的難度怎麼定

現有程式沒有難度分級。建議 **固定題庫＋測試保證**，而不是即時隨機分級：

- 第 1 題：只用加減就能解（例如 `6 6 6 6`、`4 5 7 8`）——題庫約 10 組，隨機抽一。
- 第 2 題：需要一次乘法或括號（例如 `2 3 4 5` → `(5+3−2)×4`）——題庫約 10 組。
- 第 3 題：`generateOnePuzzle()` 一般隨機題。

單元測試用 `canMake24()` 驗證每組都有解，用 `findAllSolutions()` 驗證第 1 題存在只含 `+ −` 的解、第 2 題不存在只含 `+ −` 的解。題庫寫在 `lib/onboarding-puzzles.ts`。

### 2.6 提示與答案

「不直接顯示完整答案，除非玩家主動要求」：遊戲中提供「提示」按鈕，兩段式：

1. 第一次按：顯示某一個解法的第一步（例如「先算 6 − 2」）。
2. 第二次按：確認後顯示完整算式（由 `findAllSolutions()` 取分數最低、最直觀的一個）。

使用提示會記入事件參數 `hint_level`，不影響完成判定。

### 2.7 部署面的注意事項

- `.github/workflows/cloud-run.yml` 在 `lib/**` 變動時會重新部署 Socket.IO 伺服器，房間狀態在記憶體裡，**重新部署會中斷進行中的多人遊戲**。P0/P2 都會新增 `lib/` 檔案，合併時間建議挑離峰。（另一個做法是把 workflow 的 `paths` 改成只看 server 真正 import 的檔案，但那是部署設定變更，不在本次範圍。）
- 前端在 Vercel，P2 的動態 OG 圖用 `next/og`（`ImageResponse`）可以直接跑，不需要新相依。
- CI 不跑 E2E（需要 Java），E2E 要在本機跑過再附結果到 PR。

---

## 3. P0 — 首次遊玩流程（PR 1）

### 3.1 流程

```
首頁「立即開始」
  → /quick-play（直接出第 1 題，不登入、不選難度）
  → 可關閉的操作提示（點牌 → 點符號 → 確認，三步）
  → 第 1 題（簡單）→ 第 2 題（稍難）→ 第 3 題（一般）
  → 完成畫面：完成題數、耗時、[再玩一次] [挑戰今日題目] [探索其他模式]
```

- 完成狀態存 localStorage：`math24_onboarding_v1 = { completedAt, durationMs }`。
- 操作提示關閉狀態存同一個 key（`tipsDismissed`），關掉就不再出現。
- 「挑戰今日題目」：今天已完成時改顯示「今日已完成」並仍可進入看結果（沿用 `getDailyStatus()`）。
- 耗時：從第 1 題出現到第 3 題答對，用 `performance.now()` 差值；分頁切到背景不暫停（與快答一致，簡單且不易出錯）。
- 不寫入任何統計、成就、排行榜（避免影響既有計分與紀錄）。這點**需要你確認**：是否要讓新手引導也算「首次出牌成功」等成就？建議先不算。

### 3.2 分析事件（擴充 `lib/analytics.ts`）

共用參數一律 snake_case；`source` 表示入口（`home_hero`、`direct`）。

| 事件 | 觸發時機 | 參數 | 去重方式 |
|------|---------|------|---------|
| `quick_play_start` | `/quick-play` 第 1 題可操作的那一刻 | `source`、`is_first_time`（是否從未完成過引導） | 每次頁面載入至多一次（ref） |
| `first_puzzle_solved` | 這台裝置**第一次**在快速試玩答對任一題 | `step`（1–3）、`elapsed_sec`、`hint_level` | localStorage 旗標，終身一次 |
| `onboarding_complete` | 第 3 題答對、看到完成畫面 | `duration_sec`、`hints_used`、`is_first_time` | 每輪一次（ref） |
| `onboarding_exit` | 玩家在完成前離開：按返回鍵／返回首頁，或 `pagehide` | `step`（停在第幾題）、`elapsed_sec`、`reason`（`back_button` / `page_hide`） | 每輪一次；完成後不再送 |

- 「再玩一次」開新一輪會重新送 `quick_play_start`（`is_first_time=false`）。
- 不送算式內容、題目數字或任何個人資料。
- `pagehide` 由 gtag 預設的 beacon transport 送出；送不出去時資料會偏少，這點會寫在 GA4 報表說明。

### 3.3 新增／修改檔案

**新增**

| 檔案 | 內容 |
|------|------|
| `app/[locale]/quick-play/layout.tsx` | metadata（`noindex`）、MainLayout |
| `app/[locale]/quick-play/page.tsx` | 頁面（client）：串接 hook 與 `PuzzlePlayArea` |
| `hooks/useQuickPlay.ts` | 狀態機 `tips → playing(step 1–3) → completed`、計時、提示、事件 |
| `components/quick-play/quick-play-stage.tsx` | 牌面上方回饋區：答錯原因、兩段式提示、可跳過的三步操作提示 |
| `components/quick-play/quick-play-result.tsx` | 完成畫面（包 `GameResultScreen`） |
| `lib/onboarding-puzzles.ts` | 三階題庫與抽題函式 |
| `lib/onboarding-storage.ts` | localStorage 讀寫（容錯：壞資料、無痕模式） |
| `lib/answer-check.ts` | 純函式 `checkAnswer(cards, selected, { requireAllCards })` → `{ ok } \| { error: 'INVALID' \| 'NOT_ALL_CARDS' \| 'NOT_24', value? }`，內部用 `calculateAnswer` |
| `lib/__tests__/onboarding-puzzles.test.ts`、`onboarding-storage.test.ts`、`answer-check.test.ts` | 單元測試 |
| `e2e/quick-play.spec.ts` | E2E（桌機＋手機 viewport） |

**修改**

| 檔案 | 改動 |
|------|------|
| `components/homepage/hero-section.tsx` | 主 CTA 改到 `/quick-play`；新增次要按鈕「選擇模式」→ `/single-play` |
| `components/areas/puzzle-play-area.tsx` | 加可選 prop `onEmptySubmit`、`extraActions`（放提示按鈕）；預設行為不變 |
| `lib/analytics.ts`、`lib/__tests__/analytics.test.ts` | 4 個新事件函式與測試（不送 `game_start`，避免灌高既有模式的開局數） |
| `messages/zh-TW.json`、`messages/en.json`（＋重跑 `npm run i18n:zh-cn`） | `QuickPlay` namespace、`Home.chooseMode`、`Metadata.quickPlay` |
| `i18n/page-metadata.tsx` | `PageKey` 加 `quickPlay` |
| `i18n/translated-paths.ts` | 加 `/quick-play`（三語系都翻好） |
| `app/[locale]/quick-play/layout.tsx` | metadata 加 `robots: noindex, follow` |

不動：`app/sitemap.ts`（不列入）、每日挑戰、經典、挑戰、消消樂、牌桌任何邏輯。

### 3.4 測試

- 單元：題庫每組有解、第 1／2 題的難度性質、`checkAnswer` 各種錯誤（括號不平衡、沒用滿 4 張、除以零、浮點誤差 `8/(3-8/3)`）、onboarding storage 壞資料容錯、事件去重。
- E2E（`e2e/quick-play.spec.ts`，沿用 `helpers/solver.ts`、`helpers/play.ts`）：
  1. 桌機：首頁點「立即開始」→ 關掉提示 → 解 3 題 → 完成畫面三顆按鈕都在、連結正確。
  2. 手機（`devices['Pixel 7']`）：同上，確認觸控可完成。
  3. 答錯一次（沒用滿 4 張）有錯誤提示、不會前進。
  4. 「選擇模式」仍能進 `/single-play`，既有 `single-play.spec.ts` 全數通過。
- 手動：Lighthouse 首頁分數前後對照（預期不變），三語系截圖。

### 3.5 風險

| 風險 | 影響 | 緩解 |
|------|------|------|
| CTA 改道讓習慣直接選模式的老玩家多一步 | 小 | 次要按鈕「選擇模式」一鍵直達 |
| 第 3 題隨機題對新手太難 | 新手卡在第 3 題 | 提示按鈕；看 `onboarding_exit` 的 `step=3` 比例，必要時第 3 題也改題庫 |
| `lib/` 變動觸發 socket 重新部署 | 中斷進行中的多人房 | 離峰合併 |
| GA4 被擋（廣告攔截） | 事件少算 | 已知限制，報表註明 |

回滾：revert PR 即可；唯一殘留是 localStorage 的 `math24_onboarding_v1`，無副作用。

---

## 4. P1 — 每日挑戰留存（PR 2）

### 4.1 改動

**P1-1 首頁主要區塊**：把每日挑戰從「更多模式」三格之一，提升成 hero 下方的獨立橫幅卡（`components/homepage/daily-challenge-banner.tsx`），複用 `getDailyStatus()`：

- 尚未挑戰：「今日挑戰（3 題）」＋連續天數＋主按鈕「開始今日挑戰」。
- 已完成：勾選狀態＋今日分數＋連續天數＋距離換題倒數＋次要按鈕「查看結果」。
- 狀態讀 localStorage，所以掛載前顯示固定高度的骨架，避免版面跳動（CLS）。
- 「更多模式」區塊移除每日挑戰卡，換成其他內容或維持兩格（需要你看截圖決定）。

**P1-2 回訪激勵**（`daily-challenge/page.tsx` 結算畫面）：已有分數、連續天數、倒數；新增一行回訪資訊，例如「明天 00:00（台灣時間）回來，連續天數會變成 N+1」，海外玩家另顯示換題時間的當地時間（用目前語系格式化）。「挑戰朋友」目前導到多人對戰，P2 再改成好友挑戰連結。

**P1-3 留存資料**：

| 要分析的 | 做法 |
|---------|------|
| 每日挑戰開始人數 | 既有 `game_start{mode:'daily'}` |
| 完成率 | 既有 `game_complete{mode:'daily'}` ÷ 開始；新增參數 `daily_date` |
| 完成後隔天再挑戰比例 | `game_start{mode:'daily'}` 新增 `days_since_last_complete`（由 localStorage 紀錄算出：1 = 昨天有完成、0 = 從未完成、N = 隔 N 天）。不需要使用者識別就能直接看分布 |
| D1 / D7 | GA4「同類群組探索」，以 `game_complete{mode:'daily'}` 為進入條件、`game_start{mode:'daily'}` 為回訪條件 |

另設 GA4 自訂維度：`days_since_last_complete`、`streak`（事件範圍）。

**分析限制（會寫進 PR 與報表說明）**：

- 匿名玩家以瀏覽器 cookie（`_ga`）識別，**換裝置、換瀏覽器、清除資料都會被算成新使用者**，D1／D7 會偏低。
- iOS Safari 的 ITP 會把 JavaScript 設定的 cookie 期限壓到 7 天，**D7 在 iOS 上會明顯低估**；`days_since_last_complete` 來自 localStorage，同樣受 ITP 7 天清除影響。
- 廣告攔截器會擋 GA4。
- 因此 D1／D7 只看趨勢（改版前後比較），不當絕對值。

### 4.2 檔案

新增 `components/homepage/daily-challenge-banner.tsx`、`lib/__tests__/daily-status.test.ts`；修改 `components/homepage/index.tsx`、`more-modes-section.tsx`、`app/[locale]/daily-challenge/page.tsx`（結算畫面一行＋事件參數）、`lib/daily-seed.ts`（新增 `getDaysSinceLastComplete()`，不改出題與存檔函式）、`lib/analytics.ts`、messages。

### 4.3 測試

用 `vi.setSystemTime` 固定時間：

- 台灣 23:59:59 → 00:00:00 換日：`getTaipeiDateString`、`getDailyStatus`、`msUntilNextTaipeiDay`。
- 玩家時區不同（`process.env.TZ` 設 `America/Los_Angeles`、`Pacific/Kiritimati`）：每日挑戰日仍依台灣時間。
- 連續天數：昨天完成／斷一天／同一天重玩不重算／跨月、跨年。
- 舊資料相容：舊 `dailyChallenge_YYYY-MM-DD` key 遷移、缺 `maxStreak` 的紀錄、壞掉的 JSON。
- 頁面停在完成畫面跨過 00:00：倒數歸零後首頁橫幅顯示「尚未挑戰」。
- 現有 `daily-seed.test.ts` 加一組「固定日期 → 固定題目」快照，確保出題規則沒被動到。

### 4.4 風險

- 首頁版面改動影響 CLS：用固定高度骨架。
- 每日挑戰頁本身是單檔 600 行，只做最小改動，不順手重構。

---

## 5. P2 — 好友挑戰分享（PR 3）

### 5.1 連結格式

`/challenge/3-8-8-3`（路徑參數，四個 1–13 的整數，排序後正規化成 `3-3-8-8`，非正規化的網址 301 到正規化版本）。

- 無狀態、可重複使用、不同裝置都能開，不需要資料庫。
- Server 端（`page.tsx` 與 OG 圖）重新驗證：格式、長度、範圍、`canMake24()`；任一不過 → 顯示友善的「這個挑戰連結無效」頁＋「挑戰今日題目」「隨機一題」按鈕，HTTP 404。
- 網址只帶題目，不帶答案、不帶成績。
- 題目組合共 1,820 種，頁面一律 `noindex, follow`，canonical 指向自己，不列 sitemap——避免成為大量相似頁（也符合「不做大規模 SEO 頁」）。
- 每日挑戰分享：每日挑戰當天每人題目相同，分享連結就是 `/daily-challenge`；「挑戰朋友」從每日結算移到分享按鈕附近。其他可分享的入口：P0 完成畫面（分享最後一題）、挑戰模式結算（分享最後答對的一題）——**需要你確認要開放哪幾個入口**，建議先開 P0 完成畫面與每日挑戰兩個。

### 5.2 OG 預覽

`app/[locale]/challenge/[cards]/opengraph-image.tsx`，用 `next/og` 產生 1200×630 圖：產品名、挑戰描述、四張數字牌（沿用設計系統色）。

- `next/og` 預設字型沒有中文字，需要放一個**只含所需字元的 Noto Sans TC 子集**（約 50–100 KB）到 repo；英文版用拉丁字型。這是本次唯一的新靜態資源。
- 加 `Cache-Control` 長快取（同一組牌的圖永遠相同）。
- LINE 與 Facebook 會快取預覽，上線後用 Facebook Sharing Debugger 與 LINE 的 Page Poker 驗證。
- 複製網址仍是 fallback（`shareResult` 既有行為）。

### 5.3 受邀玩家體驗

開連結直接看到四張牌與「朋友挑戰你」的說明 → 一鍵開始（複用 `PuzzlePlayArea` 與 P0 的 `checkAnswer`）→ 完成畫面顯示自己的耗時 → [再分享這題] [挑戰今日題目] [隨機一題]。

**比較邀請者成績（建議延到 P2b，先不做）**。若要做，方案是沿用 ADR 0011 的簽章：

1. 邀請者答題時向 server 拿開局憑證（記錄題目與 server 開局時間）。
2. 答對後送 `/api/challenge/finish`，server 驗證算式、計算 server 端經過時間，簽一張含 `{cards, seconds, issuedAt}` 的收據。
3. 分享連結帶這張收據（`?r=...`），受邀頁只顯示驗章通過的成績，驗章失敗就當沒有。

不需要資料庫；但與 ADR 0011 一樣，擋得住改網址，擋不住寫程式自動解題。

### 5.4 事件

| 事件 | 觸發時機 | 參數 |
|------|---------|------|
| `challenge_share` | 按下分享且結果不是取消 | `source`（`quick_play` / `daily` / `challenge_result`）、`outcome` |
| `challenge_link_open` | 受邀頁載入且題目有效 | `valid`（無效連結另送 `valid=false`） |
| `challenge_invited_start` | 受邀玩家開始作答 | — |
| `challenge_invited_complete` | 受邀玩家答對 | `elapsed_sec`、`hint_level` |

不送題目數字、算式、答案；分享連結本身帶 `utm_source=share&utm_medium=challenge`，讓 GA4 的流量來源能歸因。

### 5.5 檔案

新增 `app/[locale]/challenge/[cards]/{page.tsx,layout.tsx,opengraph-image.tsx}`、`components/challenge/invited-challenge.tsx`、`lib/challenge-link.ts`（解析、正規化、驗證、組網址）＋測試、`public/fonts/` 字型子集、`e2e/friend-challenge.spec.ts`；修改 `lib/share.ts`（如需）、`lib/analytics.ts`、`components/quick-play/quick-play-result.tsx`、`app/[locale]/daily-challenge/page.tsx`、`i18n/seo.ts`（`pageMetadata` 支援自訂 OG 圖與 noindex）、messages。

### 5.6 測試

- 單元：`3-8-8-3` 正規化、`0-1-2-3`／`14-1-1-1`／`1-1-1`／`a-b-c-d`／超長字串／無解組合（`1-1-1-1`）全部判無效。
- E2E：產生連結 → 新 browser context（模擬另一台裝置、無 localStorage）開啟 → 題目一致 → 解完看到成績；無效網址顯示錯誤頁與 404。
- OG：`curl` 取 `og:image`、`og:title`；以 Facebook Sharing Debugger 驗證線上版本。

### 5.7 風險

- OG 圖產生耗時與 Vercel 用量：組合有限且長快取，風險低。
- 字型授權：Noto Sans TC 為 SIL OFL，可內嵌。
- 濫用：連結只含題目，沒有可被竄改的成績，最壞情況是無效網址，已安全處理。

---

## 6. PR 切分與順序

| PR | 內容 | 依賴 | 回滾影響 |
|----|------|------|---------|
| PR 1（P0） | `/quick-play`、新手引導、完成畫面、4 個事件、`checkAnswer` | 無 | CTA 回到 `/single-play` |
| PR 2（P1） | 首頁每日挑戰橫幅、回訪資訊、留存事件參數 | 無（可與 PR 1 平行） | 首頁回到原版 |
| PR 3（P2） | 好友挑戰連結、OG 圖、受邀頁、4 個事件 | PR 1 的 `checkAnswer` | 分享按鈕消失、舊連結 404（建議回滾時保留頁面只拿掉入口） |
| PR 3b（選做） | 邀請者可信成績 | PR 3 | 獨立 |

建議每個 PR 上線後至少觀察 7 天 GA4 數據再上下一個，才分得出各自的效果。

---

## 7. 已確認的決策（2026-11-13）

1. 快速試玩採獨立路由 `/quick-play`（`noindex`、不列 sitemap）。
2. 首頁主按鈕「立即開始」→ `/quick-play?from=home`；`/single-play` 改為次要按鈕「選擇模式」。
3. 新手引導 4 張牌都要用，算式必須數字與符號交替。
4. 新手引導不計入統計、成就與排行榜。
5. P2 先開放快速試玩完成畫面與每日挑戰兩個分享入口。
6. 邀請者成績比較延到 P2b。
