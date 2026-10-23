import { describe, expect, it } from 'vitest';
import {
  createRummyGame,
  drawCard,
  scoreSet,
  submitTurn,
  validateSet,
} from '@/lib/rummy-engine';
import { CardColor, NumberCard } from '@/models/Player';
import {
  RummyGameState,
  RummyOperator,
  RummySet,
  RummyTile,
} from '@/models/Rummy';

function card(id: string, value: number, color: CardColor): NumberCard {
  return { id, value, color };
}

function joker(id: string, value?: number, color?: CardColor): NumberCard {
  return {
    id,
    value: 0,
    isJoker: true,
    jokerDeclaredValue: value,
    jokerDeclaredColor: color,
  };
}

const n = (c: NumberCard): RummyTile => ({ type: 'number', card: c });
const op = (o: RummyOperator): RummyTile => ({ type: 'operator', op: o });
const L: RummyTile = { type: 'bracket', bracket: '(' };
const R: RummyTile = { type: 'bracket', bracket: ')' };

function set(id: string, tiles: RummyTile[]): RummySet {
  return { id, tiles };
}

function unwrap(
  result:
    | { success: true; state: RummyGameState }
    | { success: false; error: string },
): RummyGameState {
  if (!result.success) throw new Error(result.error);
  return result.state;
}

/** 建立指定手牌、桌面、牌庫的一局；未指定的座位手牌留一張不相干的牌，避免誤判出完 */
function makeGame(opts: {
  hands: NumberCard[][];
  table?: RummySet[];
  deck?: NumberCard[];
  currentSeat?: number;
}): RummyGameState {
  return {
    difficulty: 'normal',
    deck: opts.deck ?? [card('deck-1', 13, 'black')],
    table: opts.table ?? [],
    seats: [0, 1, 2].map(i => ({
      id: `seat-${i}`,
      name: `seat-${i}`,
      isBot: i > 0,
      hand: opts.hands[i] ?? [card(`filler-${i}`, 13, 'yellow')],
      score: 0,
    })),
    currentSeat: opts.currentSeat ?? 0,
    status: 'playing',
  };
}

describe('submitTurn - 出牌', () => {
  it('用手牌組成新的牌組：手牌移到桌面、得分、換下一位', () => {
    const r3 = card('r3', 3, 'red');
    const r5 = card('r5', 5, 'red');
    const r3b = card('r3b', 3, 'red');
    const keep = card('keep', 9, 'blue');
    const game = makeGame({ hands: [[r3, r5, r3b, keep]] });
    const newSet = set('new', [L, n(r3), op('+'), n(r5), R, op('*'), n(r3b)]);

    const result = submitTurn(game, [newSet]);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.scoreGained).toBe(6);
    expect(result.state.table).toEqual([newSet]);
    expect(result.state.seats[0].hand).toEqual([keep]);
    expect(result.state.seats[0].score).toBe(6);
    expect(result.state.currentSeat).toBe(1);
  });
});

