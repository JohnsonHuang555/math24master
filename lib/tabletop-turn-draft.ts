import { v4 as uuidv4 } from 'uuid';
import {
  SetValidation,
  scoreSet,
  submitTurn,
  validateSet,
} from '@/lib/tabletop-engine';
import { CardColor, NumberCard } from '@/models/Player';
import {
  TABLETOP_MAX_SET_SIZE,
  TabletopGameState,
  TabletopOperator,
  TabletopSet,
  TabletopTile,
} from '@/models/Tabletop';

/**
 * 玩家這回合的編輯草稿。拆開、組裝、退格都只改草稿，
 * 結束回合時才把 table 交給規則引擎的 submitTurn。
 */
export type TurnDraft = {
  table: TabletopSet[];
  loose: NumberCard[]; // 拆開桌上牌組後還沒用掉的牌（散牌區）
  hand: NumberCard[]; // 還沒用掉的手牌
  composer: TabletopTile[]; // 正在組裝的算式
  startHandIds: string[]; // 回合開始時的手牌，用來判斷牌退回時該回手牌還是散牌區
};

export type DraftResult =
  { ok: true; draft: TurnDraft } | { ok: false; error: string };

export function startDraft(state: TabletopGameState): TurnDraft {
  const hand = state.seats[state.currentSeat].hand;
  return {
    table: state.table,
    loose: [],
    hand,
    composer: [],
    startHandIds: hand.map(c => c.id),
  };
}

function cardsOf(set: TabletopSet): NumberCard[] {
  return set.tiles.flatMap(t => (t.type === 'number' ? [t.card] : []));
}

/**
 * 牌退出組裝列或牌組時，回合開始時在手上的回手牌，其他的進散牌區。
 * 手牌的 Joker 回到手上時清掉宣告，下次使用時重新宣告
 */
function returnCards(draft: TurnDraft, cards: NumberCard[]): TurnDraft {
  const fromHand = cards
    .filter(c => draft.startHandIds.includes(c.id))
    .map(c => {
      if (!c.isJoker) return c;
      const { jokerDeclaredValue, jokerDeclaredColor, ...undeclared } = c;
      return undeclared;
    });
  const fromTable = cards.filter(c => !draft.startHandIds.includes(c.id));
  return {
    ...draft,
    hand: [...draft.hand, ...fromHand],
    loose: [...draft.loose, ...fromTable],
  };
}

/** 拆開桌上的一組牌組（包括本回合剛放上去的）：數字牌退回，運算符號丟棄 */
export function breakSet(draft: TurnDraft, setId: string): DraftResult {
  const target = draft.table.find(s => s.id === setId);
  if (!target) return { ok: false, error: '找不到這組牌組' };
  const withoutSet = {
    ...draft,
    table: draft.table.filter(s => s.id !== setId),
  };
  return { ok: true, draft: returnCards(withoutSet, cardsOf(target)) };
}

/** 組裝列最後一格可以接什麼：數字或右括號後面接運算符號，其餘位置接數字或左括號 */
function endsWithOperand(draft: TurnDraft): boolean {
  const last = draft.composer.at(-1);
  return (
    last?.type === 'number' ||
    (last?.type === 'bracket' && last.bracket === ')')
  );
}

function openBrackets(draft: TurnDraft): number {
  return draft.composer.reduce(
    (depth, t) =>
      t.type !== 'bracket' ? depth : depth + (t.bracket === '(' ? 1 : -1),
    0,
  );
}

export type JokerDeclaration = { value: number; color: CardColor };

/**
 * 把手牌或散牌區的一張牌加到組裝列尾端。
 * 手牌的 Joker 必須帶 declaration；桌上拆下來的 Joker 已宣告過，不能再帶
 */
