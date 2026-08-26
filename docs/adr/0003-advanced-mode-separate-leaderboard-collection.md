# 進階模式排行榜使用獨立 Collection，而非在既有 Collection 加 mode 欄位

Quick Math 新增 Advanced Mode 後，需要決定排行榜資料怎麼存。考慮過在既有 `leaderboard_quickmath` collection 加一個 `mode` 欄位、查詢時依 mode 過濾，但這需要對既有資料做一次回填遷移（補上 `mode: 'basic'`），且 `app/api/leaderboard/route.ts` 現有的 `COLLECTION` / `ORDER_FIELD` / `ORDER_DIR` 皆是以 collection 為單位做靜態對照，加欄位會讓查詢邏輯從「選 collection」變成「選 collection + 過濾條件」，兩種模式混寫。決定新增獨立的 `leaderboard_quickmath_advanced` collection，讓 Advanced Mode 沿用與其他既有模式相同的「一個 mode 對一個 collection」慣例，不需要遷移既有資料，程式碼也維持現有的靜態對照模式。

## Consequences

- 之後任何新模式都會依此慣例各自開一個新 collection，而不是走「共用 collection + 過濾欄位」的路線
- 若未來需要跨模式的統一排行／分析查詢，需要額外的聚合查詢，而不是單一 collection 的一次查詢
