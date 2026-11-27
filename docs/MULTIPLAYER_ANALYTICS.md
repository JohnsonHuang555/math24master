# 多人模式數據：事件、指標與 GA4 設定

這份文件說明多人模式送出哪些 GA4 事件、怎麼去重、每個指標怎麼算，以及 GA4 後台要做哪些設定。目標是讓下一階段的決策有可信的數據可以參考。

- 事件定義：`lib/analytics.ts`（「多人模式漏斗」一節）
- 去重與觸發：`lib/multiplayer-tracking.ts`
- GA4 載入條件：`lib/analytics-env.ts`
- 部署後檢查：`docs/MULTIPLAYER_SMOKE_TEST.md`

## 1. 設計原則

### 一局以伺服器的 `matchId` 識別

- 每次開局，伺服器產生一個隨機 uuid，存在 `Room.matchId`。
  - 會出現在房間的公開資料（`RoomView.matchId`）和結算事件裡。
  - 斷線重連、重新整理時沿用同一個；下一局（含再玩一場）換新的。
- 用途：替分析事件去重，並把同一局的開局、參與、結束、再戰串起來。
- 不是玩家或裝置的識別碼：同一局所有玩家拿到同一個 id，也不對應任何個人資料。
- 成本：每間房在記憶體多一個字串，沒有資料庫，房間刪除時一起消失。
- 不影響重連：重連仍然只靠 reconnectToken，`matchId` 只是房間的一個公開欄位。

### 前端去重

所有多人事件都經過 `lib/multiplayer-tracking.ts`。事件**排入 gtag 佇列之後**才記在分頁的 sessionStorage：

| 情況 | 結果 |
|------|------|
| React Strict Mode 重跑 effect、同一份房間資料收到兩次 | 只送一次 |
| 遊戲中重新整理（同一個分頁、同一局） | 不會再送開局 |
| 網路斷線重連 | 不算新的一局 |
| 收到舊房間的結算（已經再玩一場換房） | 前端以 `roomId` 過濾，不處理 |
| 同一局先中斷又收到結算 | 共用同一個去重 key，只會記其中一個 |
| sessionStorage 不能用（隱私模式等） | 改用記憶體去重；重新整理後無法去重，可能多算 |

### 初始化前後的事件流程（避免漏報與重複）

GA4 初始化 script 用 `next/script` 的 `beforeInteractive` 放在根 layout。

- Next.js 先依序執行這類 script，**再開始 hydration**（`next/dist/client/app-bootstrap.js`）。
- 所以任何 React 程式碼觸發事件時，`window.gtag` 與 `dataLayer` 都已存在。
- 在這之前用的是 `afterInteractive`：初始化在 Script 元件的 `useEffect` 裡才執行，能不能比頁面的 effect 早，取決於 React effect 順序與 Suspense 邊界的 hydration 時機，沒有保證。

**管線狀態**（`window.__m24Analytics.state`，見 `lib/analytics-env.ts`）

| 狀態 | 意義 |
|------|------|
| `local` | 不是正式網域：事件只放進本地 dataLayer，不送往 Google |
| `loading` | 正式網域：`config` 已排在 dataLayer 最前面，事件排在後面，等 `gtag.js` 載入後依序處理 |
| `ready` | `gtag.js` 已載入並處理過佇列；之後的事件直接交給它 |
| `blocked` | `gtag.js` 載入失敗（廣告攔截、網路錯誤）：事件不會送出，也不重試 |
| `unavailable` | 沒有 `gtag`（伺服器端，或初始化 script 沒執行） |

**三種狀態的區分**
- **Pending：** 沒有可用的管線（`unavailable`）。事件不排入、**也不標記**，暫存在記憶體（最多 20 筆），管線可用時再送。
- **Queued：** 呼叫 `gtag()` 只代表事件放進了 dataLayer 佇列。`trackEvent` 回傳 `true` 也只代表這件事。
- **Sent：** 不使用。前端無法確認 GA4 伺服器已經收到，所以文件與程式都不把「排入佇列」當成「已送達」。

**去重 key 的標記**（`once:<key>`）

