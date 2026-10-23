import { evaluate } from 'mathjs';
import { createRummyDeck, draw } from '@/lib/deck';
import { NumberCard } from '@/models/Player';
import {
  TABLETOP_HAND_SIZE,
  TABLETOP_MAX_SET_SIZE,
  TABLETOP_MIN_SET_SIZE,
  TABLETOP_TURNS_PER_SEAT,
  TabletopDifficulty,
  TabletopGameState,
  TabletopSeat,
  TabletopSet,
} from '@/models/Tabletop';

const SEAT_NAMES = ['你', 'Bot A', 'Bot B'];
const GAME_ENDED = '這局已經結束';

/** 開新的一局：玩家與 2 個 Bot 各發 TABLETOP_HAND_SIZE 張，玩家先手 */
export function createTabletopGame(
  difficulty: TabletopDifficulty,
): TabletopGameState {
  let deck = createRummyDeck();
  const seats: TabletopSeat[] = SEAT_NAMES.map((name, i) => {
    const { drawn, remaining } = draw(deck, TABLETOP_HAND_SIZE);
    deck = remaining;
    return { id: `seat-${i}`, name, isBot: i > 0, hand: drawn, score: 0 };
  });
  return {
    difficulty,
    deck,
    table: [],
    seats,
    currentSeat: 0,
    turnsTaken: 0,
    status: 'playing',
  };
}

export type SetValidation = { valid: true } | { valid: false; reason: string };

function numberCards(set: TabletopSet): NumberCard[] {
  return set.tiles.flatMap(t => (t.type === 'number' ? [t.card] : []));
}

/** Joker 以宣告的數值計算 */
function effectiveValue(card: NumberCard) {
  return card.isJoker ? card.jokerDeclaredValue : card.value;
}

/** Joker 以宣告的顏色計算 */
function effectiveColor(card: NumberCard) {
  return card.isJoker ? card.jokerDeclaredColor : card.color;
}

function isDeclared(card: NumberCard) {
  return (
    !card.isJoker ||
    (card.jokerDeclaredValue !== undefined &&
      card.jokerDeclaredColor !== undefined)
  );
}

function toExpression(set: TabletopSet): string {
  return set.tiles
    .map(t => {
      if (t.type === 'number') return String(effectiveValue(t.card));
      if (t.type === 'operator') return t.op;
      return t.bracket;
    })
    .join(' ');
}

/** 檢查數字與運算符號交替出現、括號平衡；避免 mathjs 把相鄰數字當成隱式乘法 */
function isWellFormed(set: TabletopSet): boolean {
  let expectOperand = true;
  let depth = 0;
  for (const t of set.tiles) {
    if (t.type === 'number') {
      if (!expectOperand) return false;
      expectOperand = false;
    } else if (t.type === 'operator') {
      if (expectOperand) return false;
      expectOperand = true;
    } else if (t.bracket === '(') {
      if (!expectOperand) return false;
      depth++;
    } else {
      if (expectOperand || depth === 0) return false;
      depth--;
    }
  }
  return !expectOperand && depth === 0;
}

/**
 * 牌組的顏色型態（Joker 以宣告的顏色計算）：
 * same = 全部同色；rainbow = 3～4 張全部不同色；null = 不符合顏色限制（5 張只能同色）
 */
export function colorPattern(cards: NumberCard[]): 'same' | 'rainbow' | null {
  const colors = new Set(cards.map(effectiveColor));
  if (colors.size === 1) return 'same';
  if (cards.length <= 4 && colors.size === cards.length) return 'rainbow';
  return null;
}

const COLOR_RULE_REASON: Record<number, string> = {
  3: '3 張的牌組必須同色，或三種不同顏色',
  4: '4 張的牌組必須同色，或紅藍黃黑各一張',
  5: '5 張的牌組必須同色',
};

