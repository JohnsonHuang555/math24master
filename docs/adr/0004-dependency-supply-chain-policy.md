# 依賴套件採用「釘死 Node 修補版 + 停用 install scripts + 7 天冷卻期」的供應鏈政策

2026-10 Node.js 安全更新（CVE-2026-105482、CVE-2026-105483、CVE-2026-106069、CVE-2026-111497，其中 111497 為 Brotli RCE）發布時，Socket 伺服器的 Docker 映像仍是 `node:20-alpine`，而 Node 20 已 EOL、不會再收到修補；同時 `npm audit` 顯示 39 個套件漏洞，`lucide-react` 還寫成 `latest`。考量 npm 供應鏈攻擊（惡意版本被發布）近年頻繁，「一有新版就升」本身就是風險，因此決定在「修補速度」與「不立即吃下剛發布的版本」之間取一個明確的政策，而不是每次臨時判斷。

決定如下：

- **Node 執行環境**：Dockerfile 釘死到確切修補版（如 `node:24.22.1-alpine`），`package.json` 以 `engines.node` 宣告主版本（`24.x`）讓 Vercel 與 Docker 對齊。不用浮動標籤，是為了能從 repo 直接確認「線上跑的是哪個修補版」；不用 digest，是因為小專案維護成本太高。
- **npm 版本**：`engines.npm` 要求 `>=11.10`，因為 `min-release-age` 需要此版本，舊版 npm 會靜默忽略該設定。
- **`.npmrc`**：`ignore-scripts=true`、`min-release-age=7`（天）。
- **依賴版本**：禁止 `latest` 等浮動版本，部署一律 `npm ci` 依 lockfile 安裝。
- **緊急例外**：當漏洞修補版發布未滿 7 天時，僅對該套件以 `--min-release-age=0` 安裝，安裝前人工檢查 changelog 與 npm 發布者，並在 PR 描述列出例外套件與理由。

## Consequences

- 新版本至少要等 7 天才裝得到；「為什麼 `npm install` 抓不到最新版」的答案在這裡
- Node 出新的修補版時，需要手動改 Dockerfile 的版本號（不會隨重新 build 自動更新）
- `ignore-scripts=true` 可能讓依賴 install script 的套件（如 `sharp`、`esbuild`）無法正常安裝，需要逐一確認或改用 npm 的 `allowScripts` 白名單
- 本機開發者需先把 npm 升到 11.10 以上，否則冷卻期在本機不生效
