# 多人對戰規格書

## 概覽

多人對戰模式支援 2~N 位玩家即時連線對戰，透過 Socket.IO 進行實時通訊。提供經典 24 點與拉密兩種遊戲類型，並支援聊天、房間管理與斷線重連機制。

---

## 路由結構

| 頁面 | 路由 | 說明 |
|------|------|------|
| 房間列表 | `/multiple-play` | 瀏覽可加入的房間 |
| 房間（準備/遊戲中）| `/multiple-play/[roomId]` | 房間內部頁面 |

---

## 房間列表頁

### 功能
- 顯示所有可加入的房間卡片
- 每 **1 秒**自動刷新房間列表（`SearchRooms` 事件）

### 篩選與搜尋
- 依**房間名稱**關鍵字搜尋
- 篩選：全部房間 / 人數未滿
- 篩選：全部遊戲類型 / 經典 / 拉密

### 房間卡片顯示資訊
- 房間名稱
- 鎖定圖示（有密碼）
- 遊戲類型 badge（經典 / 拉密）
- 目前人數 / 最大人數

### 操作
- **加入房間**：點擊房間卡片 → 確認對話框 → 有密碼則彈出密碼輸入
- **建立房間**：點擊「建立房間」按鈕 → 建立房間 Modal
- **回首頁**：導航至 `/`

### 玩家名稱
- 從 localStorage 讀取玩家名稱
- 未設定時彈出名稱輸入 Modal（`PlayerNameModal`）
- 可點擊編輯圖示修改名稱

---

## 建立房間

### 設定選項

| 欄位 | 類型 | 預設 | 說明 |
|------|------|------|------|
| 房間名稱 | 文字輸入 | - | 必填 |
| 最大玩家數 | 數字 | 2 | 2~6 人 |
| 密碼 | 文字輸入 | - | 選填，設定後玩家需輸入才能加入 |
| 遊戲類型 | 選擇 | 經典 | `classic` / `rummy` |
| 牌庫類型 | 選擇 | 標準 | `standard` / `random` |
| 回合時限 | 選擇 | 無限制 | 秒數 / null |

---

## 房間準備階段

### 玩家列表（PlayersArea）
- 顯示所有已加入玩家的名稱與準備狀態
- 已準備：綠色標記
- 未準備：等待中標記

### 準備流程
1. 玩家點擊「準備」→ 廣播 `ReadyGame` → 所有玩家看到對方準備狀態
2. **房主**看到「開始遊戲」按鈕（所有玩家準備後才可點擊）
3. 房主點擊「開始遊戲」→ 發送 `StartGame` → 伺服器驗證所有人已準備 → 遊戲開始

### 房間資訊（RoomInfoArea）
- 顯示：房間名稱、遊戲類型、牌庫類型、回合時限
- 房主可編輯房間設定（EditRoomModal）
- 「離開房間」按鈕

---

## 聊天系統

### 功能
- 即時聊天，所有房間成員可見
- 訊息格式：`{ playerId, playerName, message, timestamp }`

### Socket 事件
- 發送訊息：`SendMessage`
- 接收訊息：`GetMessage`

---

## 房主功能

| 功能 | 說明 |
|------|------|
| 踢除玩家 | `RemovePlayer` → 確認 Modal → 廣播 `RemovePlayerResponse` |
| 編輯房間名稱 | `EditRoomName` |
| 編輯房間設定 | `EditRoomSettings`（牌庫類型、回合時限等）|
| 開始遊戲 | `StartGame` |
| 加入 Bot（拉密限定）| `AddBotToRoom` |

> 房主離開時，自動轉移房主給下一位玩家

---

## 斷線重連機制

### 流程
1. 玩家斷線時，伺服器啟動 **30 秒寬限期**
2. 寬限期內玩家可重連，伺服器保留其遊戲狀態
3. 重連時客戶端發送 `PlayerReconnect`（攜帶 `reconnectToken`）
4. 伺服器驗證 token：
   - 成功 → `PlayerReconnectSuccess`，恢復遊戲狀態
   - 失敗 → `PlayerReconnectFailed`，玩家移出房間
5. 30 秒超時未重連 → 自動移除玩家

### 重連 Token
- UUID 格式，於加入房間時由伺服器分配（`joinRoom()` 時生成）
- 儲存於客戶端 localStorage：`reconnectToken` + `reconnectRoomId`

### 玩家斷線中狀態
- `Player.isDisconnected = true`
- `Player.disconnectedAt`：斷線時間戳（ms）
- 前端顯示「斷線重連」Overlay（`ReconnectOverlay`）

---

## 遊戲異常處理

| 情況 | 處理方式 |
|------|---------|
| 玩家在遊戲中離開 | `PlayerLeaveRoom` 廣播，遊戲繼續 |
| 人數不足以繼續遊戲 | `GameAborted` 廣播，遊戲中止 |
| 回合時間到 | 強制換下一位玩家（伺服器計時器觸發）|

---

## Socket 事件清單

### 客戶端 → 伺服器（F2E Emit）

| 事件 | 說明 |
|------|------|
| `JoinRoom` | 加入或建立房間 |
| `SearchRooms` | 取得房間列表 |
| `ReadyGame` | 切換準備狀態 |
| `StartGame` | 房主啟動遊戲 |
| `EditRoomName` | 修改房間名稱 |
| `EditRoomSettings` | 修改房間設定 |
| `RemovePlayer` | 踢除玩家 |
| `CheckRoomPassword` | 驗證房間密碼 |
| `SendMessage` | 發送聊天訊息 |
| `PlayerReconnect` | 斷線重連請求 |
| 遊戲事件 | 見[經典模式規格](./game-classic.spec.md) |

### 伺服器 → 客戶端（B2E Emit）

| 事件 | 說明 |
|------|------|
| `JoinRoomSuccess` | 成功加入房間 |
| `GetPlayerId` | 取得玩家 Socket ID |
| `RoomUpdate` | 房間狀態更新（全量） |
| `GetRoomsResponse` | 房間列表回傳 |
| `GetMessage` | 接收聊天訊息 |
| `NeedRoomPassword` | 需要輸入密碼 |
| `RemovePlayerResponse` | 踢人結果 |
| `PlayerLeaveRoom` | 玩家離開房間通知 |
| `CountdownTimeResponse` | 每秒回合倒數 |
| `GameOver` | 遊戲結束（含玩家排名與分數）|
| `GameAborted` | 遊戲中止 |
| `PlayerReconnectSuccess` | 重連成功 |
| `PlayerReconnectFailed` | 重連失敗 |

---

## 原始碼對應

- 伺服器事件處理：[server/index.ts](../server/index.ts)
- 遊戲邏輯：[server/game.ts](../server/game.ts)
- 客戶端 Context：[providers/multiple-play-provider.tsx](../providers/multiple-play-provider.tsx)
- 房間列表頁：[app/multiple-play/page.tsx](../app/multiple-play/page.tsx)
- 房間頁：[app/multiple-play/[roomId]/page.tsx](../app/multiple-play/[roomId]/page.tsx)
- 準備區域：[components/areas/players-area.tsx](../components/areas/players-area.tsx)
- 聊天區域：[components/areas/chat-area.tsx](../components/areas/chat-area.tsx)
- Socket 事件定義：[models/SocketEvent.ts](../models/SocketEvent.ts)
