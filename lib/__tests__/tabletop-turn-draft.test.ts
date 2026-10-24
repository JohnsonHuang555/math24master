import { describe, expect, it } from 'vitest';
import {
  ComposerSymbol,
  TurnDraft,
  addCard,
  addSymbol,
  backspace,
  breakSet,
  checkEndTurn,
  clearComposer,
  commitComposer,
  previewComposer,
  startDraft,
} from '@/lib/tabletop-turn-draft';
import { CardColor, NumberCard } from '@/models/Player';
import { TabletopGameState, TabletopSet } from '@/models/Tabletop';

function card(id: string, value: number, color: CardColor = 'red'): NumberCard {
  return { id, value, color };
}

function game(opts: {
  hand: NumberCard[];
  table?: TabletopSet[];
}): TabletopGameState {
  return {
    difficulty: 'normal',
    deck: Array.from({ length: 20 }, (_, i) => card(`deck-${i}`, 13, 'black')),
    table: opts.table ?? [],
    seats: [0, 1, 2].map(i => ({
      id: `seat-${i}`,
      name: `seat-${i}`,
      isBot: i > 0,
      hand: i === 0 ? opts.hand : [card(`filler-${i}`, 13, 'yellow')],
      score: 0,
    })),
    currentSeat: 0,
    turnsTaken: 0,
    status: 'playing',
  };
}

/** 測試用：操作失敗就直接丟錯，讓測試專注在成功路徑 */
function ok(
  result: { ok: true; draft: TurnDraft } | { ok: false; error: string },
) {
  if (!result.ok) throw new Error(result.error);
  return result.draft;
}

describe('出牌的基本流程', () => {
  it('從手牌選牌、加運算符號、放上桌面後，就能結束回合', () => {
    const state = game({
      hand: [card('a', 8), card('b', 2), card('c', 8), card('d', 5)],
    });
    let draft = startDraft(state);

    draft = ok(addCard(draft, 'a'));
    draft = ok(addSymbol(draft, '*'));
    draft = ok(addCard(draft, 'b'));
    draft = ok(addSymbol(draft, '+'));
    draft = ok(addCard(draft, 'c'));
    draft = ok(commitComposer(draft));

    expect(draft.composer).toEqual([]);
    expect(draft.hand.map(c => c.id)).toEqual(['d']);
    expect(draft.table).toHaveLength(1);
    const end = checkEndTurn(state, draft);
    expect(end.ok).toBe(true);
    if (!end.ok) return;
    expect(end.scoreGained).toBe(6); // 8 × 2 + 8：(× 2 + + 1) × 同色 2 = 6
  });
});

describe('退格與清空組裝列', () => {
  it('退格移除最後一格；數字牌退回原本的地方（手牌或散牌區）', () => {
    const state = game({ hand: [card('h1', 1)], table: [tableSet()] });
    let draft = ok(breakSet(startDraft(state), 't1'));
    draft = ok(addCard(draft, 't8a'));
    draft = ok(addSymbol(draft, '*'));
    draft = ok(addCard(draft, 'h1'));

    draft = backspace(draft);
    expect(draft.hand.map(c => c.id)).toEqual(['h1']);
    expect(draft.composer).toHaveLength(2);

    draft = backspace(draft); // 運算符號直接丟掉
    draft = backspace(draft);
    expect(draft.composer).toEqual([]);
    expect(draft.loose.map(c => c.id).sort()).toEqual(['t2', 't8a', 't8b']);
  });

  it('清空組裝列時，所有數字牌一次退回', () => {
    const state = game({ hand: [card('a', 8), card('b', 2)] });
    let draft = ok(addCard(startDraft(state), 'a'));
    draft = ok(addSymbol(draft, '*'));
    draft = ok(addCard(draft, 'b'));

    draft = clearComposer(draft);

    expect(draft.composer).toEqual([]);
    expect(draft.hand.map(c => c.id).sort()).toEqual(['a', 'b']);
  });

  it('組裝列是空的時，退格不做任何事', () => {
    const draft = startDraft(game({ hand: [card('a', 8)] }));
    expect(backspace(draft)).toEqual(draft);
  });
});

