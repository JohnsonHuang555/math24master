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

function deckOf(count: number): NumberCard[] {
  return Array.from({ length: count }, (_, i) =>
    card(`deck-${i}`, 13, 'black'),
  );
}

/** 建立指定手牌、桌面、牌庫的一局；未指定的座位手牌留一張不相干的牌 */
function makeGame(opts: {
  hands: NumberCard[][];
  table?: RummySet[];
  deck?: NumberCard[];
  currentSeat?: number;
  turnsTaken?: number;
  scores?: number[];
}): RummyGameState {
  return {
    difficulty: 'normal',
    deck: opts.deck ?? deckOf(20),
    table: opts.table ?? [],
    seats: [0, 1, 2].map(i => ({
      id: `seat-${i}`,
      name: `seat-${i}`,
      isBot: i > 0,
      hand: opts.hands[i] ?? [card(`filler-${i}`, 13, 'yellow')],
      score: opts.scores?.[i] ?? 0,
    })),
    currentSeat: opts.currentSeat ?? 0,
    turnsTaken: opts.turnsTaken ?? 0,
    status: 'playing',
  };
}

/** 紅 (3 + 5) × 3 = 24，同色 3 張 = 5 分 */
function redSet(id = 'new') {
  const cards = [
    card(`${id}-a`, 3, 'red'),
    card(`${id}-b`, 5, 'red'),
    card(`${id}-c`, 3, 'red'),
  ];
  const tiles = [L, n(cards[0]), op('+'), n(cards[1]), R, op('*'), n(cards[2])];
  return { cards, set: set(id, tiles) };
}

describe('submitTurn - 出牌', () => {
  it('用手牌組成新的牌組：手牌移到桌面、得分、補牌到 10 張、換下一位', () => {
    const { cards, set: newSet } = redSet();
    const keep = card('keep', 9, 'blue');
    const game = makeGame({ hands: [[...cards, keep]], deck: deckOf(20) });

    const result = submitTurn(game, [newSet]);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.scoreGained).toBe(5);
    expect(result.state.table).toEqual([newSet]);
    expect(result.state.seats[0].hand).toHaveLength(10);
    expect(result.state.seats[0].hand[0]).toEqual(keep);
    expect(result.state.deck).toHaveLength(11);
    expect(result.state.seats[0].score).toBe(5);
    expect(result.state.currentSeat).toBe(1);
    expect(result.state.turnsTaken).toBe(1);
  });

  it('牌庫不夠補滿時，補到牌庫用完為止', () => {
    const { cards, set: newSet } = redSet();
    const keep = card('keep', 9, 'blue');
    const game = makeGame({ hands: [[...cards, keep]], deck: deckOf(2) });

    const result = submitTurn(game, [newSet]);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.seats[0].hand).toHaveLength(3);
    expect(result.state.deck).toEqual([]);
  });

  it('出牌後手牌仍有 10 張以上時不補牌', () => {
    const { cards, set: newSet } = redSet();
    const others = Array.from({ length: 10 }, (_, i) =>
      card(`h${i}`, 9, 'blue'),
    );
    const game = makeGame({ hands: [[...cards, ...others]], deck: deckOf(5) });

    const result = submitTurn(game, [newSet]);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.seats[0].hand).toEqual(others);
    expect(result.state.deck).toHaveLength(5);
  });

  it('牌庫已空時手牌出完也不會提前結束，一局照樣打滿回合數', () => {
    const { cards, set: newSet } = redSet();
    const game = makeGame({ hands: [cards], deck: [] });

    const result = submitTurn(game, [newSet]);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.seats[0].hand).toEqual([]);
    expect(result.state.status).toBe('playing');
  });
});

describe('submitTurn - 每回合只完成一組牌組', () => {
  it('本回合的手牌分散到 2 組牌組時拒絕', () => {
    const a = redSet('a');
    const y4 = card('y4', 4, 'yellow');
    const y6 = card('y6', 6, 'yellow');
    const y1 = card('y1', 1, 'yellow');
    const b = set('b', [n(y4), op('*'), n(y6), op('*'), n(y1)]);
    const game = makeGame({ hands: [[...a.cards, y4, y6, y1]] });

    expect(submitTurn(game, [a.set, b])).toEqual({
      success: false,
      error: '每回合只能完成一組牌組（你的手牌分散在 2 組）',
    });
  });

  it('手牌只進到 1 組時，其他牌組可以一起重排；只有含手牌的那一組計分', () => {
    const r8 = card('r8', 8, 'red');
    const b2 = card('b2', 2, 'red');
    const k8 = card('k8', 8, 'red');
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

    // t1 接上手牌 r1：(8 × 2 + 8) × 1，符號 × + × = 5 + 雙乘號 1 + 4 張 1 = 7，同色 ×1.5 = 10.5 → 11
    // （若 t2 也誤算進來：6 × 4 ÷ 1 同色 (2 + 3) × 1.5 = 7.5 → 8，合計會是 19）
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
    expect(result.scoreGained).toBe(11);
  });
});

