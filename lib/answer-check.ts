import { calculateAnswer } from '@/lib/utils';
import { SelectedCard } from '@/models/SelectedCard';
import { Symbol } from '@/models/Symbol';

/**
 * 判定失敗的原因；只輸出代碼，文字由 UI 依語系翻譯。
 * - EMPTY：還沒組任何算式
 * - NOT_ALL_CARDS：4 張牌沒有全部用上
 * - MALFORMED：數字與符號沒有交替、括號不平衡（例如 2、4 連點會被 mathjs 讀成 24）
 * - NOT_24：算式成立但結果不是 24
 */
export type AnswerError = 'EMPTY' | 'NOT_ALL_CARDS' | 'MALFORMED' | 'NOT_24';

export type AnswerCheck =
  { ok: true } | { ok: false; error: AnswerError; value?: number };

const OPERATORS = new Set<Symbol>([
  Symbol.Plus,
  Symbol.Minus,
  Symbol.Times,
  Symbol.Divide,
]);

/** 與每日挑戰、canMake24 相同的浮點容差 */
const EPSILON = 1e-6;

/**
 * 數字與運算符號必須交替、括號平衡，避免 mathjs 把相鄰的數字串成多位數，
 * 或把 `(1+2)(3+5)` 當成隱式乘法（與牌桌模式 isWellFormed 相同的規則）
 */
export function isWellFormedExpression(tokens: SelectedCard[]): boolean {
  let expectOperand = true;
  let depth = 0;
  for (const token of tokens) {
    if (token.number) {
      if (!expectOperand) return false;
      expectOperand = false;
    } else if (token.symbol && OPERATORS.has(token.symbol)) {
      if (expectOperand) return false;
      expectOperand = true;
    } else if (token.symbol === Symbol.LeftBracket) {
      if (!expectOperand) return false;
      depth++;
    } else if (token.symbol === Symbol.RightBracket) {
      if (expectOperand || depth === 0) return false;
      depth--;
    } else {
      return false;
    }
  }
  return !expectOperand && depth === 0;
}

/**
 * 判定一題 24 點的作答：每張牌恰好用一次、算式成立、結果等於 24。
 * cardIds 是這題所有牌的 id；計算沿用全站共用的 calculateAnswer（mathjs）
 */
export function checkAnswer(
  cardIds: readonly string[],
  tokens: SelectedCard[],
): AnswerCheck {
  if (tokens.length === 0) return { ok: false, error: 'EMPTY' };

  const usedIds = tokens.flatMap(t => (t.number ? [t.number.id] : []));
  const allowed = new Set(cardIds);
  const usedAll =
    usedIds.length === cardIds.length &&
    new Set(usedIds).size === usedIds.length &&
    usedIds.every(id => allowed.has(id));
  if (!usedAll) return { ok: false, error: 'NOT_ALL_CARDS' };

  if (!isWellFormedExpression(tokens)) return { ok: false, error: 'MALFORMED' };

  let value: unknown;
  try {
    value = calculateAnswer(tokens);
  } catch {
    return { ok: false, error: 'MALFORMED' };
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { ok: false, error: 'MALFORMED' };
  }
  if (Math.abs(value - 24) >= EPSILON) {
    return { ok: false, error: 'NOT_24', value: Math.round(value * 100) / 100 };
  }
  return { ok: true };
}