| 標記 | 什麼時候 | 之後 |
|------|----------|------|
| `done` | 在 `ready`、`local`、`blocked` 狀態排入 | 不再送出 |
| `queued:<頁面 id>` | 在 `loading` 狀態排入（`gtag.js` 還沒載入完） | 事件內容另外存一份（最多 20 筆） |

`queued` 之後的兩種結果：
- **這一頁 `gtag.js` 載入完成：** 改成 `done`。
- **頁面在 `gtag.js` 載入前就被關掉或重新整理**（佇列從來沒被處理過）：下一頁原樣重送一次。含第一次最多 2 次，之後放棄；被擋時直接放棄。

**為什麼這樣不會重複計數**
- 只有「上一頁排入、而且上一頁的 `gtag.js` 從沒載入完」的事件才會重送。
- 已經交給 `gtag.js` 的事件一律標成 `done`，不重送。
- 唯一的重複窗口：`gtag.js` 已經執行、但 `onload` 回呼還沒觸發的那一瞬間就關掉頁面。這是毫秒等級，實務上可以忽略。

### 只在正式網域送資料

GA4 的 `gtag.js` 只在 `math24master.com` 和 `www.math24master.com` 載入（`lib/analytics-env.ts`）。

- 本機開發、E2E、Vercel preview 的事件只留在瀏覽器的 `window.dataLayer`，不會送到 Google；E2E 從這裡讀事件來驗證。
- 在這之前，GA4 在所有網域都會載入，所以本機與預覽環境的事件也進了正式報表。這個 PR 合併以前的歷史資料可能混有這類流量；可以用 hostname 篩選排除。

### 不送個人資料

- 參數只有人數、秒數、類型、來源，以及隨機的 `match_id`。
- 不送暱稱、房間 id、房間名稱、密碼、reconnectToken、玩家 id。
- 有測試檢查以上規則：`lib/__tests__/multiplayer-tracking.test.ts`，以及 E2E「多人分析事件」。

注意：GA4 自動收集的 `page_view` 會帶網址，房間頁的網址包含房間 id（`/multiple-play/<uuid>`）。這是 GA4 內建行為，不是這些事件送的；詳見「限制」。

## 2. 事件對照表

**名詞**
- 「每局」：同一個 `match_id`。
- 「每間房」：同一個配對房。
- 去重的範圍是同一個瀏覽器分頁：重新整理不會重複，換分頁或換裝置會再算一次。

| 事件 | 觸發時機 | 參數 | 去重方式 | 可能重複嗎 | 模式 |
|------|----------|------|----------|------------|------|
| `multiplayer_lobby_view` | 進入多人大廳 | 無 | 不去重（每次進大廳都算） | 每次進大廳一次；計人數請用使用者數 | 全部 |
| `quick_match_requested` | 按「快速開始」，或結算畫面的「再玩一場」（快速配對） | `source`: `lobby`、`rematch` | 再玩一場同一局只算一次 | 大廳按鈕在送出後會停用，正常不重複 | 搶答（快速配對） |
| `quick_match_joined` | 第一次收到「自己在配對中房間」的資料 | `source` | 每間房一次 | 不會 | 搶答（快速配對） |
| `quick_match_start` | 配對結束：電腦補位或真人湊滿 | `human_player_count`、`bot_player_count`、`match_wait_seconds`、`game_type`、舊參數 `humans`／`bots`／`outcome` | 每間房一次；只算自己在配對中待過的房間 | 不會 | 搶答（快速配對） |
| `quick_match_cancelled` | 開局前按「取消配對」或「離開房間」 | 人數、`match_wait_seconds`、`cancel_method`: `cancel_button`、`leave_button` | 每間房一次 | 不會；直接關掉分頁不會送（見限制） | 搶答（快速配對） |
| `game_start`（`mode: multiplayer`） | 收到房間狀態變成遊戲中 | `game_type`、`variant`、`match_id`、人數；再戰另帶 `rematch_source` | 每局一次 | 不會；舊版伺服器沒有 `match_id` 時不送 | 搶答、傳統 |
| `multiplayer_participated` | 這一局自己第一次搶答成功或出牌 | `game_type`、`match_id` | 每局一次 | 不會 | 搶答、傳統 |
| `game_complete`（`mode: multiplayer`） | 收到正常結算（同時顯示結算畫面） | `game_type`、`completion_status`: `won`、`lost`、`match_id`、人數 | 每局一次（與中斷共用） | 不會 | 搶答、傳統 |
| `multiplayer_game_aborted` | 有人離開造成這一局中斷 | `game_type`、`completion_status: aborted`、`match_id`、人數 | 每局一次（與正常結算共用） | 不會 | 搶答、傳統 |
| `multiplayer_rematch_clicked` | 結算畫面按「再玩一場」 | `game_type`、`rematch_source`: `quick_match`、`private_room`、`from_match_id` | 每局一次 | 連點不會 | 搶答、傳統 |
| `multiplayer_rematch_started` | 按過再玩一場之後，下一局真的開局 | `game_type`、`rematch_source`、`match_id`、`from_match_id`、人數 | 每局一次；再戰意圖 15 分鐘內有效，回到大廳就清掉 | 不會 | 搶答、傳統 |

