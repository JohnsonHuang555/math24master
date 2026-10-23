import { afterEach, describe, expect, it, vi } from 'vitest';
import { canMake24 } from '@/lib/daily-seed';
import { BotMove, chooseBotMove, solveSet } from '@/lib/rummy-bot';
import {
  colorPattern,
  createRummyGame,
  drawCard,
  scoreSet,
  submitTurn,
  validateSet,
} from '@/lib/rummy-engine';
import { CardColor, NumberCard } from '@/models/Player';
import { RummyDifficulty, RummyGameState, RummySet } from '@/models/Rummy';

function card(id: string, value: number, color: CardColor = 'red'): NumberCard {
  return { id, value, color };
}

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function cardIdsOfTable(table: RummySet[]): string[] {
  return table.flatMap(cardIds).sort();
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

function findCard(set: RummySet, id: string): NumberCard {
  const tile = set.tiles.find(t => t.type === 'number' && t.card.id === id);
  if (!tile || tile.type !== 'number') throw new Error(`牌組中沒有 ${id}`);
  return tile.card;
}

function cardIds(set: RummySet): string[] {
  return set.tiles
    .flatMap(t => (t.type === 'number' ? [t.card.id] : []))
    .sort();
}

/** 輪到 Bot A（座位 1）的一局；其他座位手牌放一張不相干的牌 */
function botTurn(opts: {
  hand: NumberCard[];
  table?: RummySet[];
  difficulty?: RummyDifficulty;
}): RummyGameState {
  return {
    difficulty: opts.difficulty ?? 'normal',
    deck: [card('deck-1', 13, 'black')],
    table: opts.table ?? [],
    seats: [0, 1, 2].map(i => ({
      id: `seat-${i}`,
      name: `seat-${i}`,
      isBot: i > 0,
      hand: i === 1 ? opts.hand : [card(`filler-${i}`, 13, 'yellow')],
      score: 0,
    })),
    currentSeat: 1,
    turnsTaken: 0,
    status: 'playing',
  };
}

/** 把 Bot 的決定交給規則引擎執行；規則引擎是合法性的獨立檢查標準 */
function applyMove(state: RummyGameState, move: BotMove) {
  return move.type === 'draw' ? drawCard(state) : submitTurn(state, move.table);
}

describe('chooseBotMove - 基本', () => {
  it.each(['easy', 'normal', 'hard'] as const)(
    '%s：手牌和桌面都湊不出 24 時抽牌',
    difficulty => {
      const state = botTurn({
        hand: [card('a', 1), card('b', 1), card('c', 1)],
        difficulty,
      });
      expect(chooseBotMove(state)).toEqual({ type: 'draw' });
    },
  );

  it.each(['easy', 'normal', 'hard'] as const)(
    '%s：手牌湊得出牌組時出牌，而且規則引擎接受',
    difficulty => {
      const state = botTurn({
        hand: [card('a', 8), card('b', 2), card('c', 8), card('d', 13)],
        difficulty,
      });

      const move = chooseBotMove(state);

      expect(move.type).toBe('play');
      const result = applyMove(state, move);
      expect(result.success, result.success ? '' : result.error).toBe(true);
    },
  );
});

const n = (c: NumberCard) => ({ type: 'number' as const, card: c });
const op = (o: '+' | '-' | '*' | '/') => ({ type: 'operator' as const, op: o });

/** 桌上的紅8 × 紅2 + 紅8 */
function tableSet824(): RummySet {
  return {
    id: 't1',
    tiles: [
      n(card('t8a', 8, 'red')),
      op('*'),
      n(card('t2', 2, 'red')),
      op('+'),
      n(card('t8b', 8, 'red')),
    ],
  };
}

describe('chooseBotMove - 接牌', () => {
  it.each(['easy', 'normal', 'hard'] as const)(
    '%s：手牌自己湊不出時，把 1 張手牌接進桌上的牌組',
    difficulty => {
      const hand = [
        card('h1', 1),
        card('h13a', 13, 'yellow'),
        card('h13b', 13, 'blue'),
      ];
      expect(canMake24(hand.map(c => c.value))).toBe(false); // 前提：手牌自己湊不出
      const state = botTurn({ hand, table: [tableSet824()], difficulty });

      const move = chooseBotMove(state);

      expect(move.type).toBe('play');
      if (move.type !== 'play') return;
      expect(move.action.kind).toBe('extend');
      expect(move.table).toHaveLength(1);
      const result = applyMove(state, move);
      expect(result.success, result.success ? '' : result.error).toBe(true);
    },
  );
});

/** 用 solveSet 把指定牌值排成桌上的牌組（solveSet 本身另有測試） */
function tableSetOf(
  id: string,
  values: number[],
  colors: CardColor[],
): RummySet {
  const cards = values.map((v, i) =>
    card(`${id}-${i}`, v, colors[i % colors.length]),
  );
  const set = solveSet(cards);
  if (!set) throw new Error(`${values.join(',')} 湊不出 24`);
  return { ...set, id };
}

describe('chooseBotMove - 拆組（拆 1 組和手牌重組）', () => {
  // 桌上 5 張的牌組不能再接牌，手牌只有 1 張也組不成新組；
  // 唯一的出路是拆開重組：{1, 5, 4} 與 {2, 3, 4}
  function scenario(difficulty: RummyDifficulty) {
    const table = [tableSetOf('t1', [1, 2, 3, 4, 5], ['red'])];
    return botTurn({ hand: [card('h4', 4, 'red')], table, difficulty });
  }

  it.each(['normal', 'hard'] as const)(
    '%s：拆開桌上的牌組，和手牌重組成 2 組',
    difficulty => {
      const state = scenario(difficulty);

      const move = chooseBotMove(state);

      expect(move.type).toBe('play');
      if (move.type !== 'play') return;
      expect(move.action).toMatchObject({
        kind: 'regroup',
        fromSetIds: ['t1'],
      });
      expect(move.table).toHaveLength(2);
      const result = applyMove(state, move);
      expect(result.success, result.success ? '' : result.error).toBe(true);
    },
  );

  it('easy：不會拆組，只能抽牌', () => {
    expect(chooseBotMove(scenario('easy'))).toEqual({ type: 'draw' });
  });
});

describe('chooseBotMove - 合組（拆 2 組和手牌重組）', () => {
  // 單獨拆 A 或 B 加上手牌 6 都無法重組，兩組合起來才行
  function scenario(difficulty: RummyDifficulty) {
    const table = [
      tableSetOf('A', [3, 4, 11, 12, 13], ['red']),
      tableSetOf('B', [1, 2, 7, 12, 13], ['red']),
    ];
    return botTurn({ hand: [card('h6', 6, 'red')], table, difficulty });
  }

  it('hard：同時拆 2 組，和手牌重組', () => {
    const state = scenario('hard');

    const move = chooseBotMove(state);

    expect(move.type).toBe('play');
    if (move.type !== 'play') return;
    expect(move.action.kind).toBe('regroup');
    expect([...move.action.fromSetIds].sort()).toEqual(['A', 'B']);
    const result = applyMove(state, move);
    expect(result.success, result.success ? '' : result.error).toBe(true);
  });

  it.each(['easy', 'normal'] as const)(
    '%s：不會同時拆 2 組，只能抽牌',
    difficulty => {
      expect(chooseBotMove(scenario(difficulty))).toEqual({ type: 'draw' });
    },
  );
});

describe('chooseBotMove - 選擇策略', () => {
  // 桌上 紅1 紅2 紅12：只接紅 1 → 17 分；只接紅 9 → 6 分；兩張一起接 → 14 分
  const table = () => [tableSetOf('t1', [1, 2, 12], ['red'])];
  const r1 = () => card('r1', 1, 'red');
  const r9 = () => card('r9', 9, 'red');

  it.each(['normal', 'hard'] as const)(
    '%s：挑分數最高的一組，即使它用的手牌比較少',
    difficulty => {
      const state = botTurn({ hand: [r1(), r9()], table: table(), difficulty });

      const move = chooseBotMove(state);

      expect(move.type).toBe('play');
      if (move.type !== 'play') return;
      expect(move.action).toMatchObject({ handCardsUsed: 1, score: 17 });
    },
  );

  it('easy：從可行的走法中隨機挑，不同的隨機數會挑到不同的走法', () => {
    const state = botTurn({
      hand: [r1(), r9()],
      table: table(),
      difficulty: 'easy',
    });

    const first = chooseBotMove(state, () => 0);
    const last = chooseBotMove(state, () => 0.999);

    expect(first.type).toBe('play');
    expect(last.type).toBe('play');
    if (first.type !== 'play' || last.type !== 'play') return;
    expect(cardIdsOfTable(first.table)).not.toEqual(cardIdsOfTable(last.table));
  });
});

describe('chooseBotMove - 每回合只完成一組', () => {
  // 紅 8, 2, 8 與藍 4, 6, 1 可以各自組成一組
  const hand = () => [
    card('a', 8, 'red'),
    card('b', 2, 'red'),
    card('c', 8, 'red'),
    card('d', 4, 'blue'),
    card('e', 6, 'blue'),
    card('f', 1, 'blue'),
  ];

  it.each(['easy', 'normal', 'hard'] as const)(
    '%s：手牌能組成兩組時，這回合只出其中一組',
    difficulty => {
      const state = botTurn({ hand: hand(), difficulty });

      const move = chooseBotMove(state, () => 0);

      expect(move.type).toBe('play');
      if (move.type !== 'play') return;
      // 規則引擎會拒絕手牌分散在兩組的桌面；這裡確認只多出一組新牌組
      expect(move.table).toHaveLength(1);
      const result = applyMove(state, move);
      expect(result.success, result.success ? '' : result.error).toBe(true);
    },
  );
});

describe('chooseBotMove - 完整牌局', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each(['easy', 'normal', 'hard'] as const)(
    '%s：三個座位都由 Bot 操作，每一步規則引擎都接受，牌局正常結束',
    difficulty => {
      for (let seed = 1; seed <= 5; seed++) {
        vi.spyOn(Math, 'random').mockImplementation(seededRng(seed));
        let state = createRummyGame(difficulty);
        let turns = 0;
        while (state.status === 'playing') {
          const move = chooseBotMove(state);
          const result = applyMove(state, move);
          expect(
            result.success,
            result.success ? '' : `seed ${seed}：${result.error}`,
          ).toBe(true);
          if (!result.success) return;
          state = result.state;
          expect(++turns, `seed ${seed} 超過 500 回合仍未結束`).toBeLessThan(
            500,
          );
        }
        vi.restoreAllMocks();
      }
    },
    120_000,
  );
});

