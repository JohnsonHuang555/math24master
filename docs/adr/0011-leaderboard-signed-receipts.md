# 排行榜只接受 server 簽發的成績收據

單人模式的遊戲全部在前端執行，原本結束時直接把成績 POST 到 `/api/leaderboard`，server 只檢查分數上限。任何人打開 DevTools 送一個 `{ score: 66 }` 就能拿第一名，也能用同一個成績灌好幾個訪客帳號。考慮過把整局遊戲搬到 server 執行（server 發牌、驗證每一步算式），能真正擋住造假，但五種模式的引擎都要重寫，也會讓單人模式依賴網路。決定先採較輕的做法：

1. 開局時前端向 `POST /api/leaderboard/session` 拿一張有 HMAC 簽章的開局憑證，裡面記錄模式、隨機 nonce 與 server 端的開局時間。
2. 結束時把憑證和成績送到 `POST /api/leaderboard/finish`。server 檢查成績範圍，以及「開局到現在的實際經過時間」夠不夠打出這個成績（`checkResult`，門檻刻意放寬，只擋物理上不可能的成績），通過後發一張簽章的成績收據。同一個 nonce 只能結算一次。
3. 上排行榜只接受收據，成績以收據內容為準。同一張收據只能上榜一次（同一位玩家重送視為成功），所以不能拿一場成績灌多個帳號。
4. 三個 API 都依 IP 雜湊做每分鐘的頻率限制，資料庫不存原始 IP。

未登入的玩家結束時就先拿收據存進 localStorage，登入後補送；收據 7 天內有效。

## Consequences

- 需要 `LEADERBOARD_SECRET`（沒設時用 `AUTH_SECRET`）。換密鑰會讓還沒上榜的收據全部失效。
- 擋得住「沒玩就送分數」「改 payload」「一場成績灌多個帳號」，擋不住寫程式自動玩遊戲、或拿到憑證後等夠久再送假成績的人。快答尤其如此：開局憑證在進入頁面時就拿，server 只能確定回報的秒數不比實際經過的時間長。真的需要時再考慮 server 端出題與驗算。
- `leaderboard_sessions` 與 `leaderboard_rate_limits` 的文件都帶 `expireAt`，在 Firestore 對這兩個 collection 開啟 TTL 政策後會自動清除。
- 舊版存在 localStorage 的待補送成績沒有收據，升級後直接作廢。
- 既有的可疑成績用 `npm run leaderboard` 管理工具找出與刪除，刪除預設只預覽。
