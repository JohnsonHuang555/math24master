# Math24 Master

![Static Badge](https://img.shields.io/badge/math24-master-orange)&nbsp;
![Static Badge](https://img.shields.io/badge/node-v18.18.2-blue)&nbsp;
![Static Badge](https://img.shields.io/badge/current-v1.2.8-blue)&nbsp;
![Static Badge](https://img.shields.io/badge/let's-play-g)&nbsp;
![Static Badge](https://img.shields.io/badge/Next.js-15-black?logo=next.js)&nbsp;
![Static Badge](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)&nbsp;
![Static Badge](https://img.shields.io/badge/Socket.IO-4-white?logo=socket.io&logoColor=black)

A free online 24-puzzle game with single-player, real-time multiplayer, and daily challenge modes.

🌐 **Live:** https://math24master.com

---

## 🎮 Game Modes

| Mode | Description |
|------|-------------|
| **Single Player** | Practice at your own pace with 3 difficulty levels |
| **Multiplayer** | Real-time rooms via Socket.IO — optional password & countdown timer |
| **Daily Challenge** | A seeded daily puzzle, guaranteed solvable, resets every 24 hours |

---

## 🚀 Game Rules

1. Each player holds **4 cards** in hand.
2. On your turn, use all your cards to form an equation equal to 24.
3. If you cannot make 24, you can **exchange** your hand — discard all cards and draw 4 new ones (ends your turn).
4. After a successful play, you draw the same number of cards you used.
5. When the deck is exhausted, the current round becomes the **final round**. The game ends after all players complete it.
6. The player with the highest score wins.

---

## 💯 Scoring

| Symbol | Points |
|--------|--------|
| `+` or `-` | 1 pt each |
| `×` | 2 pts each |
| `÷` | 3 pts each |

**Bonuses:**
- 2 multiplication symbols → +1 pt
- 2 division symbols → +1 pt
- 4 number cards used → +1 pt
- 5 number cards used → +2 pts
- Parentheses score no points

**Examples:**

- `10 + 10 + 4 = 24` → **2 pts** (2 additions)
- `(2 + 4 ÷ 10) × 10 = 24` → **6 pts** (1 add + 1 mul + 1 div + 4-card bonus)
- `(1 × 6) + (6 × 2) + 6 = 24` → **9 pts** (2 adds + 2 muls + 2× mul bonus + 5-card bonus)

---

## ✨ Features

- 🎵 **Sound effects** — Web Audio API, no external audio files required
- 🏆 **8 achievements** with localStorage persistence
- 📊 **Game statistics** — wins, completions, and skips tracked locally
- ⚙️ **3 difficulty levels** — Easy (1–6), Normal (1–10), Hard (1–13)
- 🌙 **Dark mode** support
- 🔒 **Password-protected** multiplayer rooms

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS, Radix UI, Framer Motion |
| Realtime | Socket.IO 4 |
| State | Zustand 5 |
| Math | mathjs |
| Tooling | ESLint, Prettier, Nodemon |

---

## 📁 Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── single-play/        # Single-player mode
│   ├── multiple-play/      # Multiplayer mode (dynamic [roomId])
│   └── daily-challenge/    # Daily challenge mode
├── server/                 # Socket.IO server
│   ├── index.ts            # HTTP + socket setup
│   ├── game.ts             # All game logic
│   └── utils.ts            # Deck generation
├── components/
│   ├── areas/              # Game board UI (hand, action, players, chat…)
│   └── ui/                 # Radix UI primitives (shadcn/ui pattern)
├── hooks/                  # useSinglePlay (single-player logic)
├── providers/              # MultiplePlayProvider (socket + multiplayer state)
├── stores/                 # Zustand stores (achievements, stats, sound…)
├── models/                 # Shared TypeScript types (client + server)
└── lib/                    # Utilities, sound manager, animation variants
```

---

## 🎲 Getting Started

**Prerequisites:** Node.js 18+

```bash
git clone https://github.com/JohnsonHuang555/math24master.git
cd math24master
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> `npm run dev` starts both the Next.js frontend and the Socket.IO server simultaneously (Nodemon watches the `/server` directory).

---

## 📦 Build & Deploy

```bash
npm run build   # Build Next.js app + compile server TS
npm start       # Run production build
```

The Next.js config uses `output: 'standalone'`. Set the `PORT` environment variable to change the server port (default: `3000`).

---

## 🔗 Reference

[Background Image by freepik](https://www.freepik.com/free-vector/flat-geometric-background_14456042.htm#fromView=search&page=3&position=52&uuid=083b3f17-d1be-450c-b94d-9f69cd5ed2b4)