describe('submitTurn - 出完手牌結束', () => {
  it('手牌出完立即結束：先出完 +10，其他人剩下的牌每張 −1、Joker 每張 −5，依最終分數排名', () => {
    const r3 = card('r3', 3, 'red');
    const r5 = card('r5', 5, 'red');
    const r3b = card('r3b', 3, 'red');
    const game = makeGame({
      hands: [
        [r3, r5, r3b],
        [card('a1', 4, 'blue'), joker('aj')],
        [card('b1', 7, 'black')],
      ],
    });
    const lastSet = set('new', [L, n(r3), op('+'), n(r5), R, op('*'), n(r3b)]);

    const result = submitTurn(game, [lastSet]);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.status).toBe('ended');
    expect(result.state.result?.standings).toEqual([
      {
        seatId: 'seat-0',
        tableScore: 6,
        wentOutBonus: 10,
        leftoverPenalty: 0,
        finalScore: 16,
        rank: 1,
      },
      {
        seatId: 'seat-2',
        tableScore: 0,
        wentOutBonus: 0,
        leftoverPenalty: 1,
        finalScore: -1,
        rank: 2,
      },
      {
        seatId: 'seat-1',
        tableScore: 0,
        wentOutBonus: 0,
        leftoverPenalty: 6,
        finalScore: -6,
        rank: 3,
      },
    ]);
  });

  it('三人最終分數相同時全部並列第 1 名', () => {
    const r3 = card('r3', 3, 'red');
    const r5 = card('r5', 5, 'red');
    const r3b = card('r3b', 3, 'red');
    const game = makeGame({
      hands: [[r3, r5, r3b], [card('a1', 4, 'blue')], [card('b1', 7, 'black')]],
    });
    const lastSet = set('new', [L, n(r3), op('+'), n(r5), R, op('*'), n(r3b)]);
    // Bot A、Bot B 各剩 1 張，若事先都有 17 分，最終都是 16 分，和玩家（6 + 10）同分
    game.seats[1].score = 17;
    game.seats[2].score = 17;

    const result = submitTurn(game, [lastSet]);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.result?.standings.map(s => s.rank)).toEqual([1, 1, 1]);
  });

  it('兩人並列第一時，第三人是第 3 名', () => {
    const r3 = card('r3', 3, 'red');
    const r5 = card('r5', 5, 'red');
    const r3b = card('r3b', 3, 'red');
    const game = makeGame({
      hands: [[r3, r5, r3b], [card('a1', 4, 'blue')], [card('b1', 7, 'black')]],
    });
    const lastSet = set('new', [L, n(r3), op('+'), n(r5), R, op('*'), n(r3b)]);
    game.seats[1].score = 17; // 17 − 1 = 16，和玩家同分

    const result = submitTurn(game, [lastSet]);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.result?.standings.map(s => [s.seatId, s.rank])).toEqual(
      [
        ['seat-0', 1],
        ['seat-1', 1],
        ['seat-2', 3],
      ],
    );
  });
});

describe('submitTurn - 重組桌面的計分', () => {
  it('只有用到本回合手牌的牌組計分；只被重排、沒有手牌的牌組不計分', () => {
    const r8 = card('r8', 8, 'red');
    const b2 = card('b2', 2, 'blue');
    const k8 = card('k8', 8, 'black');
    const y4 = card('y4', 4, 'yellow');
    const y6 = card('y6', 6, 'yellow');
    const y1 = card('y1', 1, 'yellow');
    const r1 = card('r1', 1, 'red');
    const t1 = set('t1', [n(r8), op('*'), n(b2), op('+'), n(k8)]);
    const t2 = set('t2', [n(y4), op('*'), n(y6), op('*'), n(y1)]);
    const game = makeGame({
      hands: [[r1, card('keep', 9, 'blue')]],
      table: [t1, t2],
    });

    // t1 接上手牌 r1：(8 × 2 + 8) × 1，符號 × + × = 5 + 雙乘號 1 + 4 張 1 = 7，顏色混雜 ×1
    const t1Extended = set('t1', [
      L,
      n(r8),
      op('*'),
      n(b2),
      op('+'),
      n(k8),
      R,
      op('*'),
      n(r1),
    ]);
    // t2 只是重排，沒有手牌
    const t2Rearranged = set('t2', [n(y6), op('*'), n(y4), op('/'), n(y1)]);

    const result = submitTurn(game, [t1Extended, t2Rearranged]);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.scoreGained).toBe(7);
  });
});