export function addCard(
  draft: TurnDraft,
  cardId: string,
  declaration?: JokerDeclaration,
): DraftResult {
  const found = [...draft.hand, ...draft.loose].find(c => c.id === cardId);
  if (!found) return { ok: false, error: '找不到這張牌' };
  let card = found;
  if (found.isJoker) {
    const fromHand = draft.startHandIds.includes(found.id);
    if (!fromHand && declaration) {
      return { ok: false, error: '桌上的 Joker 已經宣告過，不能更改' };
    }
    if (fromHand) {
      if (!declaration) {
        return { ok: false, error: '請先宣告 Joker 的數值與顏色' };
      }
      card = {
        ...found,
        jokerDeclaredValue: declaration.value,
        jokerDeclaredColor: declaration.color,
      };
    }
  }
  if (endsWithOperand(draft)) {
    return { ok: false, error: '數字牌之間要有運算符號' };
  }
  const numberCount = draft.composer.filter(t => t.type === 'number').length;
  if (numberCount >= TABLETOP_MAX_SET_SIZE) {
    return { ok: false, error: `一組最多 ${TABLETOP_MAX_SET_SIZE} 張牌` };
  }
  return {
    ok: true,
    draft: {
      ...draft,
      hand: draft.hand.filter(c => c.id !== cardId),
      loose: draft.loose.filter(c => c.id !== cardId),
      composer: [...draft.composer, { type: 'number', card }],
    },
  };
}

export type ComposerSymbol = TabletopOperator | '(' | ')';

export function addSymbol(
  draft: TurnDraft,
  symbol: ComposerSymbol,
): DraftResult {
  const afterOperand = endsWithOperand(draft);
  if (symbol === '(' && afterOperand) {
    return { ok: false, error: '左括號前面要有運算符號' };
  }
  if (symbol === ')') {
    if (openBrackets(draft) === 0) {
      return { ok: false, error: '右括號沒有對應的左括號' };
    }
    if (!afterOperand) return { ok: false, error: '右括號前面要先有數字' };
  }
  if (symbol !== '(' && symbol !== ')' && !afterOperand) {
    return { ok: false, error: '運算符號前面要先有數字' };
  }
  const tile: TabletopTile =
    symbol === '(' || symbol === ')'
      ? { type: 'bracket', bracket: symbol }
      : { type: 'operator', op: symbol };
  return { ok: true, draft: { ...draft, composer: [...draft.composer, tile] } };
}

/** 移除組裝列最後一格；數字牌退回原本的地方，運算符號與括號直接丟掉 */
export function backspace(draft: TurnDraft): TurnDraft {
  const last = draft.composer.at(-1);
  if (!last) return draft;
  const shortened = { ...draft, composer: draft.composer.slice(0, -1) };
  return last.type === 'number'
    ? returnCards(shortened, [last.card])
    : shortened;
}

/** 清空組裝列，所有數字牌退回原本的地方 */
export function clearComposer(draft: TurnDraft): TurnDraft {
  const cards = draft.composer.flatMap(t =>
    t.type === 'number' ? [t.card] : [],
  );
  return returnCards({ ...draft, composer: [] }, cards);
}

export type ComposerPreview = {
  validation: SetValidation;
  score: number | null; // 成立時的預估分數
};

/** 組裝列的即時提示：目前是否成立、不成立的原因、成立時的預估分數 */
export function previewComposer(draft: TurnDraft): ComposerPreview | null {
  if (draft.composer.length === 0) return null;
  const set: TabletopSet = { id: 'preview', tiles: draft.composer };
  const validation = validateSet(set);
  return { validation, score: validation.valid ? scoreSet(set) : null };
}

/** 組裝列成立時，變成桌上的一組新牌組 */
export function commitComposer(draft: TurnDraft): DraftResult {
  const set: TabletopSet = { id: uuidv4(), tiles: draft.composer };
  const validation = validateSet(set);
  if (!validation.valid) return { ok: false, error: validation.reason };
  return {
    ok: true,
    draft: { ...draft, table: [...draft.table, set], composer: [] },
  };
}

export type EndTurnCheck =
  | { ok: true; state: TabletopGameState; scoreGained: number }
  | { ok: false; error: string };

/** 檢查能否結束回合；可以的話回傳規則引擎套用後的新狀態 */
export function checkEndTurn(
  state: TabletopGameState,
  draft: TurnDraft,
): EndTurnCheck {
  if (draft.composer.length > 0) {
    return { ok: false, error: '組裝列還有算式沒有放上桌面' };
  }
  if (draft.loose.length > 0) {
    return {
      ok: false,
      error: `散牌區還有 ${draft.loose.length} 張牌，要放回牌組`,
    };
  }
  const result = submitTurn(state, draft.table);
  if (!result.success) return { ok: false, error: result.error };
  return { ok: true, state: result.state, scoreGained: result.scoreGained };
}
