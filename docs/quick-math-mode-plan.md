# 「心算快答」模式計劃書

> 狀態：已實作完成並通過驗證（2026-07-13）
> 路由：`/quick-math`

## 背景與目標

新增一個獨立小遊戲模式「心算快答」：玩家連續作答 10 題隨機四則運算算式（如 `5 + 10 × 2 − 8 = ?`），3-2-1 倒數後開始計時，以總花費秒數（0.1 秒精度）進行全球排行榜競速。定位比照「猜數字」——非 24 點玩法的獨立小遊戲，入口為獨立路由並在首頁小遊戲區增加卡片，不放入 single-play 模式選單。

## 遊戲規格（定案）

### 流程

1. 開始畫面：規則說明、個人最佳紀錄、排行榜與開始按鈕
2. 按開始後 3-2-1 全螢幕倒數（不計時），倒數結束計時起算
3. 每題顯示一道算式，玩家用畫面數字鍵盤（0-9、清除、送出）輸入答案
4. 答對顯示「答對」toast 並進下一題；答錯總時間 +3 秒（紅色 +3s 飄字與題目卡震動提示）、清空輸入、原題重試
5. 第 10 題答對即結束，結算畫面顯示總秒數、罰時摘要與個人最佳提示

### 出題規則（隨機＋難度模板、遞增難度）

| 題號 | 組成 | 範例 |
|------|------|------|
| 1–3 | 兩運算元，`+ −` 為主（少量 `×`），數字 1–20 | `13 + 8` |
| 4–7 | 三運算元，必含 `× ÷` | `19 + 55 ÷ 5` |
| 8–10 | 四運算元，必含 `× ÷` | `72 ÷ 6 + 13 − 10` |

- 遵守標準先乘除後加減，不出括號題
- 除法保證整除；乘法相鄰運算元 ≤ 12
- 所有中間值（乘除連段逐步值、加減 running sum 的每個 prefix）與答案皆為 0–100 非負整數
- 每局隨機出題、可無限重玩，排行榜只保留最佳（最快）紀錄

### 計時與排行榜

- 計時精度 0.1 秒，使用 `performance.now()` timestamp diff（非 interval 累加），切背景分頁節流不影響計時正確性，天然防「切走暫停」
- 答錯罰時直接累加進總秒數；第 10 題答對當下即定格最終時間
- Firestore 永久榜 `leaderboard_quickmath`，`orderBy seconds asc`（覆寫比較方向與其他模式相反：秒數越小越好）
- 防作弊：API 拒收 `seconds < 10` 或 `> 300`；server 端 `Math.round(s * 10) / 10` 正規化
- 未登入完賽：成績暫存 `pending-score-store`，登入（Google／訪客）後由全域 `PendingScoreSubmitter` 補交
- 中途離開＝放棄，不寫入任何紀錄；不提供暫停（競速公平性）

### 桌機鍵盤支援

- 主鍵盤數字排與數字鍵盤（NumLock）皆可輸入，Backspace 刪除末位、Enter 送出
- Enter 有 `preventDefault`，避免焦點停在螢幕按鈕上時重複觸發 click

## 技術設計

### 出題器：constructive generate-and-check

純隨機生成含 `÷` 的算式接受率過低，改為「運算子先定、運算元沿途建構、最後獨立複驗」：

1. 依 tier 權重抽運算子；tier 2/3 若未抽中乘除則隨機強制一個 slot 為 `×` 或 `÷`
2. 左到右建構運算元，維護乘除連段值 `runValue`：
   - 前一運算子為 `×`：乘數從 `2..min(12, floor(100 / runValue))` 取
   - 前一運算子為 `÷`：**除數只從 runValue 在 2–12 間的因數挑選**（整除保證），無因數則本次嘗試失敗
   - 連段開頭若後接 `÷`：先挑除數 d 與商 q，開頭值 = d×q，保證有因數可用