describe('一局結束', () => {
  it('所有人各行動 6 回合後結束，依總分排名', () => {
    // 已行動 17 回合，輪到 Bot B 的第 6 回合
    const game = makeGame({
      hands: [],
      currentSeat: 2,
      turnsTaken: 17,
      scores: [10, 4, 7],
    });

    const result = drawCard(game);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.status).toBe('ended');
    expect(result.state.result?.standings).toEqual([
      { seatId: 'seat-0', score: 10, rank: 1 },
      { seatId: 'seat-2', score: 7, rank: 2 },
      { seatId: 'seat-1', score: 4, rank: 3 },
    ]);
  });

  it('還沒打滿回合數時不會結束', () => {
    const game = makeGame({ hands: [], currentSeat: 1, turnsTaken: 16 });

    const result = drawCard(game);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.status).toBe('playing');
    expect(result.state.turnsTaken).toBe(17);
  });

  it('最後一回合出牌時，這一組的分數也算進結算', () => {
    const { cards, set: lastSet } = redSet();
    const game = makeGame({
      hands: [[], [], cards],
      currentSeat: 2,
      turnsTaken: 17,
      scores: [3, 3, 0],
    });

    const result = submitTurn(game, [lastSet]);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.status).toBe('ended');
    expect(result.state.result?.standings[0]).toEqual({
      seatId: 'seat-2',
      score: 5,
      rank: 1,
    });
  });

  it.each([
    [
      [10, 10, 4],
      [1, 1, 3],
    ],
    [
      [5, 5, 5],
      [1, 1, 1],
    ],
  ])(
    '總分 %j 時名次為 %j（同分並列，下一名跳過並列的人數）',
    (scores, ranks) => {
      const game = makeGame({
        hands: [],
        currentSeat: 2,
        turnsTaken: 17,
        scores,
      });

      const result = drawCard(game);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.state.result?.standings.map(s => s.rank)).toEqual(ranks);
    },
  );
});

describe('submitTurn - 拒絕不合法的桌面', () => {
  const r8 = card('r8', 8, 'red');
  const b2 = card('b2', 2, 'red');
  const k8 = card('k8', 8, 'red');
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
    // 桌上：紅8 × Joker(紅 3) × 紅1
    const r1 = card('r1', 1, 'red');
    const onTable = set('t1', [
      n(r8),
      op('*'),
      n(joker('j', 3, 'red')),
      op('*'),
      n(r1),
    ]);
    const game = makeGame({ hands: [[k8]], table: [onTable] });

    // 把 Joker 從紅 3 改宣告成紅 2，再接上手牌紅 8：(8 × 2 + 8) × 1，算式本身仍等於 24、全紅
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
    expect(result.state.turnsTaken).toBe(1);
  });

  it('牌庫已空時抽牌等同跳過這回合', () => {
    const mine = card('mine', 1, 'red');
    const game = makeGame({ hands: [[mine]], deck: [] });

    const result = drawCard(game);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.seats[0].hand).toEqual([mine]);
    expect(result.state.currentSeat).toBe(1);
    expect(result.state.turnsTaken).toBe(1);
  });
});

describe('一局結束後', () => {
  it('不能再出牌或抽牌', () => {
    const { cards, set: s } = redSet();
    const ended: RummyGameState = {
      ...makeGame({ hands: [cards] }),
      status: 'ended',
    };

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
    expect(game.turnsTaken).toBe(0);
    expect(game.status).toBe('playing');

    const allCards = [...game.deck, ...game.seats.flatMap(s => s.hand)];
    expect(new Set(allCards.map(c => c.id)).size).toBe(106);
    expect(allCards.filter(c => c.isJoker)).toHaveLength(2);
  });
});

describe('scoreSet', () => {
  it('同色 3 張 (3 + 5) × 3：(1 + 2 + 0) × 1.5 = 4.5，四捨五入為 5 分（規格書範例）', () => {
    const s = set('s1', [
      L,
      n(card('a', 3, 'red')),
      op('+'),
      n(card('b', 5, 'red')),
      R,
      op('*'),
      n(card('c', 3, 'red')),
    ]);
    expect(scoreSet(s)).toBe(5);
  });

  it('全異色 3 張 (1 + 2) × 8：(1 + 2 + 0) × 2 = 6 分', () => {
    const s = set('s1', [
      L,
      n(card('a', 1, 'red')),
      op('+'),
      n(card('b', 2, 'blue')),
      R,
      op('*'),
      n(card('c', 8, 'yellow')),
    ]);
    expect(scoreSet(s)).toBe(6);
  });

  it('全異色 4 張 4 × 3 × 1 × 2：(三個 × 6 + 雙乘號 1 + 4 張 1) × 2 = 16 分', () => {
    const s = set('s1', [
      n(card('a', 4, 'red')),
      op('*'),
      n(card('b', 3, 'blue')),
      op('*'),
      n(card('c', 1, 'yellow')),
      op('*'),
      n(card('d', 2, 'black')),
    ]);
    expect(scoreSet(s)).toBe(16);
  });

  it('Joker 以宣告的顏色計算：紅 8 × 紅 3 × Joker(宣告紅 1) 視為同色 = (5 + 0) × 1.5 = 7.5 → 8 分', () => {
    const s = set('s1', [
      n(card('a', 8, 'red')),
      op('*'),
      n(card('b', 3, 'red')),
      op('*'),
      n(joker('j', 1, 'red')),
    ]);
    expect(scoreSet(s)).toBe(8);
  });
});

