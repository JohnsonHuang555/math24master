# 拉密模式改為單人對 AI，廢棄舊的多人拉密實作

舊的多人拉密已實作完成，但因三個問題被下架、只保留搶答可建房：桌面重組與 Joker 交換有 bug、在線玩家太少湊不到一桌、規則（破冰罰則、顏色硬性限制、Joker 宣告與交換）不夠清楚。決定改做單人模式（1 位玩家對 2 個 AI，整局在 client 端執行），規則重新設計，並刪除舊的多人拉密程式碼（server 邏輯、拉密 `SocketEvent`、`Room.board`、`Player.hasMelded` 等欄位與 UI），只把可重用的部分抽出來給新版用，不保留隱藏的死碼。

## Considered Options

- **重新開放多人拉密並修 bug**：不採用，修好 bug 也解決不了湊不到人的問題。
- **Gin Rummy 式棄牌堆、不共用桌面**：可以避開重組的 bug，但會失去拉密「拆解、重組桌面」的核心樂趣，所以保留共用桌面，改用重寫規則與驗證來降低複雜度。
- **單人解謎（沒有對手）**：不採用，有 AI 對手才有拉密的互動與節奏。

## Consequences

- 新規則拿掉破冰；Joker 宣告後永久固定、不能換回手牌。這些都是刻意簡化，不是遺漏。（原本也把顏色從硬性限制改成計分倍率，這一點已被 [ADR 0006](./0006-rummy-score-race-and-color-rule.md) 取代。）
- 拉密不再走 Socket.IO，也不再受「socket server 只能單一 instance」的限制影響；之後若要做多人版，應從新規則重新出發，不要復活舊程式碼。
- 排行榜依 [ADR 0003](./0003-advanced-mode-separate-leaderboard-collection.md) 的慣例，每個難度各開一個 collection（`rummy_easy` / `rummy_normal` / `rummy_hard`）。
