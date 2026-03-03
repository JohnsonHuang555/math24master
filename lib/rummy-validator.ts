import { evaluate } from 'mathjs';

import { CardColor } from '@/models/Player';
import { EquationGroup, OperatorType } from '@/models/Room';

const OPERATOR_SYMBOLS: Record<OperatorType, string> = {
  '+': '+',
  '-': '-',
  '*': '*',
  '/': '/',
};

/** 驗證單組方程式（括號平衡 + 顏色法則 + mathjs 數學） */
export function validateEquationGroup(group: EquationGroup): {
  valid: boolean;
  error?: string;
} {
  const { tiles } = group;
  if (!tiles || tiles.length === 0) {
    return { valid: false, error: '方程式不能為空' };
  }

  // 1. 提取數字牌
  const numberTiles = tiles.filter(t => t.type === 'number') as Extract<
    (typeof tiles)[number],
    { type: 'number' }
  >[];

  const n = numberTiles.length;

  // 數字牌數量 3 ≤ N ≤ 5
  if (n < 3 || n > 5) {
    return { valid: false, error: `方程式數字牌數量須為 3 到 5 張（目前 ${n} 張）` };
  }

  // 2. 顏色法則（Joker 使用 jokerDeclaredColor）
  const colors: CardColor[] = numberTiles.map(t => {
    const c = t.card;
    return (c.isJoker ? c.jokerDeclaredColor : c.color) as CardColor;
  });

  if (colors.some(c => !c)) {
    return { valid: false, error: '牌缺少顏色資訊（含 Joker 需先宣告顏色）' };
  }

  const uniqueColors = new Set(colors);

  if (n === 3 || n === 4) {
    const allSame = uniqueColors.size === 1;
    const allDiff = n === 4 && uniqueColors.size === 4;
    if (!allSame && !allDiff) {
      return {
        valid: false,
        error:
          n === 3
            ? '3 張牌顏色必須全同色'
            : '4 張牌顏色必須全同色或四色各異',
      };
    }
  } else if (n === 5) {
    if (uniqueColors.size !== 1) {
      return { valid: false, error: '5 張牌顏色必須全同色' };
    }
  }

  // 3. 括號平衡驗證
  let depth = 0;
  for (const tile of tiles) {
    if (tile.type === 'bracket') {
      if (tile.bracket === '(') {
        depth++;
      } else {
        depth--;
        if (depth < 0) {
          return { valid: false, error: '括號不平衡（多餘的右括號）' };
        }
      }
    }
  }
  if (depth !== 0) {
    return { valid: false, error: '括號不平衡（左括號未關閉）' };
  }

  // 4. 建構表達式字串並用 mathjs 計算
  const tokens = tiles.map(tile => {
    if (tile.type === 'number') {
      const c = tile.card;
      const val =
        c.isJoker && c.jokerDeclaredValue !== undefined
          ? c.jokerDeclaredValue
          : c.value;
      return String(val);
    }
    if (tile.type === 'operator') {
      return OPERATOR_SYMBOLS[tile.op];
    }
    // bracket
    return tile.bracket;
  });

  const expr = tokens.join(' ');

  try {
    const result = evaluate(expr);
    if (typeof result !== 'number' || !isFinite(result)) {
      return { valid: false, error: '表達式計算結果無效' };
    }
    if (Math.abs(result - 24) >= 1e-9) {
      return {
        valid: false,
        error: `表達式結果為 ${result}，需等於 24`,
      };
    }
  } catch {
    return { valid: false, error: '表達式格式錯誤，請檢查括號與運算子' };
  }

  return { valid: true };
}

/** 驗證整個桌面（全部組合法才算通過） */
export function validateBoard(groups: EquationGroup[]): {
  valid: boolean;
  errors: string[];
} {
  if (groups.length === 0) {
    return { valid: false, errors: ['桌面不能為空'] };
  }

  const errors: string[] = [];
  for (const group of groups) {
    const result = validateEquationGroup(group);
    if (!result.valid && result.error) {
      errors.push(`[${group.id}] ${result.error}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