describe('solveSet', () => {
  it('有解時回傳一組成立的牌組，剛好用完給定的牌', () => {
    const cards = [card('a', 8), card('b', 2), card('c', 8)];

    const result = solveSet(cards);

    expect(result).not.toBeNull();
    if (!result) return;
    expect(validateSet(result)).toEqual({ valid: true });
    expect(cardIds(result)).toEqual(['a', 'b', 'c']);
  });

  it('有多種解時挑符號分最高的：12、2、1 → 12 ÷ (1 ÷ 2) 兩個 ÷ 7 分 × 1.5 = 11，勝過 12 × 2 × 1 的 5 × 1.5 = 8', () => {
    const cards = [card('a', 12), card('b', 2), card('c', 1)];

    const result = solveSet(cards);

    expect(result).not.toBeNull();
    if (!result) return;
    expect(scoreSet(result)).toBe(11);
  });

  it('顏色不符合限制時回傳 null，即使數字湊得出 24', () => {
    const cards = [
      card('a', 8, 'red'),
      card('b', 2, 'blue'),
      card('c', 8, 'red'),
    ];
    expect(solveSet(cards)).toBeNull();
  });

  it('未宣告的 Joker：宣告成讓牌組成立的值，其他牌同色時宣告同一色', () => {
    const cards = [joker('j'), card('a', 8, 'blue'), card('b', 3, 'blue')];

    const result = solveSet(cards);

    expect(result).not.toBeNull();
    if (!result) return;
    expect(validateSet(result)).toEqual({ valid: true });
    const declared = findCard(result, 'j');
    expect(declared.jokerDeclaredColor).toBe('blue');
  });

  it('未宣告的 Joker：其他 3 張三色時宣告缺少的那一色，湊成四色', () => {
    const cards = [
      joker('j'),
      card('a', 8, 'red'),
      card('b', 3, 'blue'),
      card('c', 1, 'yellow'),
    ];

    const result = solveSet(cards);

    expect(result).not.toBeNull();
    if (!result) return;
    expect(validateSet(result)).toEqual({ valid: true });
    expect(findCard(result, 'j').jokerDeclaredColor).toBe('black');
  });

  it('未宣告的 Joker：其他 2 張兩色時宣告第三種顏色，湊成全異色', () => {
    const cards = [joker('j'), card('a', 8, 'red'), card('b', 3, 'blue')];

    const result = solveSet(cards);

    expect(result).not.toBeNull();
    if (!result) return;
    expect(validateSet(result)).toEqual({ valid: true });
    expect(['yellow', 'black']).toContain(
      findCard(result, 'j').jokerDeclaredColor,
    );
  });

  it('未宣告的 Joker：其他牌的顏色無法用 1 張 Joker 補成合法組合時回傳 null', () => {
    // 紅紅藍已經有重複顏色，又不是同色，Joker 補什麼顏色都不行
    const cards = [
      joker('j'),
      card('a', 8, 'red'),
      card('b', 3, 'red'),
      card('c', 1, 'blue'),
    ];
    expect(solveSet(cards)).toBeNull();
  });

  it('已宣告的 Joker（桌上的）維持原本的宣告', () => {
    const cards = [
      joker('j', 2, 'black'),
      card('a', 8, 'black'),
      card('b', 8, 'black'),
    ];

    const result = solveSet(cards);

    expect(result).not.toBeNull();
    if (!result) return;
    expect(findCard(result, 'j')).toMatchObject({
      jokerDeclaredValue: 2,
      jokerDeclaredColor: 'black',
    });
  });

  it('兩張未宣告的 Joker 時回傳 null（Bot 每組最多放 1 張 Joker）', () => {
    expect(solveSet([joker('j1'), joker('j2'), card('a', 12)])).toBeNull();
  });

  it('無解時回傳 null', () => {
    expect(solveSet([card('a', 1), card('b', 1), card('c', 1)])).toBeNull();
  });

  it('隨機 3～5 張牌（隨機顏色）：有解與否 = 顏色合法且 canMake24，有解時一定通過 validateSet', () => {
    const rng = seededRng(42);
    const colors: CardColor[] = ['red', 'blue', 'yellow', 'black'];
    let solvable = 0;
    for (let round = 0; round < 600; round++) {
      const size = 3 + Math.floor(rng() * 3);
      // 一半的機率全部同色，避免隨機顏色幾乎都不合法、測不到有解的情況
      const sameColor = rng() < 0.5 ? colors[Math.floor(rng() * 4)] : null;
      const cards = Array.from({ length: size }, (_, i) =>
        card(
          `c${i}`,
          1 + Math.floor(rng() * 13),
          sameColor ?? colors[Math.floor(rng() * 4)],
        ),
      );
      const values = cards.map(c => c.value);
      const expected = colorPattern(cards) !== null && canMake24(values);

      const result = solveSet(cards);

      if (expected) solvable++;
      expect(result !== null, `牌 ${JSON.stringify(cards)}`).toBe(expected);
      if (result) {
        expect(validateSet(result), `牌值 ${values.join(',')}`).toEqual({
          valid: true,
        });
        expect(cardIds(result)).toEqual(cards.map(c => c.id).sort());
      }
    }
    expect(solvable).toBeGreaterThan(100); // 確認有測到足夠多有解的情況
  });
});