**刻意沒有新增的事件**
- 開局、完成沿用全站共用的 `game_start` 和 `game_complete`（`mode: multiplayer`），避免同一個指標有兩個意義重疊的事件。
- 配對完成沿用既有的 `quick_match_start`，GA4 的歷史資料接得上。
- 需求清單中的 `multiplayer_game_started`、`multiplayer_game_completed`、`quick_match_started` 不另外建立。

**遊戲中離開**：沒有獨立事件，用「開局沒有對應完成也沒有中斷」推算（見指標 9）。

## 3. 漏斗

| 漏斗 | 步驟 | 事件 |
|------|------|------|
| A 開始一場 | 1 進入大廳 | `multiplayer_lobby_view` |
| | 2 點快速配對 | `quick_match_requested`（`source = lobby`） |
| | 3 進入配對房 | `quick_match_joined` |
| | 4 配對完成 | `quick_match_start` |
| | 5 遊戲開始 | `game_start`（`mode = multiplayer`） |
| B 完成對戰 | 1 遊戲開始 | `game_start`（`mode = multiplayer`） |
| | 2 參與作答 | `multiplayer_participated` |
| | 3 正常結算 | `game_complete`（`mode = multiplayer`） |
| | 4 看見結算畫面 | 同上（結算畫面在收到結算時顯示；沒有分開的事件） |
| C 再次遊玩 | 1 完成第一場 | `game_complete`（`mode = multiplayer`） |
| | 2 點再玩一場 | `multiplayer_rematch_clicked` |
| | 3 進入下一場配對 | `quick_match_joined`（`source = rematch`）；私人房間沒有配對，跳過 |
| | 4 下一場開始 | `multiplayer_rematch_started` |
| | 5 完成第二場 | `game_complete`（`mode = multiplayer`），在步驟 4 之後 |

漏斗 B 的第 3、4 步合併：結算畫面在收到結算事件時立即顯示，另外送「看見」事件只會得到幾乎相同的數字。

## 4. 指標定義

**先分清楚兩種數字**
- 「事件數」是某個事件發生幾次。
- 「使用者數」是有發生過的不重複使用者，GA4 的 Total users 或 Active users。
- 同一個人可能進大廳很多次，所以人數類問題一律用使用者數；用事件數會高估。