describe('submitTurn - 拒絕不合法的桌面', () => {
  const r8 = card('r8', 8, 'red');
  const b2 = card('b2', 2, 'blue');
  const k8 = card('k8', 8, 'black');
  const tableSet = set('t1', [n(r8), op('*'), n(b2), op('+'), n(k8)]);

  function expectRejected(
    game: RummyGameState,
    table: RummySet[],
    error: string,
  ) {
    expect(submitTurn(game, table)).toEqual({ success: false, error });
  }

  it('有任何一組不成立時拒絕，並指出是第幾組', () => {
    const y1 = card('y1', 1, 'yellow');
    const y2 = card('y2', 2, 'yellow');
    const y3 = card('y3', 3, 'yellow');
    const game = makeGame({ hands: [[y1, y2, y3]], table: [tableSet] });
    const bad = set('new', [n(y1), op('+'), n(y2), op('+'), n(y3)]);

    expectRejected(game, [tableSet, bad], '第 2 組：目前 = 6');
  });

  it('本回合沒有打出任何手牌時拒絕（只重組桌面不算出牌）', () => {
    const game = makeGame({
      hands: [[card('h', 1, 'red')]],
      table: [tableSet],
    });
    const rearranged = set('t1', [n(b2), op('*'), n(r8), op('+'), n(k8)]);

    expectRejected(game, [rearranged], '本回合至少要從手牌打出 1 張牌');
  });

  it('桌面上的牌不見了時拒絕（不能把桌上的牌拿回手牌）', () => {
    const y4 = card('y4', 4, 'yellow');
    const y6 = card('y6', 6, 'yellow');
    const y1 = card('y1', 1, 'yellow');
    const game = makeGame({ hands: [[y4, y6, y1]], table: [tableSet] });
    const mine = set('new', [n(y4), op('*'), n(y6), op('*'), n(y1)]);

    expectRejected(game, [mine], '桌面上的牌不能拿回手牌');
  });

  it('出現不在手牌、也不在桌面上的牌時拒絕', () => {
    const y4 = card('y4', 4, 'yellow');
    const y6 = card('y6', 6, 'yellow');
    const opponents = card('opp', 1, 'yellow');
    const game = makeGame({ hands: [[y4, y6], [opponents]] });
    const s = set('new', [n(y4), op('*'), n(y6), op('*'), n(opponents)]);

    expectRejected(game, [s], '使用了不屬於你的牌');
  });

  it('同一張牌出現兩次時拒絕', () => {
    const y4 = card('y4', 4, 'yellow');
    const y6 = card('y6', 6, 'yellow');
    const y1 = card('y1', 1, 'yellow');
    const game = makeGame({ hands: [[y4, y6, y1]] });
    const a = set('a', [n(y4), op('*'), n(y6), op('*'), n(y1)]);
    const b = set('b', [n(y4), op('*'), n(y6), op('/'), n(y1)]);

    expectRejected(game, [a, b], '同一張牌不能使用兩次');
  });

  it('改變桌上 Joker 的宣告時拒絕（宣告後永久固定）', () => {
    const j = joker('j', 2, 'blue');
    const onTable = set('t1', [n(r8), op('*'), n(j), op('+'), n(k8)]);
    const r1 = card('r1', 1, 'red');
    const game = makeGame({ hands: [[r1]], table: [onTable] });

    // 把 Joker 從藍 2 改宣告成紅 2，再接上手牌：(8 × 2 + 8) × 1，算式本身仍等於 24
    const redeclared = joker('j', 2, 'red');
    const changed = set('t1', [
      L,
      n(r8),
      op('*'),
      n(redeclared),
      op('+'),
      n(k8),
      R,
      op('*'),
      n(r1),
    ]);

    expectRejected(game, [changed], '桌上 Joker 的宣告不能更改');
  });
});

