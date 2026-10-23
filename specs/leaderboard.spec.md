# 排行榜規格書

## 概覽

玩家完成各遊戲模式後提交成績，與全球玩家比較排名。每位玩家在每個難度只保留**最佳成績**。術語定義見 [CONTEXT.md](../CONTEXT.md) 的「排行榜」與「難度」。

---

## 排行榜與難度

**排行榜 = 一個遊戲模式**；同一模式底下的**難度**各自獨立排名。API 的 `mode` 參數以「難度」為單位，一個難度對應一個 Firestore collection（見 [ADR 0003](../docs/adr/0003-advanced-mode-separate-leaderboard-collection.md)）。

| 排行榜 | 難度 | API `mode` | Collection | 評比欄位 | 排序 |
|--------|------|-----------|------------|---------|------|
| 經典 | - | `classic` | `leaderboard_classic` | `score` | 高到低 |
| 挑戰 | - | `challenge` | `leaderboard_challenge` | `stage` | 高到低 |
| 消消樂 | - | `match` | `leaderboard_matching` | `score` | 高到低 |
| 快答 | 基礎 | `quickmath` | `leaderboard_quickmath` | `seconds` | 低到高 |
| 快答 | 進階 | `quickmath_advanced` | `leaderboard_quickmath_advanced` | `seconds` | 低到高 |

排行榜與難度的對照、URL 參數解析、成績格式化集中在 [lib/leaderboard.ts](../lib/leaderboard.ts)。

- 名次採 **1224 標準競賽排名**：同分並列，下一位跳號
- 分數為 0 的紀錄（經典、消消樂的 `score`；挑戰的 `totalScore`）不上榜，資料庫仍會寫入
- 關卡模式（normal）已下架，排行榜一併移除；回歸時以新 collection 重開

---

## 身分

- **Google 登入**（Auth.js）：`userId` 為 session 的 user id，附帶頭像
- **訪客登入**：本機產生 `guest_<uuid>` 與 2~12 字暱稱，無頭像
- 未登入可查看排行榜，但無法提交成績；結算時未登入的成績會暫存（`pending-score-store`），登入後由 `PendingScoreSubmitter` 補送

---

## API

### `POST /api/leaderboard`：提交成績

```typescript
{
  mode: LeaderboardMode;
  payload: { score } | { stage, totalScore } | { seconds };
  guestId?: string;   // 訪客
  guestName?: string; // 訪客
}
```

- 伺服器端驗證成績上限（經典 66 分、消消樂 40 分、挑戰 500 關、快答 10~300 秒）
- 只有優於舊紀錄才覆寫，回傳 `{ ok: true, updated: boolean }`
- `401`：無身分；`400`：mode 或成績不合法

### `GET /api/leaderboard?mode={mode}`：前 100 名

回傳 `LeaderboardRow[]`（含 `rank`、`userId`、`displayName`、`photoURL` 與該模式的成績欄位）。設定 `s-maxage=60` CDN 快取，所以新成績最多晚 60 秒出現在列表中。

### `GET /api/leaderboard/rank?mode={mode}[&guestId=]`：我的名次

- 依 session（或 `guestId`）找出本人紀錄，名次 = `count(成績嚴格優於我) + 1`，與列表的並列規則一致，**不受前 100 名限制**
- 無紀錄或 0 分回傳 `null`；無身分回傳 `401`
- `Cache-Control: private, no-store`：個人資料絕不可進 CDN 快取

---

## 排行榜頁（`/leaderboard`）

- 網址：`/leaderboard?mode={排行榜}&level={難度}`，沒帶參數時預設經典；單一難度的排行榜不帶 `level`
- 首頁的「排行榜」按鈕連到此頁
- **模式選擇**：chip 列，手機可橫向捲動
- **難度切換**：segmented control，只在該排行榜有多個難度時出現
- **頒獎台**：前三名（金 amber、銀 zinc、銅深 amber 的 `Medal` 圖示），並列時依實際名次上色
- **列表**：第 4~100 名，不分頁；本人那一列高亮並標示「我」
- **我的名次**（固定於頁面底部）：
  - 未登入：「登入後即可上榜」+ Google／訪客登入
  - 尚無紀錄或 0 分：「尚無紀錄」+ 開始遊戲
  - 有紀錄：「第 N 名」+ 成績
- **右上角**：登入身分（頭像、名字、訪客標籤）與登出

---

## 原始碼對應

- 排行榜與難度設定：[lib/leaderboard.ts](../lib/leaderboard.ts)
- API 路由：[app/api/leaderboard/route.ts](../app/api/leaderboard/route.ts)、[app/api/leaderboard/rank/route.ts](../app/api/leaderboard/rank/route.ts)、[app/api/leaderboard/config.ts](../app/api/leaderboard/config.ts)
- 排行榜頁：[app/leaderboard/leaderboard-view.tsx](../app/leaderboard/leaderboard-view.tsx)
- 共用元件：[components/leaderboard/](../components/leaderboard/)
- 前 100 名 Hook：[hooks/useLeaderboard.ts](../hooks/useLeaderboard.ts)
- 我的名次 Hook：[hooks/useMyRank.ts](../hooks/useMyRank.ts)
- 成績提交 Hook：[hooks/useLeaderboardSubmit.ts](../hooks/useLeaderboardSubmit.ts)
- Firebase 初始化：[lib/firebase-admin.ts](../lib/firebase-admin.ts)