| # | 問題 | 分子 | 分母 | 單位與注意 |
|---|------|------|------|------------|
| 1 | 多人大廳有多少人進入 | 有 `multiplayer_lobby_view` 的使用者數 | — | 使用者數，不是事件數 |
| 2 | 多少人點快速配對 | 有 `quick_match_requested`（`source = lobby`）的使用者數 | 指標 1 | 使用者數 |
| 3 | 配對成功率 | `quick_match_start` 事件數 | `quick_match_joined` 事件數 | 每間房每位玩家各一次，比例可信 |
| 4 | 平均等待秒數 | `quick_match_start` 的 `match_wait_seconds` 總和 | `quick_match_start` 事件數 | 以 GA4 計算指標，或在探索報表裡相除 |
| 5 | 真人對真人的比例 | `game_start` 中 `human_player_count ≥ 2` 的事件數 | `game_start`（`mode = multiplayer`）事件數 | 是「玩家局數」比例，每位玩家各算一次，見下方說明 |
| 6 | 含電腦的比例 | `game_start` 中 `bot_player_count ≥ 1` 的事件數 | 同上 | 同上 |
| 7 | 開局前取消 | 有 `quick_match_cancelled` 的使用者數 | 有 `quick_match_joined` 的使用者數 | 另外看 `cancel_method` 與 `match_wait_seconds` 分布 |
| 8 | 遊戲完成率 | `game_complete`（`mode = multiplayer`）事件數 | `game_start`（`mode = multiplayer`）事件數 | 每位玩家每局各一次；比例是「玩家局」的完成率 |
| 9 | 中途離開率 | `game_start` − `game_complete` − `multiplayer_game_aborted` | `game_start` | 推算值，見限制 |
| 10 | 再玩一場點擊率 | `multiplayer_rematch_clicked` 事件數 | `game_complete`（`mode = multiplayer`）事件數 | |
| 11 | 第二場開始率 | `multiplayer_rematch_started` 事件數 | `multiplayer_rematch_clicked` 事件數 | |
| 12 | 第二場完成率 | 漏斗 C 第 5 步人數 | 漏斗 C 第 4 步人數 | 用漏斗探索計算，見第 5 節 |

**指標 5、6 的說明**
- 一場 3 位真人的對戰，會產生 3 個 `game_start`。所以 GA4 介面算出來的是「玩家局」的比例：有多少比例的遊玩經驗是和真人一起，不是「場次」的比例。
- 要算真正的場次數，需要用 `match_id` 去重。GA4 的探索報表無法直接計算不重複的參數值，需要 BigQuery 匯出（見限制）。

## 5. GA4 後台設定（需要人工設定）

### 5.1 自訂維度與指標

路徑：管理（Admin）→ 資料顯示（Data display）→ 自訂定義（Custom definitions）。

- 建立後約 24 到 48 小時才會出現在報表。
- 只會套用到建立之後收到的事件，不會回溯。

**自訂維度（範圍：事件）**

| 名稱 | 事件參數 |
|------|----------|
| Multiplayer game type | `game_type` |
| Completion status | `completion_status` |
| Rematch source | `rematch_source` |
| Quick match source | `source` |
| Cancel method | `cancel_method` |
| Mode | `mode`（若尚未建立） |

**自訂指標（範圍：事件，單位：標準）**

| 名稱 | 事件參數 |
|------|----------|
| Human player count | `human_player_count` |
| Bot player count | `bot_player_count` |
| Match wait seconds | `match_wait_seconds` |

**`match_id`、`from_match_id`：預設不註冊**
- 這兩個是每局不同的值，基數非常高。註冊成維度後，報表常會出現 `(other)`，也會佔用自訂維度額度。
- 只有要逐局追查時才註冊，或改用 BigQuery 匯出。

### 5.2 排除開發與測試流量

1. 管理 → 資料收集與修改（Data collection and modification）→ 資料篩選器（Data filters）→ 建立篩選器。
2. 類型選「開發人員流量」（Developer traffic），動作選「排除」。
3. 先用「測試」狀態確認沒有誤刪，再改成「啟用」。

啟用後：
- 帶 `debug_mode` 的事件（例如網址加 `?ga_debug=1`）不會進報表，但仍會出現在 DebugView。
- 部署後的 Smoke Test 可以照常在正式網域操作，不會污染報表。

### 5.3 建議的漏斗探索

路徑：探索（Explore）→ 漏斗探索（Funnel exploration）。

| 漏斗 | 步驟條件 | 設定 |
|------|----------|------|
| A | 第 2 步加條件 `source = lobby`；第 5 步加條件 `mode = multiplayer` | 開放式漏斗；細分 `Quick match source` |
| B | 第 1、3 步加條件 `mode = multiplayer` | 封閉式漏斗、「間接接續」；細分 `Multiplayer game type`，以及第 3 步的 `Completion status` |
| C | 步驟見第 3 節 | 封閉式漏斗；每一步「在同一個工作階段內」間接接續；細分 `Rematch source` |

