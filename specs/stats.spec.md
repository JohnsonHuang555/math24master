# 玩家統計規格書

## 概覽

玩家統計功能記錄各遊戲模式的累計數據與個人最佳成績，所有統計儲存於本地裝置。

---

## 統計欄位

### 經典模式統計

| 欄位 | 類型 | 說明 |
|------|------|------|
| `classicPlays` | number | 總場次（每局結束 +1）|
| `classicBestScore` | number | 歷史最高分 |
| `classicFastestPlayMs` | number | 最快出牌時間（毫秒，0 = 未設定）|
| `classicTotalSkips` | number | 累計跳過次數 |

### 關卡模式統計

| 欄位 | 類型 | 說明 |
|------|------|------|
| `normalPlays` | number | 總場次 |
| `normalBestSeconds` | number | 最快完成 10 題的秒數（0 = 未設定）|
| `normalPerfectRuns` | number | 無懲罰完成次數 |

### 挑戰模式統計

| 欄位 | 類型 | 說明 |
|------|------|------|
| `challengePlays` | number | 總場次 |
| `challengeBestStage` | number | 歷史最高連續答對題數 |

### 每日挑戰統計

| 欄位 | 類型 | 說明 |
|------|------|------|
| `dailyChallengeCompletes` | number | 累計完成次數 |

---

## 統計更新時機

| 模式 | 更新時機 | 呼叫函數 |
|------|---------|---------|
| 經典 | 遊戲結束（GameOver）| `incrementClassicPlays`, `updateClassicBestScore` |
| 經典 | 每次出牌成功 | `updateClassicFastestPlay` |
| 經典 | 每次跳過 | `incrementClassicSkips` |
| 關卡 | 10 題完成 | `incrementNormalPlays`, `updateNormalBest` |
| 關卡 | 無懲罰完成 | `incrementNormalPerfectRuns` |
| 挑戰 | 時間到 | `incrementChallengePlays`, `updateChallengeBestStage` |
| 每日挑戰 | 完成當日題目 | `incrementDailyChallenge` |

---

## 統計 UI（StatsModal）

### 入口
- 首頁點擊「統計」按鈕 → 開啟 `StatsModal`

### 顯示內容
- 各模式的統計數據以卡片分區呈現
- 數值若為 0 或未設定，顯示「—」
- `classicFastestPlayMs` 格式化為秒（例：`3.21 秒`）
- `normalBestSeconds` 格式化為 `MM:SS`（例：`2:35`）

---

## 持久化

- 使用 **Zustand persist** 中介層
- localStorage key：`player-stats`（version 2）
- 版本升級時自動遷移，舊資料欄位保留，缺少的新欄位填入預設值 0

---

## 原始碼對應

- Store 定義：[stores/stats-store.ts](../stores/stats-store.ts)
- 統計 Modal：[components/modals/stats-modal.tsx](../components/modals/stats-modal.tsx)
- 更新觸發：[hooks/useGameActions.ts](../hooks/useGameActions.ts), [hooks/useSinglePlay.ts](../hooks/useSinglePlay.ts), [hooks/useNormalPlay.ts](../hooks/useNormalPlay.ts), [hooks/useChallengePlay.ts](../hooks/useChallengePlay.ts)
