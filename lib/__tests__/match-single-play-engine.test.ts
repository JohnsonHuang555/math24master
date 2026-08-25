import { describe, expect, it } from 'vitest';
import { selectCard, submitSelection } from '@/lib/match-single-play-engine';
import { MatchBoardState, MatchCell } from '@/models/MatchBoard';
import { NumberCard } from '@/models/Player';
import { Symbol } from '@/models/Symbol';

function card(id: string, value: number): NumberCard {
  return { id, value };
}

/** 建立一個 16 格牌面，只有 `withCards` 指定的格子有牌，其餘視為已消除（null） */
function makeBoard(withCards: NumberCard[]): MatchBoardState {
  const cells: MatchCell[] = Array.from({ length: 16 }, (_, cellIndex) => ({
    cellIndex,
    card: withCards[cellIndex] ?? null,
  }));
  return {
    boardId: 'test-board',
    cells,
    selectedCards: [],
    score: 0,
    status: 'playing',
  };
}

describe('submitSelection - 消除成功路徑', () => {
  it('選 2 張（6 × 4 = 24）正確消除、加分、格子清空', () => {
    const c6 = card('a', 6);
    const c4 = card('b', 4);
    const board = makeBoard([c6, c4]);
    board.selectedCards = [
      { number: c6 },
      { symbol: Symbol.Times },
      { number: c4 },
    ];

    const result = submitSelection(board);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.isCorrect).toBe(true);
    expect(result.scoreGained).toBe(2); // 單一乘號 = 2 分
    expect(result.cleared).toBe(true);
    expect(result.board.score).toBe(2);
    expect(result.board.status).toBe('cleared');
    expect(result.board.cells.every(c => c.card === null)).toBe(true);
  });

  it('選 3 張（4 × 3 × 2 = 24）正確消除、雙乘號 bonus 計分正確', () => {
    const c4 = card('a', 4);
    const c3 = card('b', 3);
    const c2 = card('c', 2);
    const board = makeBoard([c4, c3, c2]);
    board.selectedCards = [
      { number: c4 },
      { symbol: Symbol.Times },
      { number: c3 },
      { symbol: Symbol.Times },
      { number: c2 },
    ];

    const result = submitSelection(board);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.isCorrect).toBe(true);
    // 兩個乘號：2*2 + 1(雙乘bonus) = 5
    expect(result.scoreGained).toBe(5);
    expect(result.cleared).toBe(true);
  });

  it('選 4 張（(1+2+3) × 4 = 24）正確消除，指定格子變 null、其餘不變', () => {
    const c1 = card('a', 1);
    const c2 = card('b', 2);
    const c3 = card('c', 3);
    const c4 = card('d', 4);
    const other = card('e', 9); // 不參與這次消除，應維持原狀
    const board = makeBoard([c1, c2, c3, c4, other]);
    board.selectedCards = [
      { symbol: Symbol.LeftBracket },
      { number: c1 },
      { symbol: Symbol.Plus },
      { number: c2 },
      { symbol: Symbol.Plus },
      { number: c3 },
      { symbol: Symbol.RightBracket },
      { symbol: Symbol.Times },
      { number: c4 },
    ];

    const result = submitSelection(board);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.isCorrect).toBe(true);
    expect(result.scoreGained).toBe(4); // 加減各1分 x2 + 乘號2分 = 4
    expect(result.cleared).toBe(false); // 還剩 other 這張牌
    expect(result.board.cells[0].card).toBeNull();
    expect(result.board.cells[1].card).toBeNull();
    expect(result.board.cells[2].card).toBeNull();
    expect(result.board.cells[3].card).toBeNull();
    expect(result.board.cells[4].card).toEqual(other);
  });
});

describe('submitSelection - 答錯與卡關偵測', () => {
  it('答案不等於 24 時 isCorrect:false，牌面不變', () => {
    const c1 = card('a', 1);
    const c1b = card('b', 1);
    const board = makeBoard([c1, c1b]);
    board.selectedCards = [
      { number: c1 },
      { symbol: Symbol.Plus },
      { number: c1b },
    ];

    const result = submitSelection(board);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.isCorrect).toBe(false);
    expect(result.scoreGained).toBe(0);
    expect(result.board).toBe(board); // 原樣回傳，未變動
  });

  it('消除後剩餘牌怎麼選都湊不出 24 時，判定為卡關', () => {
    const c6 = card('a', 6);
    const c4 = card('b', 4);
    const stuck1 = card('c', 1);
    const stuck2 = card('d', 1);
    const board = makeBoard([c6, c4, stuck1, stuck2]);
    board.selectedCards = [
      { number: c6 },
      { symbol: Symbol.Times },
      { number: c4 },
    ];

    const result = submitSelection(board);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.cleared).toBe(false);
    expect(result.board.status).toBe('stuck');
  });

  it('消除後剩餘牌仍存在解法時，不應誤判為卡關', () => {
    const c6 = card('a', 6);
    const c4 = card('b', 4);
    const solvable1 = card('c', 3);
    const solvable2 = card('d', 8);
    const board = makeBoard([c6, c4, solvable1, solvable2]);
    board.selectedCards = [
      { number: c6 },
      { symbol: Symbol.Times },
      { number: c4 },
    ];

    const result = submitSelection(board);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.cleared).toBe(false);
    expect(result.board.status).toBe('playing'); // 剩餘 [3, 8] 仍可解 (3×8=24)
  });
});

describe('submitSelection - 張數上限', () => {
  it('選少於 2 張時回傳 error', () => {
    const c1 = card('a', 1);
    const board = makeBoard([c1]);
    board.selectedCards = [{ number: c1 }];

    const result = submitSelection(board);
    expect(result.success).toBe(false);
  });

  it('選超過 4 張時回傳 error', () => {
    const cards = [
      card('a', 1),
      card('b', 2),
      card('c', 3),
      card('d', 4),
      card('e', 5),
    ];
    const board = makeBoard(cards);
    board.selectedCards = cards.map(c => ({ number: c }));

    const result = submitSelection(board);
    expect(result.success).toBe(false);
  });
});

describe('selectCard - 選牌張數上限', () => {
  it('已選 4 張數字牌時，第 5 張會被擋下', () => {
    const cards = [
      card('a', 1),
      card('b', 2),
      card('c', 3),
      card('d', 4),
      card('e', 5),
    ];
    const board = makeBoard(cards);
    board.selectedCards = [
      { number: cards[0] },
      { symbol: Symbol.Plus },
      { number: cards[1] },
      { symbol: Symbol.Plus },
      { number: cards[2] },
      { symbol: Symbol.Plus },
      { number: cards[3] },
    ];

    const result = selectCard(board, cards[4], undefined);
    expect(result.success).toBe(false);
  });
});
