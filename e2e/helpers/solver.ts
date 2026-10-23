import { evaluate } from 'mathjs';
import { canMake24, findAllSolutions } from '../../lib/daily-seed';

export type FormulaToken =
  | { kind: 'number'; value: number }
  | { kind: 'symbol'; value: '+' | '-' | '*' | '/' | '(' | ')' };

const SYMBOL_OF: Record<string, '+' | '-' | '*' | '/' | '(' | ')'> = {
  '+': '+',
  '-': '-',
  '×': '*',
  '÷': '/',
  '(': '(',
  ')': ')',
};

function tokenize(formula: string): FormulaToken[] {
  return (formula.match(/\d+|[+\-×÷()]/g) ?? []).map(part =>
    /^\d+$/.test(part)
      ? { kind: 'number', value: Number(part) }
      : { kind: 'symbol', value: SYMBOL_OF[part] },
  );
}

function evaluateTokens(tokens: FormulaToken[]): number {
  return evaluate(tokens.map(t => t.value).join(''));
}

/**
 * 找出一組用上全部數字、算出 24 的算式。
 * 遊戲端用 mathjs 浮點運算，經典模式還用 `=== 24` 嚴格比對，
 * 所以優先挑浮點結果剛好等於 24 的解法（例如避開 8 ÷ (3 − 8 ÷ 3)）。
 */
export function solve24(
  nums: number[],
  { exactOnly = false }: { exactOnly?: boolean } = {},
): FormulaToken[] | null {
  const candidates = findAllSolutions(nums).map(s => tokenize(s.formula));
  const exact = candidates.find(tokens => evaluateTokens(tokens) === 24);
  if (exactOnly) return exact ?? null;
  return exact ?? candidates[0] ?? null;
}

/** 把消消樂的牌面拆成數組，每組 2–4 張且能湊出 24，全部用完 */
export function partitionInto24Groups(nums: number[]): number[][] | null {
  if (nums.length === 0) return [];
  const [first, ...rest] = nums;

  for (let size = 1; size <= 3; size++) {
    for (const picked of combinations(rest.length, size)) {
      const group = [first, ...picked.map(i => rest[i])];
      if (!canMake24(group)) continue;
      const remaining = rest.filter((_, i) => !picked.includes(i));
      const tail = partitionInto24Groups(remaining);
      if (tail) return [group, ...tail];
    }
  }
  return null;
}

function combinations(n: number, k: number): number[][] {
  const result: number[][] = [];
  const walk = (start: number, acc: number[]) => {
    if (acc.length === k) {
      result.push(acc);
      return;
    }
    for (let i = start; i < n; i++) walk(i + 1, [...acc, i]);
  };
  walk(0, []);
  return result;
}