describe('drawCard', () => {
  it('從牌庫抽 1 張到目前玩家手牌，換下一位', () => {
    const top = card('top', 7, 'red');
    const below = card('below', 2, 'blue');
    const mine = card('mine', 1, 'red');
    const game = makeGame({ hands: [[mine]], deck: [below, top] });

    const result = drawCard(game);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.seats[0].hand).toEqual([mine, top]);
    expect(result.state.deck).toEqual([below]);
    expect(result.state.currentSeat).toBe(1);
  });

  it('抽走最後一張後進入最後一圈：所有人各再行動一次（出牌或抽牌都算）就結束，沒有人拿到出完加分', () => {
    const b8 = card('b8', 8, 'blue');
    const b2 = card('b2', 2, 'blue');
    const b8b = card('b8b', 8, 'blue');
    let game = makeGame({
      hands: [[card('p', 1, 'red')], [b8, b2, b8b, card('keep', 5, 'red')]],
      deck: [card('last', 9, 'black')],
    });

    const steps: ((g: RummyGameState) => RummyGameState)[] = [
      g => unwrap(drawCard(g)), // 玩家抽走最後一張 → 最後一圈開始
      g =>
        unwrap(
          submitTurn(g, [set('new', [n(b8), op('*'), n(b2), op('+'), n(b8b)])]),
        ), // Bot A 出牌
      g => unwrap(drawCard(g)), // Bot B 牌庫已空，等同跳過
    ];
    for (const step of steps) {
      game = step(game);
      expect(game.status).toBe('playing');
    }

    game = unwrap(drawCard(game)); // 玩家最後一次行動

    expect(game.status).toBe('ended');
    expect(game.result?.standings.every(s => s.wentOutBonus === 0)).toBe(true);
  });
});

describe('一局結束後', () => {
  it('不能再出牌或抽牌', () => {
    const y4 = card('y4', 4, 'yellow');
    const y6 = card('y6', 6, 'yellow');
    const y1 = card('y1', 1, 'yellow');
    const ended: RummyGameState = {
      ...makeGame({ hands: [[y4, y6, y1]] }),
      status: 'ended',
    };
    const s = set('new', [n(y4), op('*'), n(y6), op('*'), n(y1)]);

    expect(submitTurn(ended, [s])).toEqual({
      success: false,
      error: '這局已經結束',
    });
    expect(drawCard(ended)).toEqual({ success: false, error: '這局已經結束' });
  });
});

describe('createRummyGame', () => {
  it('1 位玩家與 2 個 Bot 各發 10 張，其餘 76 張留在牌庫，玩家先手', () => {
    const game = createRummyGame('normal');

    expect(game.seats.map(s => s.isBot)).toEqual([false, true, true]);
    expect(game.seats.map(s => s.hand.length)).toEqual([10, 10, 10]);
    expect(game.deck).toHaveLength(76);
    expect(game.table).toEqual([]);
    expect(game.currentSeat).toBe(0);
    expect(game.status).toBe('playing');

    const allCards = [...game.deck, ...game.seats.flatMap(s => s.hand)];
    expect(new Set(allCards.map(c => c.id)).size).toBe(106);
    expect(allCards.filter(c => c.isJoker)).toHaveLength(2);
  });
});

describe('scoreSet', () => {
  it('同色 3 張 (3 + 5) × 3：(1 + 2 + 0) × 2 = 6 分（規格書範例）', () => {
    const s = set('s1', [
      L,
      n(card('a', 3, 'red')),
      op('+'),
      n(card('b', 5, 'red')),
      R,
      op('*'),
      n(card('c', 3, 'red')),
    ]);
    expect(scoreSet(s)).toBe(6);
  });

  it('全異色 4 張 4 × 3 × 1 × 2：(三個 × 6 + 雙乘號 1 + 4 張 1) × 1.5 = 12 分', () => {
    const s = set('s1', [
      n(card('a', 4, 'red')),
      op('*'),
      n(card('b', 3, 'blue')),
      op('*'),
      n(card('c', 1, 'yellow')),
      op('*'),
      n(card('d', 2, 'black')),
    ]);
    expect(scoreSet(s)).toBe(12);
  });

  it('Joker 以宣告的顏色計算：紅 8 × 紅 3 × Joker(宣告紅 1) 視為同色 = (5 + 0) × 2 = 10 分', () => {
    const s = set('s1', [
      n(card('a', 8, 'red')),
      op('*'),
      n(card('b', 3, 'red')),
      op('*'),
      n(joker('j', 1, 'red')),
    ]);
    expect(scoreSet(s)).toBe(10);
  });

  it('單組分數四捨五入：全異色 3 張 (1 + 2) × 8 = 3 × 1.5 = 4.5 → 5 分', () => {
    const s = set('s1', [
      L,
      n(card('a', 1, 'red')),
      op('+'),
      n(card('b', 2, 'blue')),
      R,
      op('*'),
      n(card('c', 8, 'yellow')),
    ]);
    expect(scoreSet(s)).toBe(5);
  });
});