/** 驗證單一牌組是否成立；reason 直接用於 UI 即時提示 */
export function validateSet(set: TabletopSet): SetValidation {
  const cards = numberCards(set);
  if (
    cards.length < TABLETOP_MIN_SET_SIZE ||
    cards.length > TABLETOP_MAX_SET_SIZE
  ) {
    return {
      valid: false,
      reason: `需要 ${TABLETOP_MIN_SET_SIZE}～${TABLETOP_MAX_SET_SIZE} 張數字牌（目前 ${cards.length} 張）`,
    };
  }

  if (!cards.every(isDeclared)) {
    return { valid: false, reason: 'Joker 尚未宣告數值與顏色' };
  }

  if (!colorPattern(cards)) {
    return { valid: false, reason: COLOR_RULE_REASON[cards.length] };
  }

  if (!isWellFormed(set)) {
    return { valid: false, reason: '算式格式錯誤' };
  }

  const result: number = evaluate(toExpression(set));
  if (!Number.isFinite(result)) {
    return { valid: false, reason: '不能除以 0' };
  }
  if (Math.abs(result - 24) >= 1e-9) {
    return { valid: false, reason: `目前 = ${Number(result.toFixed(2))}` };
  }
  return { valid: true };
}

// 3 張 +0、4 張 +1、5 張 +2
const CARD_COUNT_BONUS: Record<number, number> = { 3: 0, 4: 1, 5: 2 };

// 同色比全異色難湊（隨機 3 張：同色約 6%、全異色約 38%），倍率較高；none 只會出現在不成立的牌組
const COLOR_MULTIPLIER = { same: 2, rainbow: 1.5, none: 1 };

/** 單組分數 = (符號分 + 張數分) × 顏色倍率（見 specs/game-tabletop.spec.md「計分」） */
export function scoreSet(set: TabletopSet): number {
  const ops = set.tiles.flatMap(t => (t.type === 'operator' ? [t.op] : []));
  const plusMinus = ops.filter(o => o === '+' || o === '-').length;
  const times = ops.filter(o => o === '*').length;
  const divide = ops.filter(o => o === '/').length;
  let symbolScore = plusMinus + times * 2 + divide * 3;
  if (times >= 2) symbolScore += 1;
  if (divide >= 2) symbolScore += 1;

  const cards = numberCards(set);
  const multiplier = COLOR_MULTIPLIER[colorPattern(cards) ?? 'none'];

  // 全異色 ×1.5 可能產生 .5，四捨五入成整數
  return Math.round(
    (symbolScore + (CARD_COUNT_BONUS[cards.length] ?? 0)) * multiplier,
  );
}

export type SubmitTurnResult =
  | { success: true; state: TabletopGameState; scoreGained: number }
  | { success: false; error: string };

/**
 * 提交本回合結束時的完整桌面。拆開、工作區、還原桌面等編輯過程不經過引擎，
 * 引擎只比對新舊桌面，判斷最終結果是否合法。
 */
