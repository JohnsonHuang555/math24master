# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 語言

總是用繁體中文回覆。

## UI 文案規範

不要在程式碼、UI 文案（按鈕、提示、toast、chips 等）中使用 emoji。需要視覺強調時改用 `lucide-react` 圖示元件，與現有設計系統（Radix UI + lucide-react）保持一致。

## Commands

```bash
npm run dev      # Start dev server (Next.js + Socket.IO via nodemon, watches /server)
npm run build    # Build Next.js app then compile server TS (tsc --project tsconfig.server.json)
npm start        # Run production build
```

No test framework is configured.

Linting uses ESLint (`next/core-web-vitals` + prettier). Prettier handles import sorting (`@trivago/prettier-plugin-sort-imports`) and Tailwind class sorting (`prettier-plugin-tailwindcss`).

## Architecture

This is a **Math24 puzzle game** (make 24 from number cards using math operations) with both single-player and multiplayer modes. The repo is a unified Next.js + Socket.IO monorepo — one `npm run dev` starts both.

### Two TypeScript configs

- `tsconfig.json` — Next.js frontend (path alias `@/*` → root)
- `tsconfig.server.json` — Server-side compilation to `dist/server/`

### Key directories

| Path | Purpose |
|------|---------|
| `app/` | Next.js App Router pages (`/`, `/single-play`, `/multiple-play/[roomId]`) |
| `server/` | Socket.IO server (`index.ts` = HTTP + socket setup, `game.ts` = all game logic, `utils.ts` = deck generation) |
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
