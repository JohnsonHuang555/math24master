# 單人模式規格書

## 概覽

單人模式包含三種子模式，玩家在不需要其他玩家的情況下獨自進行 24 點練習或挑戰。所有單人模式均在本地端（client-side）執行，但透過 Socket.IO 連線至伺服器以共用遊戲邏輯。

---

## 模式選擇頁

**路由**：`/single-play`

玩家在進入遊戲前須先選擇模式：

| 模式 | 顏色標記 | 說明 |
|------|---------|------|
| 經典模式 | 紫色 | 無時限，連線到伺服器單人房 |
| 關卡模式 | 藍色 | 10 題計時挑戰 |
| 挑戰模式 | 橙色 | 5 分鐘倒數連續答題 |

---

## 1. 經典模式（Classic）

### 路由
`/single-play/classic`

### 遊戲規則
- 遵循[經典 24 點核心規格](./game-classic.spec.md)
- 單人房（`maxPlayers: 1`），連線伺服器
- **無時限**（`remainSeconds: null`）
- 牌庫耗盡後遊戲結束

### 狀態機

```
idle → playing → finished（game-over）
```

### 特殊行為
- 遊戲結束後觸發統計更新（`incrementClassicPlays`）
- 紀錄最高分（`updateClassicBestScore`）
- 紀錄最快出牌時間（`updateClassicFastestPlay`，以毫秒計）
- 成就檢查：`no_skip`（一局未跳過完成）

### 原始碼
- [hooks/useSinglePlay.ts](../hooks/useSinglePlay.ts)
- [app/single-play/[mode]/classic-play-game.tsx](../app/single-play/[mode]/classic-play-game.tsx)

---

## 2. 關卡模式（Normal）

### 路由
`/single-play/normal`

### 遊戲規則
- 共 **10 題**，每題為一組隨機 4 張牌（保證有解）
- 使用碼錶計時（stopwatch），從 0 開始累計
- 答錯一次：**+10 秒**懲罰
- 10 題全部完成後遊戲結束，記錄完成時間

### 狀態機

```
idle → playing → finished
```

### 成績記錄
- 本地儲存最多 **100 筆**歷史紀錄
- 每筆記錄包含：完成秒數、是否完美（零懲罰）、日期
- 最佳紀錄（`normalBestSeconds`）儲存於 stats store

### 特殊行為
- 遊戲結束後觸發統計更新（`incrementNormalPlays`, `updateNormalBest`）
- 完美完成（無懲罰）：觸發 `incrementNormalPerfectRuns`
- 成就解鎖：`normal_first`（首次完成）、`normal_perfect`（完美通關）

### 原始碼
- [hooks/useNormalPlay.ts](../hooks/useNormalPlay.ts)
- [hooks/useTimer.ts](../hooks/useTimer.ts)
- [lib/puzzle-generator.ts](../lib/puzzle-generator.ts)
- [app/single-play/[mode]/normal-play-game.tsx](../app/single-play/[mode]/normal-play-game.tsx)

---

## 3. 挑戰模式（Challenge）

### 路由
`/single-play/challenge`

### 遊戲規則
- 初始時間：**5 分鐘（300 秒）**倒數
- 答對一題：**+1 分鐘（+60 秒）**
- 跳過一題：**-15 秒**
- 時間歸零時遊戲結束
- 每題為一組隨機 4 張牌（保證有解）

### 狀態機

```
idle → playing → finished（時間到）
```

### 成績記錄
- 以**連續答對題數（stage）**為主要評比指標
- 最佳紀錄格式：`{ stage, totalScore, date }`
- 儲存於本地（`challengeBestStage`）

### 特殊行為
- 遊戲結束後觸發統計更新（`incrementChallengePlays`, `updateChallengeBestStage`）
- 成就解鎖：`challenge_first`（首次答對）、`challenge_stage_10`（連續 10 題）

### 原始碼
- [hooks/useChallengePlay.ts](../hooks/useChallengePlay.ts)
- [hooks/useTimer.ts](../hooks/useTimer.ts)
- [lib/puzzle-generator.ts](../lib/puzzle-generator.ts)
- [app/single-play/[mode]/challenge-play-game.tsx](../app/single-play/[mode]/challenge-play-game.tsx)

---

## 謎題生成

所有單人模式（關卡 / 挑戰）的題目均由 `puzzle-generator.ts` 產生：

- `generateSolvablePuzzles(count)`：產生 N 組保證有解的 4 張牌
- 牌值範圍：1-13
- 有解驗證：暴力窮舉所有運算組合
- 最大重試次數：`count × 1000`

---

## 共用成就觸發（所有單人模式）

| 成就 ID | 觸發時機 |
|--------|---------|
| `first_win` | 首次出牌成功 |
| `speed_win` | 出牌用時 < 10 秒 |
| `all_ops` | 同一算式使用 3 種不同符號 |
| `all_multiply` | 同一算式使用 3 個 × |
| `consecutive_5` | 連續 5 次出牌成功 |
| `play_100` | 累計出牌成功 100 次 |
| `total_score_100` | 累計得分達 100 分 |