describe('validateSet', () => {
  it('結果等於 24 的 3 張牌組成立', () => {
    const s = set('s1', [
      n(card('a', 8, 'red')),
      op('*'),
      n(card('b', 2, 'blue')),
      op('+'),
      n(card('c', 8, 'black')),
    ]);
    expect(validateSet(s)).toEqual({ valid: true });
  });

  it('結果不是 24 時不成立，並回報目前的結果', () => {
    const s = set('s1', [
      n(card('a', 8, 'red')),
      op('+'),
      n(card('b', 2, 'blue')),
      op('+'),
      n(card('c', 8, 'black')),
    ]);
    expect(validateSet(s)).toEqual({ valid: false, reason: '目前 = 18' });
  });

  it('少於 3 張牌時不成立，即使結果等於 24', () => {
    const s = set('s1', [
      n(card('a', 12, 'red')),
      op('*'),
      n(card('b', 2, 'blue')),
    ]);
    expect(validateSet(s)).toEqual({
      valid: false,
      reason: '需要 3～5 張數字牌（目前 2 張）',
    });
  });

  it('多於 5 張牌時不成立', () => {
    const tiles: RummyTile[] = [n(card('a', 4, 'red'))];
    ['b', 'c', 'd', 'e', 'f'].forEach(id =>
      tiles.push(op('+'), n(card(id, 4, 'red'))),
    );
    expect(validateSet(set('s1', tiles))).toEqual({
      valid: false,
      reason: '需要 3～5 張數字牌（目前 6 張）',
    });
  });

  it.each([
    [
      '括號未關閉',
      [
        L,
        n(card('a', 8, 'red')),
        op('*'),
        n(card('b', 2, 'red')),
        op('+'),
        n(card('c', 8, 'red')),
      ],
    ],
    [
      '兩張數字牌相鄰',
      [
        n(card('a', 8, 'red')),
        n(card('b', 2, 'red')),
        op('+'),
        n(card('c', 8, 'red')),
      ],
    ],
    [
      '結尾是運算符號',
      [
        n(card('a', 8, 'red')),
        op('*'),
        n(card('b', 2, 'red')),
        op('+'),
        n(card('c', 8, 'red')),
        op('+'),
      ],
    ],
  ])('算式格式錯誤（%s）時不成立，不拋錯', (_, tiles) => {
    expect(validateSet(set('s1', tiles))).toEqual({
      valid: false,
      reason: '算式格式錯誤',
    });
  });

  it('Joker 以宣告的數值計算', () => {
    const s = set('s1', [
      n(card('a', 8, 'red')),
      op('*'),
      n(joker('j', 2, 'blue')),
      op('+'),
      n(card('c', 8, 'black')),
    ]);
    expect(validateSet(s)).toEqual({ valid: true });
  });

  it('Joker 尚未宣告時不成立', () => {
    const s = set('s1', [
      n(card('a', 8, 'red')),
      op('*'),
      n(joker('j')),
      op('+'),
      n(card('c', 8, 'black')),
    ]);
    expect(validateSet(s)).toEqual({
      valid: false,
      reason: 'Joker 尚未宣告數值與顏色',
    });
  });

  it('非整數結果顯示到小數點後兩位', () => {
    const s = set('s1', [
      n(card('a', 8, 'red')),
      op('/'),
      n(card('b', 3, 'red')),
      op('+'),
      n(card('c', 1, 'red')),
    ]);
    expect(validateSet(s)).toEqual({ valid: false, reason: '目前 = 3.67' });
  });

  it('除以 0 時不成立', () => {
    const s = set('s1', [
      n(card('a', 8, 'red')),
      op('/'),
      L,
      n(card('b', 3, 'red')),
      op('-'),
      n(card('c', 3, 'blue')),
      R,
    ]);
    expect(validateSet(s)).toEqual({ valid: false, reason: '不能除以 0' });
  });
});
