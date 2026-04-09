# TODOS

Items identified during engineering review but deferred from current implementation.

---

## [TODO-1] Daily Challenge × Normal 模式跨模式連接

**What:** 在 Daily Challenge 和 Normal 模式之間加入跨模式激勵機制，例如「連續 N 天完成 Normal 模式獲得特殊標記」。

**Why:** 三個模式目前各自獨立，加入跨模式連結可以強化回訪動機，特別是對同時玩多個模式的玩家。

**Pros:** 提升 engagement，讓玩家把模式之間視為一個更大的系統。

**Cons:** 需要跨 localStorage key 讀取，並在結算畫面加入通知邏輯。

**Context:** 此 TODO 在「Normal 和 Challenge 模式實作完成後」才有意義評估。目前（2026-04-08）三個模式剛設計完。

**Depends on:** Normal 模式 + Daily Challenge 都上線後。

---

## [TODO-2] 4 張牌 / 5 張牌加分規則

**What:** 在計分系統加入「使用全 4 張牌 +1pt」和「使用全 5 張牌 +2pt」的 bonus 規則，並同步到多人模式。

**Why:** 設計時曾討論這兩條規則，但因目前 `server/game.ts` 中沒有實作，為保持新舊模式計分一致而暫時移除。

**Pros:** 增加策略深度，鼓勵玩家用更多張牌構成算式。

**Cons:** 需要同時修改 `server/game.ts:updateScore`、`lib/scoring.ts`（新）以及相關 UI，工作量中等。

**Context:** 此次決定是為了對齊現有程式碼而非引入分歧。（見 eng-review 2026-04-08）

**Depends on:** 無前置條件，但建議在多人模式和單人模式都穩定後再評估。

---