export function submitTurn(
  state: TabletopGameState,
  proposedTable: TabletopSet[],
): SubmitTurnResult {
  if (state.status === 'ended') {
    return { success: false, error: GAME_ENDED };
  }

  for (const [i, s] of proposedTable.entries()) {
    const validation = validateSet(s);
    if (!validation.valid) {
      return { success: false, error: `第 ${i + 1} 組：${validation.reason}` };
    }
  }

  const seat = state.seats[state.currentSeat];
  const handIds = new Set(seat.hand.map(c => c.id));
  const tableIds = new Set(state.table.flatMap(numberCards).map(c => c.id));
  const proposedIds = proposedTable.flatMap(numberCards).map(c => c.id);
  const proposedIdSet = new Set(proposedIds);

  // 牌守恆：新桌面 = 舊桌面的牌 + 本回合從手牌打出的牌
  if (proposedIdSet.size !== proposedIds.length) {
    return { success: false, error: '同一張牌不能使用兩次' };
  }
  if (proposedIds.some(id => !handIds.has(id) && !tableIds.has(id))) {
    return { success: false, error: '使用了不屬於你的牌' };
  }
  if ([...tableIds].some(id => !proposedIdSet.has(id))) {
    return { success: false, error: '桌面上的牌不能拿回手牌' };
  }

  const tableJokers = new Map(
    state.table
      .flatMap(numberCards)
      .filter(c => c.isJoker)
      .map(c => [c.id, c]),
  );
  const jokerRedeclared = proposedTable.flatMap(numberCards).some(c => {
    const before = tableJokers.get(c.id);
    return (
      before !== undefined &&
      (before.jokerDeclaredValue !== c.jokerDeclaredValue ||
        before.jokerDeclaredColor !== c.jokerDeclaredColor)
    );
  });
  if (jokerRedeclared) {
    return { success: false, error: '桌上 Joker 的宣告不能更改' };
  }

  const playedIds = new Set(proposedIds.filter(id => handIds.has(id)));
  if (playedIds.size === 0) {
    return { success: false, error: '本回合至少要從手牌打出 1 張牌' };
  }

  // 每回合只完成一組：本回合打出的手牌必須全部在同一組；其他牌組可以重排
  const completedSets = proposedTable.filter(s =>
    numberCards(s).some(c => playedIds.has(c.id)),
  );
  if (completedSets.length > 1) {
    return {
      success: false,
      error: `每回合只能完成一組牌組（你的手牌分散在 ${completedSets.length} 組）`,
    };
  }
  const scoreGained = scoreSet(completedSets[0]);

  // 出牌後補到 TABLETOP_HAND_SIZE 張，牌庫不夠就補到用完
  const remainingHand = seat.hand.filter(c => !playedIds.has(c.id));
  const refillCount = Math.max(TABLETOP_HAND_SIZE - remainingHand.length, 0);
  const { drawn, remaining } = draw(state.deck, refillCount);
  const seats = state.seats.map((s, i) =>
    i === state.currentSeat
      ? {
          ...s,
          hand: [...remainingHand, ...drawn],
          score: s.score + scoreGained,
        }
      : s,
  );

  return {
    success: true,
    scoreGained,
    state: advanceTurn({
      ...state,
      deck: remaining,
      table: proposedTable,
      seats,
    }),
  };
}

export type DrawCardResult =
  | { success: true; state: TabletopGameState }
  | { success: false; error: string };

/** 不出牌，從牌庫抽 1 張（牌庫已空就等同跳過），換下一位 */
export function drawCard(state: TabletopGameState): DrawCardResult {
  if (state.status === 'ended') {
    return { success: false, error: GAME_ENDED };
  }

  const { drawn, remaining } = draw(state.deck, 1);
  const seats = state.seats.map((s, i) =>
    i === state.currentSeat ? { ...s, hand: [...s.hand, ...drawn] } : s,
  );
  return {
    success: true,
    state: advanceTurn({ ...state, deck: remaining, seats }),
  };
}

/** 換下一位；所有人都打滿 TABLETOP_TURNS_PER_SEAT 回合就結算 */
function advanceTurn(state: TabletopGameState): TabletopGameState {
  const next = {
    ...state,
    currentSeat: (state.currentSeat + 1) % state.seats.length,
    turnsTaken: state.turnsTaken + 1,
  };
  return next.turnsTaken >= TABLETOP_TURNS_PER_SEAT * state.seats.length
    ? endGame(next)
    : next;
}

/** 結算：依牌組得分總和排名，同分並列同一名次，下一名跳過並列的人數（1, 1, 3） */
function endGame(state: TabletopGameState): TabletopGameState {
  const standings = state.seats
    .map(s => ({ seatId: s.id, score: s.score }))
    .sort((a, b) => b.score - a.score)
    .map((s, _, sorted) => ({
      ...s,
      rank: 1 + sorted.filter(o => o.score > s.score).length,
    }));

  return { ...state, status: 'ended', result: { standings } };
}
