# 多國語系採用「預設語系不加前綴」的網址路由，簡中由繁中轉換產生

海外玩家增加，開始支援 zh-TW、en、zh-CN 三種語系。考慮過「網址不變、用 cookie 決定語言」，但這樣搜尋引擎只看得到一種語言，拿不到海外的 SEO 流量；也考慮過「每種語系都加前綴」，但現有網址、搜尋排名、分享出去的連結和 PWA 的 start_url 都得轉址。最後採用 next-intl 的 `as-needed`：zh-TW 維持原網址（`/single-play`），其他語系加前綴（`/en/...`、`/zh-CN/...`），sitemap 列出三種語系並標上 hreflang 與 `x-default`。只有第一次造訪、而且沒有語言 cookie 時，才依 `Accept-Language` 轉址一次，之後以玩家手動選的語言為準。

## Consequences

- 以 zh-TW 為來源語系。`zh-CN.json` 一律由 OpenCC 腳本從 zh-TW 轉換產生，不能手改；兩岸用語差異（如「影片／视频」）寫在校正對照表裡，由腳本套用。CI 會檢查重新產生後沒有 diff。
- 改文案的 PR 必須同時更新 `en.json`；CI 會檢查三種語系的 key 完全一致，而且不能有空字串。
- 英文還沒翻完的頁面 fallback 顯示中文，但要設 `noindex`、不列進 en 的 sitemap，避免 Google 收錄半中半英的頁面。
- 字型依語系載入：zh-TW 用 Noto Sans TC，zh-CN 用 Noto Sans SC，en 不載入 CJK 字型。
- PWA manifest 依語系產生，`start_url` 帶語系前綴。