- **漏斗 C：** 私人房間沒有第 3 步。做一份「快速配對」漏斗，另一份去掉第 3 步、篩 `rematch_source = private_room`。
- **再戰與首戰分開：** 以 `rematch_source` 是否有值，區分 `game_start` 屬於再戰還是首戰。

## 6. 用 DebugView 驗證

1. 在正式網域打開 `https://math24master.com/zh-TW/multiple-play?ga_debug=1`。
   - 這個分頁會開啟 debug_mode，換頁後仍有效；用 `?ga_debug=0` 關閉。
2. GA4 → 管理 → DebugView，選擇自己的裝置。
3. 依序操作，確認每個事件只出現一次，參數正確：
   1. 進大廳：`multiplayer_lobby_view`
   2. 按快速開始：`quick_match_requested`（source=lobby）、`quick_match_joined`
   3. 按「不等了」：`quick_match_start`（人數、等待秒數）、`game_start`（match_id、人數）
   4. 搶答一次：`multiplayer_participated`
   5. **重新整理頁面：** 不應再出現 `game_start`
   6. 打完一局：`game_complete`（completion_status）
   7. 按再玩一場：`multiplayer_rematch_clicked`（from_match_id）、`quick_match_requested`（source=rematch）、`quick_match_joined`
   8. 下一局開局：`game_start`（rematch_source）、`multiplayer_rematch_started`（match_id ≠ from_match_id）
4. 點開事件確認參數裡沒有暱稱或房間 id。

本機與 Vercel preview 不會把事件送到 Google，所以 DebugView 只能在正式網域驗證。本機想看事件時，在瀏覽器 console 查看 `window.dataLayer` 即可。

## 7. 資料不足時怎麼解讀

- **樣本量：** 每個比例至少看分母 100 以上再下結論。分母幾十的時候，差 10 個百分點可能只是隨機波動。
- **時間範圍：** 新事件與自訂維度只從上線（與建立定義）之後開始有資料。至少累積 2 到 4 週，並跨過平日與週末，再比較前後差異。
- **先看絕對數字，再看比例：** 例如配對成功率 90% 但一週只有 5 次快速配對，結論應該是「沒人在用快速配對」，不是「配對很成功」。
- **比例不要跨單位相除：** 使用者數只和使用者數相比，事件數只和事件數相比。
- **舊資料：** 這次之前的 `game_start` 和 `game_complete`（multiplayer）會因重新整理而多算，也混有本機與預覽環境的流量。比較前後時，從這次上線日開始算。

## 8. 限制

1. **去重只在同一個分頁內有效：** 換分頁、換裝置、清除網站資料、隱私模式下 sessionStorage 不能用時，同一局可能再算一次。正常玩法下影響很小。
2. **關掉分頁不會送事件：** 配對中直接關掉分頁、遊戲中直接關掉分頁，都沒有事件，所以「取消」和「中途離開」會少算。指標 9 是推算值。
3. **場次數需要 BigQuery：** GA4 介面無法以 `match_id` 計算不重複的場次。完成率、真人局比例都是「玩家局」的比例，不是「場次」的比例。若要算場次，需要 BigQuery 匯出（GA4 標準版可免費設定，但查詢會產生 BigQuery 費用）。
4. **廣告攔截器：** 擋 GA 的玩家完全不會出現在數據裡。
5. **GA4 自動收集的網址含房間 id（已確認，這次沒有改）**

   房間頁網址是 `/multiple-play/<房間 id>`。房間 id 是隨機 uuid，但可以用來加入沒有密碼的私人房間；GA4 只有專案成員看得到。

   GA4 有兩條會收到完整網址的途徑：
   - `config` 送出的第一個 page_view，`page_location` 預設是 `location.href`。
   - 加強型評估（Enhanced Measurement）在瀏覽器歷史變更時（`pushState`、`replaceState`）送出的 page_view。這包含 Next.js App Router 的路由切換，例如從大廳快速開始進入房間、再玩一場換房。

   其他自訂事件都不帶網址或房間 id。

   | 方案 | 涵蓋範圍 | 風險 |
   |------|----------|------|
   | 只改第一個 `config` 的 `page_location` | 只有整頁載入（邀請連結、重新整理）；路由切換仍送原始網址 | 遮蔽不完整，容易誤以為已處理 |
   | `send_page_view: false`，改由前端在每次路由變更時手動送遮蔽過的 page_view | 完整 | 必須**同時**在 GA4 後台關閉「依瀏覽器歷史事件判斷網頁變更」：沒關就全站重複計算，只關不改程式就全站少算。會改變全站追蹤，部署需要協調 |

   **建議：** 另開 PR 做第二個方案。程式碼與 GA4 後台設定同一天上線，上線後用 DebugView 確認每次換頁只有一個 page_view，房間頁的 `page_location` 是 `/multiple-play/room`。