describe('組裝列的輸入防呆', () => {
  // 依序執行：字母是手牌 id，其他是符號
  const hand = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => card(id, i + 1));
  type Step = string;
  function run(steps: Step[]) {
    let draft = startDraft(game({ hand }));
    for (const step of steps) {
      const result = /^[a-f]$/.test(step)
        ? addCard(draft, step)
        : addSymbol(draft, step as ComposerSymbol);
      if (!result.ok) return result;
      draft = result.draft;
    }
    return { ok: true as const, draft };
  }

  it.each([
    [['a', 'b'], '數字牌之間要有運算符號'],
    [['(', 'a', ')', 'b'], '數字牌之間要有運算符號'],
    [['+'], '運算符號前面要先有數字'],
    [['a', '+', '*'], '運算符號前面要先有數字'],
    [['(', '*'], '運算符號前面要先有數字'],
    [['a', '('], '左括號前面要有運算符號'],
    [['a', ')'], '右括號沒有對應的左括號'],
    [['(', 'a', '+', ')'], '右括號前面要先有數字'],
    [
      ['a', '+', 'b', '+', 'c', '+', 'd', '+', 'e', '+', 'f'],
      '一組最多 5 張牌',
    ],
  ])('%j → %s', (steps, error) => {
    expect(run(steps)).toEqual({ ok: false, error });
  });

  it('合法的輸入順序都能通過', () => {
    expect(
      run(['(', 'a', '+', 'b', ')', '*', '(', 'c', '-', 'd', ')']).ok,
    ).toBe(true);
  });
});

describe('Joker', () => {
  const handJoker = (): NumberCard => ({ id: 'j', value: 0, isJoker: true });

  it('手牌的 Joker 沒有宣告就不能加進組裝列', () => {
    const draft = startDraft(game({ hand: [handJoker()] }));
    expect(addCard(draft, 'j')).toEqual({
      ok: false,
      error: '請先宣告 Joker 的數值與顏色',
    });
  });

  it('宣告後以宣告的數值與顏色加進組裝列，可以組成牌組', () => {
    const state = game({ hand: [card('a', 8), handJoker(), card('c', 8)] });
    let draft = ok(addCard(startDraft(state), 'a'));
    draft = ok(addSymbol(draft, '*'));
    draft = ok(addCard(draft, 'j', { value: 2, color: 'red' }));
    draft = ok(addSymbol(draft, '+'));
    draft = ok(addCard(draft, 'c'));
    draft = ok(commitComposer(draft));

    expect(checkEndTurn(state, draft).ok).toBe(true);
  });

  it('桌上拆下來的 Joker 變回未宣告，加進組裝列時要重新宣告', () => {
    const declared: NumberCard = {
      id: 'tj',
      value: 0,
      isJoker: true,
      jokerDeclaredValue: 2,
      jokerDeclaredColor: 'red',
    };
    const onTable: TabletopSet = {
      id: 't1',
      tiles: [
        { type: 'number', card: card('t8a', 8) },
        { type: 'operator', op: '*' },
        { type: 'number', card: declared },
        { type: 'operator', op: '+' },
        { type: 'number', card: card('t8b', 8) },
      ],
    };
    const draft = ok(
      breakSet(startDraft(game({ hand: [], table: [onTable] })), 't1'),
    );

    expect(draft.loose.find(c => c.id === 'tj')).toEqual({
      id: 'tj',
      value: 0,
      isJoker: true,
    });
    expect(addCard(draft, 'tj')).toEqual({
      ok: false,
      error: '請先宣告 Joker 的數值與顏色',
    });
    const added = ok(addCard(draft, 'tj', { value: 3, color: 'blue' }));
    expect(added.composer[0]).toEqual({
      type: 'number',
      card: { ...declared, jokerDeclaredValue: 3, jokerDeclaredColor: 'blue' },
    });
  });

  it('手牌的 Joker 退回手牌時清掉宣告，可以重新宣告', () => {
    const state = game({ hand: [handJoker()] });
    let draft = ok(
      addCard(startDraft(state), 'j', { value: 5, color: 'blue' }),
    );

    draft = backspace(draft);

    expect(draft.hand).toEqual([handJoker()]);
  });
});

