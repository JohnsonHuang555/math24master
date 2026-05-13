# 每日挑戰規格書

## 概覽

每日挑戰提供全球玩家每天相同的 4 張牌，完成後可查看分數、連續天數（Streak）與所有解法，並分享結果。

**路由**：`/daily-challenge`

---

## 每日牌組生成

### 算法
- 使用**線性同餘偽隨機數產生器（LCG）**，以當日日期為種子（seed）
- 種子格式：`YYYYMMDD`（例：20260511）
- 確保同一天所有玩家看到**相同的 4 張牌**

### 牌組保證
- 每日牌組保證有解（`canMake24` 暴力搜尋驗證）
- 若生成失敗則重新產生

### 原始碼
- [lib/daily-seed.ts](../lib/daily-seed.ts) → `getDailyCards()`, `canMake24()`

---

## 遊戲介面

### 遊戲進行中

| 元件 | 說明 |
|------|------|
| 日期顯示 | 顯示今日日期 |
| 4 張牌按鈕 | 可點選選中（高亮），再次點選取消 |
| 公式顯示框 | 顯示目前輸入的算式（數字 + 符號） |
| 符號按鈕 | `+`、`-`、`×`、`÷`、`(`、`)` |
| 倒退按鈕 | 刪除最後一個輸入 |
| 清除按鈕 | 清空目前算式 |
| 出牌按鈕 | 提交算式驗算 |

### 操作流程

```
1. 點選 1~4 張數字牌
2. 點選符號按鈕輸入算式
3. 點擊「出牌」
4a. 驗算 = 24 → 進入結算畫面
4b. 驗算 ≠ 24 → 提示錯誤，可繼續嘗試
```

> 每日挑戰**無次數限制**，玩家可嘗試多次直到成功。

---

## 結算畫面

完成後顯示以下資訊：

| 區塊 | 內容 |
|------|------|
| 分數 | 依[計分規格](./scoring.spec.md)計算 |
| 算式 | 玩家成功的算式 |
| 連續天數（Streak）| 🔥 連續幾天完成每日挑戰 |
| 分享預覽 | 格式化的分享文字 |
| 複製按鈕 | 複製分享文字至剪貼簿 |
| 解法面板 | 展開後顯示今日所有可能解法 |
| 繼續練習 | 導航至單人模式 |
| 挑戰朋友 | 導航至多人對戰 |

### 分享文字格式範例
```
24點大師 - 每日挑戰
2026/05/11 ✅
算式：(3 + 5) × 3
得分：3 分 🔥 7 天連續
```

---

## 每日記錄本地儲存

### 儲存格式
```typescript
{
  date: string;         // 'YYYY-MM-DD'
  completed: boolean;
  score?: number;
  formula?: string;
  streak: number;       // 連續完成天數
}
```

### 儲存位置
- localStorage，key 由 `getDailyChallengeRecord()` 管理
- 每天的記錄獨立儲存，不覆蓋前一天

---

## 連續天數（Streak）追蹤

- 每次完成每日挑戰時，比對**昨日**是否也有完成記錄
- 若昨日已完成：`streak = 昨日 streak + 1`
- 若昨日未完成：`streak = 1`（重新起算）
- 連續天數同步至 `useAchievementStore.updateDailyStreak()`

---

## 解法面板（Solutions Panel）

- 完成後可展開查看**今日所有可能解法**
- 解法由 `canMake24()` 暴力搜尋所有運算組合生成
- 以列表顯示，每筆為一個有效算式

### 原始碼
- [components/daily/solutions-panel.tsx](../components/daily/solutions-panel.tsx)

---

## 成就與統計觸發

| 觸發時機 | 動作 |
|---------|------|
| 首次完成每日挑戰 | 解鎖成就 `daily_done` |
| 連續 7 天完成 | 解鎖成就 `daily_streak_7` |
| 每次完成 | `incrementDailyChallenge()`（stats store）|

---

## 原始碼對應

- 頁面：[app/daily-challenge/page.tsx](../app/daily-challenge/page.tsx)
- 牌組生成：[lib/daily-seed.ts](../lib/daily-seed.ts)
- 解法面板：[components/daily/solutions-panel.tsx](../components/daily/solutions-panel.tsx)
