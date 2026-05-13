# 排行榜規格書

## 概覽

排行榜功能讓玩家在完成各遊戲模式後提交成績，與全球玩家比較排名。需要登入才能提交與查看個人排名。

---

## 支援模式

| 模式 | 評比指標 | 說明 |
|------|---------|------|
| `classic` | 總分（score）| 數值越高排名越前 |
| `normal` | 完成秒數（seconds）| 數值越低排名越前 |
| `challenge` | 連續答對題數（stage）| 數值越高排名越前 |

---

## 登入需求

- 使用 **NextAuth.js + Google OAuth** 進行身份驗證
- 未登入狀態：可查看排行榜，但無法提交成績
- 登入後自動帶入玩家名稱

---

## 成績提交

### 觸發時機
- 遊戲結束後自動嘗試提交（`useLeaderboardSubmit` hook）
- 需有有效登入 session

### API 規格

**Endpoint**：`POST /api/leaderboard`

**Request Body**：
```typescript
{
  mode: 'classic' | 'normal' | 'challenge';
  score?: number;    // classic 模式
  seconds?: number;  // normal 模式
  stage?: number;    // challenge 模式
}
```

**Response**：
- `200 OK`：提交成功
- `401 Unauthorized`：未登入
- `400 Bad Request`：資料格式錯誤

---

## 排行榜查詢

### API 規格

**Endpoint**：`GET /api/leaderboard?mode={mode}`

**Response**：
```typescript
{
  entries: {
    rank: number;
    playerName: string;
    score: number;      // 依模式對應不同意義
    createdAt: number;  // 時間戳（ms）
  }[];
}
```

---

## 資料庫結構（Firebase Firestore）

### Collection：`leaderboard`

```
leaderboard/
├── classic/
│   └── {docId}: { userId, playerName, score, createdAt }
├── normal/
│   └── {docId}: { userId, playerName, seconds, createdAt }
└── challenge/
    └── {docId}: { userId, playerName, stage, createdAt }
```

- 每位玩家每種模式只保留**最佳成績**（提交時若優於舊記錄則更新）

---

## 排行榜 UI（LeaderboardModal）

### 入口
- 首頁點擊「排行榜」按鈕 → 開啟 `LeaderboardModal`

### 顯示內容
- 頂部 Tab 切換三種模式
- 列表顯示排名、玩家名稱、成績數值
- 目前登入玩家的記錄以高亮顯示
- 載入中顯示 Skeleton
- 未登入提示登入按鈕

---

## 原始碼對應

- API 路由：[app/api/leaderboard/route.ts](../app/api/leaderboard/route.ts)
- 資料查詢 Hook：[hooks/useLeaderboard.ts](../hooks/useLeaderboard.ts)
- 成績提交 Hook：[hooks/useLeaderboardSubmit.ts](../hooks/useLeaderboardSubmit.ts)
- 排行榜 Modal：[components/modals/leaderboard-modal.tsx](../components/modals/leaderboard-modal.tsx)
- Firebase 初始化：[lib/firebase-admin.ts](../lib/firebase-admin.ts)
- NextAuth 路由：[app/api/auth/[...nextauth]/route.ts](../app/api/auth/[...nextauth]/route.ts)