3. 加減 prefix 檢查：每個 running sum prefix 須在 [0, 100]（如 `3 − 8 + 10` 因 prefix 為 −5 被拒絕）
4. 以獨立的 `evaluateWithConstraints()` 複驗（也是測試斷言依據）
5. 外層 retry ≤ 100 次，耗盡時 fallback 固定模板題，永不 throw

### 檔案清單

**新增**

| 檔案 | 職責 |
|------|------|
| `lib/quick-math-generator.ts` | 出題器純函式（tier 模板、建構式生成、獨立複驗） |
| `lib/quick-math-generator.test.ts` | vitest：500 局 × 10 題全約束斷言 |
| `hooks/useQuickMath.ts` | 遊戲狀態機（idle/countdown/playing/completed）、timestamp diff 計時、罰時、答對 toast、音效 |
| `app/quick-math/layout.tsx` | metadata + JSON-LD breadcrumb + MainLayout |
| `app/quick-math/page.tsx` | 四畫面 UI、數字鍵盤、實體鍵盤監聽、排行榜／登入／統計接線 |

**修改**

| 檔案 | 內容 |
|------|------|
| `app/api/leaderboard/route.ts` | `quickmath` mode：集合、asc 排序、sanity check、覆寫方向、safePayload 白名單、email migration 分支 |
| `hooks/useLeaderboard.ts` | `LeaderboardMode` 加 `'quickmath'` |
| `stores/pending-score-store.ts` | `PendingScoreMode` 加 `'quickmath'` |
| `components/modals/leaderboard-modal.tsx` | 第四個 tab「快答」、`formatTimePrecise` 顯示、空榜 CTA 連結、新增 `defaultTab` prop（quick-math 頁開啟時預設停在快答 tab） |
| `lib/utils.ts` | 新增 `formatTimePrecise()`（`M:SS.d`） |
| `stores/stats-store.ts` | `quickMathPlays`、`quickMathBestSeconds`（0=未設定、越低越好）；persist version 2 → 3 |
| `components/modals/stats-modal.tsx` | 心算快答統計區塊 |
| `components/homepage.tsx` | 小遊戲區第三張卡片（violet 配色、Timer 圖示、NEW 標籤） |
| `components/announcement-banner.tsx` | `BANNER_KEY` 換為 `announcement-quick-math-v1`，公告新模式上線並連到 `/quick-math` |
| `app/sitemap.ts` | 加入 `/quick-math` |

### 複用的既有基礎設施

- `useLeaderboardSubmit` + `pending-score-store` + `PendingScoreSubmitter`（登入／訪客提交三件套，mode-agnostic 無需修改）
- `LoginPromptModal`（含 skipLoginPrompt 偏好）
- `lib/sound-manager.ts`（select／correct／wrong／gameOverWin）
- 3-2-1 倒數 overlay 視覺（取自搶答模式 `buzzer-game-board.tsx`，邏輯改為本地 interval）
- tactile 設計語言（`Button variant="tactile"`、`shadow-[0_4px_0_0]`、`rounded-2xl`、font-display）

## 驗證紀錄

- `lib/quick-math-generator.test.ts` 7 項測試全過（500 局 × 10 題約束斷言）
- `npm run build` 成功，`/quick-math` 靜態頁 13.1 kB
- dev server API 實測：`seconds=5`、`999` 拒收（400）；45.3 寫入成功；50 不覆寫（`updated:false`）；40.1 覆寫成功；GET 依秒數升冪——測試紀錄已從 Firestore 清除
- 瀏覽器實玩驗證通過（倒數、計時、罰時、toast、鍵盤輸入、排行榜提交）
- 已知無關事項：`lib/guess-number.test.ts` 有 4 個既有測試失敗（實作前即存在，與本功能無關）

## 待觀察／後續可做

- 成就系統整合（如「零失誤完賽」「30 秒內完賽」成就）
- 罰時秒數（`WRONG_PENALTY_SECONDS`）與難度參數（`TIER_CONFIG`）視玩家回饋調整
- 若出現排行榜灌水疑慮，可考慮把出題與驗證搬到 server 端
