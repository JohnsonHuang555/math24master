import { evaluate } from 'mathjs';
import { createRummyDeck, draw } from '@/lib/deck';
import { NumberCard } from '@/models/Player';
import {
  RUMMY_HAND_SIZE,
  RUMMY_LEFTOVER_CARD_PENALTY,
  RUMMY_LEFTOVER_JOKER_PENALTY,
  RUMMY_MAX_SET_SIZE,
  RUMMY_MIN_SET_SIZE,
  RUMMY_WENT_OUT_BONUS,
  RummyDifficulty,
  RummyGameState,
  RummySeat,
  RummySet,
} from '@/models/Rummy';

const SEAT_NAMES = ['你', 'Bot A', 'Bot B'];
const GAME_ENDED = '這局已經結束';

/** 開新的一局：玩家與 2 個 Bot 各發 RUMMY_HAND_SIZE 張，玩家先手 */
export function createRummyGame(difficulty: RummyDifficulty): RummyGameState {
  let deck = createRummyDeck();
  const seats: RummySeat[] = SEAT_NAMES.map((name, i) => {
    const { drawn, remaining } = draw(deck, RUMMY_HAND_SIZE);
    deck = remaining;
    return { id: `seat-${i}`, name, isBot: i > 0, hand: drawn, score: 0 };
  });
  return {
    difficulty,
    deck,
    table: [],
    seats,
    currentSeat: 0,
    status: 'playing',
  };
}

export type SetValidation = { valid: true } | { valid: false; reason: string };

function numberCards(set: RummySet): NumberCard[] {
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

function toExpression(set: RummySet): string {
  return set.tiles
    .map(t => {
      if (t.type === 'number') return String(effectiveValue(t.card));
      if (t.type === 'operator') return t.op;
      return t.bracket;
    })
    .join(' ');
}

/** 檢查數字與運算符號交替出現、括號平衡；避免 mathjs 把相鄰數字當成隱式乘法 */
function isWellFormed(set: RummySet): boolean {
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

/** 驗證單一牌組是否成立；reason 直接用於 UI 即時提示 */
export function validateSet(set: RummySet): SetValidation {
  const cards = numberCards(set);
  if (cards.length < RUMMY_MIN_SET_SIZE || cards.length > RUMMY_MAX_SET_SIZE) {
    return {
      valid: false,
      reason: `需要 ${RUMMY_MIN_SET_SIZE}～${RUMMY_MAX_SET_SIZE} 張數字牌（目前 ${cards.length} 張）`,
    };
  }

  if (!cards.every(isDeclared)) {
    return { valid: false, reason: 'Joker 尚未宣告數值與顏色' };
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

/** 單組分數 = (符號分 + 張數分) × 顏色倍率（見 specs/game-rummy.spec.md「計分」） */
export function scoreSet(set: RummySet): number {
  const ops = set.tiles.flatMap(t => (t.type === 'operator' ? [t.op] : []));
  const plusMinus = ops.filter(o => o === '+' || o === '-').length;
  const times = ops.filter(o => o === '*').length;
  const divide = ops.filter(o => o === '/').length;
  let symbolScore = plusMinus + times * 2 + divide * 3;
  if (times >= 2) symbolScore += 1;
  if (divide >= 2) symbolScore += 1;

  const cards = numberCards(set);
  const colors = new Set(cards.map(effectiveColor));
  let multiplier = 1;
  if (colors.size === 1) multiplier = 2;
  else if (colors.size === cards.length) multiplier = 1.5;

  // 全異色 ×1.5 可能產生 .5，四捨五入成整數
  return Math.round(
    (symbolScore + (CARD_COUNT_BONUS[cards.length] ?? 0)) * multiplier,
  );
}

export type SubmitTurnResult =
  | { success: true; state: RummyGameState; scoreGained: number }
  | { success: false; error: string };

/**
 * 提交本回合結束時的完整桌面。拆開、工作區、還原桌面等編輯過程不經過引擎，
 * 引擎只比對新舊桌面，判斷最終結果是否合法。
 */
export function submitTurn(
  state: RummyGameState,
  proposedTable: RummySet[],
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

  const scoreGained = proposedTable
    .filter(s => numberCards(s).some(c => playedIds.has(c.id)))
    .reduce((sum, s) => sum + scoreSet(s), 0);

  const seats = state.seats.map((s, i) =>
    i === state.currentSeat
      ? {
          ...s,
          hand: s.hand.filter(c => !playedIds.has(c.id)),
          score: s.score + scoreGained,
        }
      : s,
  );

  const next: RummyGameState = { ...state, table: proposedTable, seats };

  if (seats[state.currentSeat].hand.length === 0) {
    return { success: true, scoreGained, state: endGame(next) };
  }
  return { success: true, scoreGained, state: advanceTurn(next) };
}

export type DrawCardResult =
  { success: true; state: RummyGameState } | { success: false; error: string };

/** 不出牌，從牌庫抽 1 張，換下一位 */
export function drawCard(state: RummyGameState): DrawCardResult {
  if (state.status === 'ended') {
    return { success: false, error: GAME_ENDED };
  }

  const { drawn, remaining } = draw(state.deck, 1);
  const seats = state.seats.map((s, i) =>
    i === state.currentSeat ? { ...s, hand: [...s.hand, ...drawn] } : s,
  );
  const next = { ...state, deck: remaining, seats };

  // 抽走最後一張：本次行動不算進最後一圈，接下來所有人各再行動一次
  if (remaining.length === 0 && state.finalRoundTurnsLeft === undefined) {
    return {
      success: true,
      state: {
        ...next,
        currentSeat: (state.currentSeat + 1) % state.seats.length,
        finalRoundTurnsLeft: state.seats.length,
      },
    };
  }
  return { success: true, state: advanceTurn(next) };
}

/** 換下一位；最後一圈中每次行動扣 1，扣完就結算 */
function advanceTurn(state: RummyGameState): RummyGameState {
  const next = {
    ...state,
    currentSeat: (state.currentSeat + 1) % state.seats.length,
  };
  if (state.finalRoundTurnsLeft === undefined) return next;

  const finalRoundTurnsLeft = state.finalRoundTurnsLeft - 1;
  return finalRoundTurnsLeft === 0
    ? endGame({ ...next, finalRoundTurnsLeft })
    : { ...next, finalRoundTurnsLeft };
}

/** 結算：先出完手牌的人加分，其他人依剩下的牌扣分，依最終分數排名 */
function endGame(state: RummyGameState): RummyGameState {
  const standings = state.seats
    .map(s => {
      const wentOutBonus = s.hand.length === 0 ? RUMMY_WENT_OUT_BONUS : 0;
      const leftoverPenalty = s.hand.reduce(
        (sum, c) =>
          sum +
          (c.isJoker
            ? RUMMY_LEFTOVER_JOKER_PENALTY
            : RUMMY_LEFTOVER_CARD_PENALTY),
        0,
      );
      return {
        seatId: s.id,
        tableScore: s.score,
        wentOutBonus,
        leftoverPenalty,
        finalScore: s.score + wentOutBonus - leftoverPenalty,
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore)
    // 同分並列同一名次，下一名跳過並列的人數（1, 1, 3）
    .map((s, _, sorted) => ({
      ...s,
      rank: 1 + sorted.filter(o => o.finalScore > s.finalScore).length,
    }));

  return { ...state, status: 'ended', result: { standings } };
}