/** 桌上的紅 8 × 紅 2 + 紅 8 */
function tableSet(): TabletopSet {
  return {
    id: 't1',
    tiles: [
      { type: 'number', card: card('t8a', 8) },
      { type: 'operator', op: '*' },
      { type: 'number', card: card('t2', 2) },
      { type: 'operator', op: '+' },
      { type: 'number', card: card('t8b', 8) },
    ],
  };
}

describe('拆開桌上的牌組', () => {
  it('拆開的數字牌進散牌區，運算符號丟棄；散牌區沒清空就不能結束回合', () => {
    const state = game({ hand: [card('h1', 1)], table: [tableSet()] });

    const draft = ok(breakSet(startDraft(state), 't1'));

    expect(draft.table).toEqual([]);
    expect(draft.loose.map(c => c.id)).toEqual(['t8a', 't2', 't8b']);
    expect(checkEndTurn(state, draft)).toEqual({
      ok: false,
      error: '散牌區還有 3 張牌，要放回牌組',
    });
  });

  it('用散牌和手牌重新組裝後就能結束回合', () => {
    const state = game({ hand: [card('h1', 1)], table: [tableSet()] });
    let draft = ok(breakSet(startDraft(state), 't1'));

    // (8 × 2 + 8) × 1
    draft = ok(addSymbol(draft, '('));
    draft = ok(addCard(draft, 't8a'));
    draft = ok(addSymbol(draft, '*'));
    draft = ok(addCard(draft, 't2'));
    draft = ok(addSymbol(draft, '+'));
    draft = ok(addCard(draft, 't8b'));
    draft = ok(addSymbol(draft, ')'));
    draft = ok(addSymbol(draft, '*'));
    draft = ok(addCard(draft, 'h1'));
    draft = ok(commitComposer(draft));

    expect(draft.loose).toEqual([]);
    const end = checkEndTurn(state, draft);
    expect(end.ok).toBe(true);
    if (!end.ok) return;
    expect(end.scoreGained).toBe(14); // × + × = 5 + 雙乘號 1 + 4 張 1 = 7，同色 ×2
  });

  it('本回合剛放上桌面的牌組再拆開時，原本是手牌的牌回到手牌', () => {
    const state = game({ hand: [card('a', 8), card('b', 2), card('c', 8)] });
    let draft = ok(addCard(startDraft(state), 'a'));
    draft = ok(addSymbol(draft, '*'));
    draft = ok(addCard(draft, 'b'));
    draft = ok(addSymbol(draft, '+'));
    draft = ok(addCard(draft, 'c'));
    draft = ok(commitComposer(draft));

    draft = ok(breakSet(draft, draft.table[0].id));

    expect(draft.hand.map(c => c.id).sort()).toEqual(['a', 'b', 'c']);
    expect(draft.loose).toEqual([]);
  });

  it('組裝列還有算式沒放上桌面時，不能結束回合', () => {
    const state = game({ hand: [card('a', 8), card('b', 2)] });
    const draft = ok(addCard(startDraft(state), 'a'));

    expect(checkEndTurn(state, draft)).toEqual({
      ok: false,
      error: '組裝列還有算式沒有放上桌面',
    });
  });
});

describe('previewComposer', () => {
  it('組裝列是空的時沒有預覽', () => {
    expect(previewComposer(startDraft(game({ hand: [] })))).toBeNull();
  });

  it('還不成立時回報原因，沒有預估分數', () => {
    const state = game({ hand: [card('a', 8), card('b', 2), card('c', 8)] });
    let draft = ok(addCard(startDraft(state), 'a'));
    draft = ok(addSymbol(draft, '+'));
    draft = ok(addCard(draft, 'b'));
    draft = ok(addSymbol(draft, '+'));
    draft = ok(addCard(draft, 'c'));

    expect(previewComposer(draft)).toEqual({
      validation: { valid: false, reason: '目前 = 18' },
      score: null,
    });
  });

  it('成立時附上預估分數', () => {
    const state = game({ hand: [card('a', 8), card('b', 2), card('c', 8)] });
    let draft = ok(addCard(startDraft(state), 'a'));
    draft = ok(addSymbol(draft, '*'));
    draft = ok(addCard(draft, 'b'));
    draft = ok(addSymbol(draft, '+'));
    draft = ok(addCard(draft, 'c'));

    expect(previewComposer(draft)).toEqual({
      validation: { valid: true },
      score: 6,
    });
  });
});
