# Math24 Master

![Static Badge](https://img.shields.io/badge/math24-master-orange)&nbsp;
![Static Badge](https://img.shields.io/badge/node-v18.18.2-blue)&nbsp;
![Static Badge](https://img.shields.io/badge/current-v1.2.4-blue)&nbsp;
![Static Badge](https://img.shields.io/badge/let's-play-g)

🎉 Welcome to the Math24 Master! This is a challenging and fun puzzle game that tests your mathematical skills and strategic thinking.

## 🚀&nbsp; Game Rules

1. Each player has 5 cards in hand.
2. During your turn, you can choose to play cards or draw a card. In multiplayer mode, drawing a card ends your turn and passes it to the next player. In single-player mode, you simply draw a card.
3. At the end of your turn, draw 1 card from the deck and discard 1 card to maintain 5 cards in your hand.
4. When the deck is exhausted, the current round becomes the final round. The game ends when the last player's turn is completed.
5. The player with the highest score at the end of the game wins.

## 💯&nbsp; Score Calculations Way

1. Each addition or subtraction symbol in the equation scores **1** point.
2. Each multiplication symbol in the equation scores **2** points.
3. Each division symbol in the equation scores **3** points.
4. If the equation contains 2 multiplication symbols, add **1** extra point.
5. If the equation contains 2 division symbols, add **1** extra point.
6. If the equation contains 4 number cards, add **1** extra point.
7. If the equation contains 5 number cards, add **2** extra points.
8. Parentheses do not score any points.

## 👇&nbsp; Examples

1. "10 + 10 + 4 = 24" scores 2 points.<br>
   Explanation: 2 addition symbols score 2 points.

2. "(2 + 4 ÷ 10) × 10 = 24" scores 6 points.<br>
   Explanation: 1 addition symbol scores 1 point, 1 multiplication symbol scores 2 points, 1 division symbol scores 3 points, and using 4 number cards adds 1 extra point.

3. "(1 × 6) + (6 × 2) + 6 = 24" scores 9 points.<br>
   Explanation: 2 addition symbols score 2 points, 2 multiplication symbols score 4 points, having 2 multiplication symbols adds 1 extra point, and using 5 number cards adds 2 extra points.

## 🎲 Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🔗&nbsp; Reference

[Background Image by freepik](https://www.freepik.com/free-vector/flat-geometric-background_14456042.htm#fromView=search&page=3&position=52&uuid=083b3f17-d1be-450c-b94d-9f69cd5ed2b4)
