# 拉密模式規格書

## 概覽

拉密模式是 Math24Master 的進階遊戲模式，以麻將/拉米牌遊戲精神結合 24 點算式，玩家輪流出牌至桌面，先將手牌出完者獲勝。

---

## 牌庫規格

### 牌組構成

| 類型 | 數量 | 說明 |
|------|------|------|
| 數字牌 | 104 張 | 4 色 × 13 值 × 2 份 |
| Joker | 2 張 | 萬能牌，可代替任意數字 |
| **合計** | **106 張** | |

### 顏色種類
- `red`（紅）
- `blue`（藍）
- `yellow`（黃）
- `black`（黑）

### 數值範圍
- 1 ~ 13（每色每值各 2 張）

---

## 手牌規格

| 設定 | 初始手牌數 |
|------|-----------|
| 一般難度 | 14 張（`RUMMY_HAND_CARD_COUNT = 14`）|
| 輕鬆難度 | 10 張（`RUMMY_HAND_CARD_COUNT_EASY = 10`）|

---

## 回合流程

```
1. 輪到玩家 → 必須先抽 1 張牌（RummyDrawCard）
2. 玩家在「工作區」組合算式牌組（數字牌 + 運算符號）
3. 玩家可選擇：
   a. 提交本回合（RummySubmitTurn）→ 驗算桌面所有牌組
   b. 宣告 Joker 代替數值（RummyDeclareJoker）
   c. 替換桌上的 Joker（RummySwapJoker）
4a. 驗算通過：更新桌面（board），換下一位玩家
4b. 驗算失敗：棄牌並換下一位玩家
```

> 每回合時限：**120 秒**（`RUMMY_TURN_SECONDS = 120`）

---

## 算式牌組規則

### 數字牌數量
- 每組算式的數字牌數量：**3 ~ 5 張**

### 顏色規則

| 數字牌數量 | 顏色要求 |
|-----------|---------|
| 5 張 | 全部**同色** |
| 3 ~ 4 張 | 全部同色 **或** 全部不同色 |

> Joker 牌豁免顏色規則（不計入顏色判斷）

### 算式結果
- 每組算式計算結果必須等於 **24**

---

## 破冰機制（First Meld）

- 玩家首次成功出牌至桌面稱為「破冰」
- 破冰前：玩家只能出牌至**新增的牌組**，不能修改桌上現有牌組
- 破冰後：玩家可自由重組桌上所有已驗證的牌組
- 破冰狀態記錄於 `Player.hasMelded`

---

## Joker（萬能牌）

### 宣告機制
- 玩家可宣告 Joker 所代替的數值（`jokerDeclaredValue`）
- 宣告後 Joker 視為該數值參與算式計算

### 替換機制
- 玩家可使用手牌中的真實數字牌替換桌上 Joker
- 替換後 Joker 回到玩家手中，可再次使用

---

## 桌面（Board）驗證

- 每次玩家提交回合時，**整個桌面**重新驗算
- 所有牌組都必須同時通過驗算
- 驗算邏輯：[lib/rummy-validator.ts](../lib/rummy-validator.ts)

---

## AI Bot

### 難度行為差異

| 難度 | 行為策略 |
|------|---------|
| `easy` | 隨機選擇可出的牌組 |
| `normal` | 優先選擇較小的牌組組合 |
| `hard` | 嘗試最大化得分（複雜算式優先）|

### 觸發條件
- 僅限拉密模式（`AddBotToRoom` 事件）
- 由房主觸發加入 Bot
- Bot 自動執行抽牌與提交

---

## 勝利條件

- 玩家手牌全部出完（handCard 長度為 0）
- 或牌庫耗盡後進入最後一圈，比較最終手牌數量（手牌最少者勝）

---

## Socket 事件對應

| 動作 | 事件 |
|------|------|
| 抽牌 | `RummyDrawCard` |
| 提交回合 | `RummySubmitTurn` |
| 宣告 Joker | `RummyDeclareJoker` |
| 替換 Joker | `RummySwapJoker` |
| 加入 Bot | `AddBotToRoom` |
| 房間更新 | `RoomUpdate` |
| 遊戲結束 | `GameOver` |

---

## 原始碼對應

- 遊戲邏輯：[server/game.ts](../server/game.ts) → `rummyStartGame()`, `rummyDrawCard()`, `rummySubmitTurn()`
- 牌庫生成：[server/utils.ts](../server/utils.ts) → `createRummyDeck()`
- 棋盤驗證：[lib/rummy-validator.ts](../lib/rummy-validator.ts)
- AI Bot：[lib/rummy-ai.ts](../lib/rummy-ai.ts)
- 房間常數：[models/Room.ts](../models/Room.ts)
