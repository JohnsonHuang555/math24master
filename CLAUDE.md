# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 語言

總是用繁體中文回覆。

## UI 文案規範

不要在程式碼、UI 文案（按鈕、提示、toast、chips 等）中使用 emoji。需要視覺強調時改用 `lucide-react` 圖示元件，與現有設計系統（Radix UI + lucide-react）保持一致。

## 多國語系

支援 zh-TW（預設、來源語系）、en、zh-CN，使用 next-intl。背景見 `docs/adr/0008`、`docs/adr/0009`。

- `server/`、`lib/`、`stores/` 不放顯示給玩家看的文字，只輸出代碼（如 `ROOM_NOT_FOUND`）或 id 加參數；文字一律在 UI 層用 message key 取得。Server 錯誤代碼加新值時，翻譯檔的 `Record<ErrorCode, string>` 要一起補。
- 新增或修改文案時，同一個 PR 要更新 zh-TW 與 en 的 messages。
- 不要手改 `zh-CN` 的 messages：它由 OpenCC 腳本從 zh-TW 產生。兩岸用語差異寫進校正對照表，再重跑腳本。
- 英文遊戲術語以 `CONTEXT.md` 每個術語括號內的英文名稱為準，產品名稱在 zh-TW 以外的語系一律用 Math24 Master。中文成語類名稱在英文要重新取名，不要直譯。
- 玩家輸入的內容（房間名稱、暱稱、聊天）不翻譯。
- 日期、數字格式用目前語系，不要寫死 `'zh-TW'`。

## Commands

```bash
npm run dev           # Start Next.js (:3000) + Socket.IO server (:3001, tsx watch reloads on server/models/lib changes) together
npm run build         # Build Next.js app
npm start             # Run Next.js production build
npm run start:socket  # Run Socket.IO server in production mode (tsx server/index.ts)
npm run lint          # ESLint CLI (flat config: eslint.config.mjs)
npm run i18n:zh-cn    # Regenerate messages/zh-CN.json from zh-TW (OpenCC); run after editing zh-TW messages
```

### Deployment

- **Frontend (Next.js)** → Vercel. Set `NEXT_PUBLIC_SOCKET_URL` to the socket server URL.
- **Socket.IO server** → Cloud Run via `Dockerfile` (image contains only `server/`, `models/`, `lib/`). Set `ALLOWED_ORIGINS` (comma-separated frontend origins). Must run as a **single instance** since room state is in memory.

### Testing

- `npm test` — Vitest unit tests (`lib/`), `e2e/` is excluded
- `npm run test:e2e` — Playwright E2E (`e2e/`). Starts Firestore Emulator (:8180), Socket.IO server (:3101) and a separate Next.js build in `.next-e2e` (:3100) automatically, so it does not clash with `npm run dev`. Requires **Java 21+** for the emulator; first run also needs `npx playwright install chromium`.
- E2E skips the real Google OAuth screen by writing an Auth.js session cookie signed with a test-only `AUTH_SECRET` (`e2e/helpers/auth.ts`); leaderboard writes go to the emulator (`demo-math24` project), never production.

Linting uses ESLint flat config (`eslint.config.mjs`: `eslint-config-next/core-web-vitals` + prettier); `next lint` was removed in Next.js 16. Prettier handles import sorting (`@trivago/prettier-plugin-sort-imports`) and Tailwind class sorting (`prettier-plugin-tailwindcss`).

## Architecture

This is a **Math24 puzzle game** (make 24 from number cards using math operations) with both single-player and multiplayer modes. The repo is a unified Next.js + Socket.IO monorepo — one `npm run dev` starts both (Next.js on :3000, Socket.IO on :3001); in production they deploy separately.

### Two TypeScript configs

- `tsconfig.json` — Next.js frontend (path alias `@/*` → root)
- `tsconfig.server.json` — Server-side compilation to `dist/server/`

### Key directories

| Path | Purpose |
|------|---------|
| `app/` | Next.js App Router pages, all under `app/[locale]/` (`/`, `/single-play`, `/multiple-play/[roomId]`); `app/api/` and `global-not-found.tsx` stay at the root |
| `i18n/` | next-intl setup: locales, routing, `navigation.ts` (use its `Link` / `useRouter` / `useHardNavigate` instead of `next/link` / `next/navigation`), `Accept-Language` detection (`pick-locale.ts`, used by root `proxy.ts`) |
| `messages/` | Translations per locale (`zh-TW` is the source; `zh-CN.json` is generated) |
| `server/` | Standalone Socket.IO server (`index.ts` = HTTP + socket setup, `game.ts` = all game logic, `utils.ts` = deck generation) |
| `components/areas/` | Game board UI split into area components (hand, action, players, chat, etc.) |
| `components/ui/` | Radix UI primitives (shadcn/ui pattern) |
| `models/` | Shared TypeScript types used by both client and server |
| `providers/` | React context — `multiple-play-provider.tsx` owns the Socket.IO connection and all multiplayer state |
| `hooks/` | `useSinglePlay.ts` — entire single-player game logic as a hook |
| `lib/` | `utils.ts` (math helpers, `cn()`), `animation-variants.ts` (Framer Motion) |

### Data flow

**Multiplayer:** All game state lives on the server in an in-memory `_rooms` array. The client emits `SocketEvent` actions; the server validates, mutates state, and broadcasts back. `MultiplePlayProvider` (React context) manages the socket connection and re-renders the UI on updates.

**Single-player:** Entirely client-side via `useSinglePlay` hook — no server involvement.

### `SocketEvent` enum (`models/SocketEvent.ts`)

Defines all client↔server events. Client emits: `JoinRoom`, `PlayCard`, `DrawCard`, `DiscardCard`, `SelectCard`, `ReselectCard`, `BackCard`, etc. Server emits back: `JoinRoomSuccess`, `PlayCardResponse`, `GameOver`, `CountdownTimeResponse`, etc.

### Game rules (relevant to logic changes)

- Players hold 5 cards; goal is to form an equation equaling 24
- Scoring: `+`/`-` = 1pt, `×` = 2pt, `÷` = 3pt; bonuses for 2×(+1), 2÷(+1), 4 cards(+1), 5 cards(+2)
- Equations evaluated via **mathjs**
- Deck exhaustion triggers the final round; game ends after all players complete it
- Turn timers are managed server-side per room

## Agent skills

### Issue tracker

Issues 記錄在 GitHub Issues（`JohnsonHuang555/math24master`），使用 `gh` CLI 操作。詳見 `docs/agents/issue-tracker.md`。

### Domain docs

Single-context：`CONTEXT.md` + `docs/adr/` 位於 repo 根目錄。詳見 `docs/agents/domain.md`。

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
- 開發新功能畫面、保持視覺風格一致 → invoke math24-design-system
