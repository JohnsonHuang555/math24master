# 成就系統規格書

## 概覽

成就系統追蹤玩家在各模式的里程碑，共 14 項成就分為三個等級。成就解鎖後以 Toast 通知提示，並永久儲存於本地。

---

## 成就清單

### 新手（Beginner）

| ID | 名稱 | 描述 | 觸發條件 |
|----|------|------|---------|
| `first_win` | 初次出牌 | 首次出牌成功 | 任意模式第一次出牌成功 |
| `daily_done` | 每日挑戰 | 完成第一次每日挑戰 | 每日挑戰頁面首次完成 |
| `normal_first` | 關卡初體驗 | 完成第一次關卡模式 | 關卡模式首次完成 10 題 |
| `challenge_first` | 挑戰起步 | 挑戰模式答對第一題 | 挑戰模式首次答對 |

### 進階（Advanced）

| ID | 名稱 | 描述 | 觸發條件 |
|----|------|------|---------|
| `speed_win` | 神速 | 10 秒內出牌成功 | 任意模式出牌用時 < 10,000ms |
| `all_ops` | 全能達人 | 同時使用三種不同運算符號 | 同一算式含 `+`/`-`、`×`、`÷` 各至少 1 個 |
| `all_multiply` | 乘法王 | 使用 3 個乘號組出算式 | 同一算式使用 ≥ 3 個 `×` |
| `no_skip` | 精準 | 經典模式一局未跳過完成遊戲 | 單人經典模式全程 `singleSkipCount === 0` |

### 挑戰（Challenge）

| ID | 名稱 | 描述 | 觸發條件 | 進度目標 |
|----|------|------|---------|---------|
| `consecutive_5` | 連勝達人 | 連續 5 次出牌成功 | `consecutiveWins >= 5` | 5 |
| `total_score_100` | 得分達人 | 累計得分達 100 分 | `totalScore >= 100` | 100 |
| `play_100` | 傳奇玩家 | 累計出牌成功 100 次 | `totalPlays >= 100` | 100 |
| `normal_perfect` | 完美通關 | 關卡模式全程無錯誤完成 | 關卡模式完成時無任何懲罰時間 | - |
| `challenge_stage_10` | 不朽連擊 | 挑戰模式連續答對 10 題 | `challengeBestStage >= 10` | 10 |
| `daily_streak_7` | 每日達人 | 每日挑戰連續 7 天完成 | `dailyStreak >= 7` | 7 |

---

## 進度追蹤

部分成就支援進度顯示（`progressKey` + `progressTarget`）：

| progressKey | 對應狀態 | 來源 |
|------------|---------|------|
| `totalPlays` | 累計出牌成功次數 | `AchievementStore.totalPlays` |
| `consecutiveWins` | 連勝計數 | `AchievementStore.consecutiveWins` |
| `totalScore` | 累計得分 | `AchievementStore.totalScore` |
| `challengeBestStage` | 挑戰最高連勝 | `AchievementStore.challengeBestStage` |
| `dailyStreak` | 每日挑戰連續天數 | `AchievementStore.dailyStreak` |

---

## 解鎖流程

```
1. 遊戲事件觸發 → 呼叫 unlockAchievement(id)
2. unlockAchievement → AchievementStore.unlock(id)
3. 若為新解鎖（首次）→ 顯示 Toast 通知
4. 成就 ID 加入 unlockedIds 陣列，記錄解鎖時間戳
```

### Toast 通知格式
- 顯示位置：右上角
- 內容：「🏆 成就解鎖：{成就名稱}」
- 使用 react-toastify 顯示

---

## 連勝計數規則

- 出牌成功：`incrementConsecutiveWins()`
- 出牌失敗或跳過：`resetConsecutiveWins()`
- 計數跨局累積（不因遊戲結束重置）

---

## 持久化

- 使用 **Zustand persist** 中介層
- localStorage key：`achievements-v2`
- 儲存資料：`unlockedIds[]`、`unlockDates{}`、所有進度計數

---

## 成就 UI

- 入口：首頁點擊「成就」按鈕 → 開啟 `AchievementModal`
- 顯示：已解鎖（亮色）與未解鎖（灰色鎖定）
- 進度型成就顯示進度條
- 解鎖日期顯示於已解鎖成就下方

---

## 原始碼對應

- Store 定義：[stores/achievement-store.ts](../stores/achievement-store.ts)
- 解鎖觸發：[lib/achievement-manager.ts](../lib/achievement-manager.ts)
- 成就 Modal：[components/modals/achievement-modal.tsx](../components/modals/achievement-modal.tsx)
- 成就觸發點：[hooks/useGameActions.ts](../hooks/useGameActions.ts)