6. **從邀請連結進入配對房：** 這種情況沒有 `quick_match_requested`，但有 `quick_match_joined`。所以漏斗 A 第 2、3 步之間可能出現「後面比前面多」。
7. **傳統對戰目前沒有 UI 入口：** 事件已經接上，但實際上只會有搶答模式的資料。

## 9. 待驗證的假設（P2）

有實際數據之前，不推測流失原因。以下假設都先用現有事件驗證，確認是真的問題，才做「最小可行改善」。

| 假設 | 可能的問題 | 驗證指標 | 判斷方式 | 最小可行改善 | 要改程式嗎 |
|------|------------|----------|----------|--------------|------------|
| H1 玩家不知道沒有真人也能和電腦玩 | 大廳看了就走，或配對中途取消 | 指標 2（點快速配對比例）、指標 7（開局前取消）、`match_wait_seconds` 分布 | 取消多半發生在等 5 到 10 秒以上、而且當時房內只有自己：支持假設。取消多在 3 秒內：比較像誤點 | 在快速開始說明加一句「沒有對手時，電腦會陪你玩」（已有類似文字，可以先加強位置或字級） | 只改文案 |
| H2 15 秒等待太長 | 等待期間取消 | 指標 7 依 `match_wait_seconds` 分組；`quick_match_start` 的真人數 | 大多數配對最後只有 1 位真人，而且取消集中在 8 到 15 秒：縮短等待不會損失真人配對，可以縮短 | 把 `QUICK_MATCH.waitSeconds` 改為 10 秒，做前後比較 | 改一個常數 |
| H3 快速配對按鈕不夠明顯 | 進大廳的人很少按 | 指標 2；大廳其他互動（開私人房、加入房間）的事件數 | 點快速配對比例偏低，但開私人房的人不少：支持假設 | 調整大廳的視覺層級（不新增功能） | 改 UI |
| H4 玩家不知道可以再戰 | 完成後直接離開 | 指標 10、11 | 指標 10 偏低，同時大量 `game_complete` 後接著出現 `multiplayer_lobby_view`：玩家回到大廳重新開始，而不是用再戰 | 結算畫面的再戰按鈕已是主按鈕；可以先在說明文字強調「直接開始下一場」 | 只改文案 |
| H5 多人規則不容易理解 | 開局後不參與作答，或很快離開 | 漏斗 B 第 1→2 步（`multiplayer_participated`）、指標 9 | 開局卻沒參與作答的比例高，而且沒參與的局多半以中途離開收場：支持假設 | 第一次進多人時顯示一次規則重點（沿用現有規則視窗） | 小幅修改 |
| H6 手機不好操作 | 手機的參與率、完成率比桌機低 | 漏斗 B 依「裝置類別」細分（GA4 內建維度） | 手機的參與率或完成率明顯低於桌機（樣本足夠時差 10 個百分點以上） | 先用實機測試找出具體卡點，再決定改哪裡 | 視情況 |

**優先順序**：H1、H2、H4 只要改文案或一個常數，等累積 2 到 4 週數據後最先驗證；H3、H5、H6 需要較多觀察。