describe('validateSet', () => {
  it('結果等於 24 的 3 張牌組成立', () => {
    const s = set('s1', [
      n(card('a', 8, 'red')),
      op('*'),
      n(card('b', 2, 'red')),
      op('+'),
      n(card('c', 8, 'red')),
    ]);
    expect(validateSet(s)).toEqual({ valid: true });
  });

  it('結果不是 24 時不成立，並回報目前的結果', () => {
    const s = set('s1', [
      n(card('a', 8, 'red')),
      op('+'),
      n(card('b', 2, 'red')),
      op('+'),
      n(card('c', 8, 'red')),
    ]);
    expect(validateSet(s)).toEqual({ valid: false, reason: '目前 = 18' });
  });

  it('少於 3 張牌時不成立，即使結果等於 24', () => {
    const s = set('s1', [
      n(card('a', 12, 'red')),
      op('*'),
      n(card('b', 2, 'red')),
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
      n(joker('j', 2, 'red')),
      op('+'),
      n(card('c', 8, 'red')),
    ]);
    expect(validateSet(s)).toEqual({ valid: true });
  });

  it('Joker 尚未宣告時不成立', () => {
    const s = set('s1', [
      n(card('a', 8, 'red')),
      op('*'),
      n(joker('j')),
      op('+'),
      n(card('c', 8, 'red')),
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
      n(card('c', 3, 'red')),
      R,
    ]);
    expect(validateSet(s)).toEqual({ valid: false, reason: '不能除以 0' });
  });
});

describe('validateSet - 顏色限制', () => {
  it('4 張紅藍黃黑各一（四色）成立', () => {
    const s = set('s1', [
      n(card('a', 4, 'red')),
      op('*'),
      n(card('b', 3, 'blue')),
      op('*'),
      n(card('c', 1, 'yellow')),
      op('*'),
      n(card('d', 2, 'black')),
    ]);
    expect(validateSet(s)).toEqual({ valid: true });
  });

  it('Joker 以宣告的顏色補成四色時成立', () => {
    const s = set('s1', [
      n(card('a', 4, 'red')),
      op('*'),
      n(card('b', 6, 'blue')),
      op('*'),
      n(card('c', 1, 'yellow')),
      op('*'),
      n(joker('j', 1, 'black')),
    ]);
    expect(validateSet(s)).toEqual({ valid: true });
  });

  it('3 張三種不同顏色（全異色）成立', () => {
    const s = set('s1', [
      n(card('a', 8, 'red')),
      op('*'),
      n(card('b', 2, 'blue')),
      op('+'),
      n(card('c', 8, 'black')),
    ]);
    expect(validateSet(s)).toEqual({ valid: true });
  });

  it('3 張只有兩種顏色時不成立', () => {
    const s = set('s1', [
      n(card('a', 8, 'red')),
      op('*'),
      n(card('b', 2, 'red')),
      op('+'),
      n(card('c', 8, 'blue')),
    ]);
    expect(validateSet(s)).toEqual({
      valid: false,
      reason: '3 張的牌組必須同色，或三種不同顏色',
    });
  });

  it('4 張有重複顏色、又不是全部同色時不成立', () => {
    const s = set('s1', [
      n(card('a', 2, 'red')),
      op('*'),
      n(card('b', 3, 'blue')),
      op('*'),
      n(card('c', 4, 'yellow')),
      op('*'),
      n(card('d', 1, 'red')),
    ]);
    expect(validateSet(s)).toEqual({
      valid: false,
      reason: '4 張的牌組必須同色，或紅藍黃黑各一張',
    });
  });

  it('5 張不同色時不成立（5 張必須同色）', () => {
    const s = set('s1', [
      n(card('a', 2, 'black')),
      op('*'),
      n(card('b', 3, 'black')),
      op('*'),
      n(card('c', 4, 'black')),
      op('*'),
      n(card('d', 1, 'black')),
      op('*'),
      n(card('e', 1, 'red')),
    ]);
    expect(validateSet(s)).toEqual({
      valid: false,
      reason: '5 張的牌組必須同色',
    });
  });

  it('Joker 宣告的顏色造成兩種顏色混雜時不成立', () => {
    const s = set('s1', [
      n(card('a', 8, 'red')),
      op('*'),
      n(card('b', 3, 'red')),
      op('*'),
      n(joker('j', 1, 'blue')),
    ]);
    expect(validateSet(s)).toEqual({
      valid: false,
      reason: '3 張的牌組必須同色，或三種不同顏色',
    });
  });
});
