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

  // 數字牌數量 3 ≤ N ≤ 4
  if (n < 3 || n > 4) {
    return { valid: false, error: `方程式數字牌數量須為 3 到 4 張（目前 ${n} 張）` };
  }

  // 2. 顏色法則（Joker 豁免，只檢查非 Joker 牌）
  const nonJokerTiles = numberTiles.filter(t => !t.card.isJoker);
  if (nonJokerTiles.length >= 2) {
    const colors = nonJokerTiles.map(t => t.card.color as CardColor);
    if (colors.some(c => !c)) {
      return { valid: false, error: '牌缺少顏色資訊' };
    }
    const uniqueColors = new Set(colors);
    const m = nonJokerTiles.length;
    if (uniqueColors.size !== 1 && uniqueColors.size !== m) {
      return { valid: false, error: '所有牌顏色必須各不相同（不可重複）' };
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

  // 4. 找出所有 Joker 牌
  const jokerCards = numberTiles.filter(t => t.card.isJoker).map(t => t.card);

  // 5. 建構表達式的輔助函數
  function buildExpr(): string {
    return tiles
      .map(tile => {
        if (tile.type === 'number') {
          const c = tile.card;
          const val = c.isJoker ? (c.jokerDeclaredValue ?? 0) : c.value;
          return String(val);
        }
        if (tile.type === 'operator') return OPERATOR_SYMBOLS[tile.op];
        return tile.bracket;
      })
      .join(' ');
  }

  function evalTo24(): boolean {
    try {
      const result = evaluate(buildExpr());
      return typeof result === 'number' && isFinite(result) && Math.abs(result - 24) < 1e-9;
    } catch {
      return false;
    }
  }

  // 6. 自動計算 Joker 值（brute force 1–13）
  if (jokerCards.length === 0) {
    // 無 Joker，直接計算
    try {
      const result = evaluate(buildExpr());
      if (typeof result !== 'number' || !isFinite(result)) {
        return { valid: false, error: '表達式計算結果無效' };
      }
      if (Math.abs(result - 24) >= 1e-9) {
        return { valid: false, error: `表達式結果為 ${result}，需等於 24` };
      }
    } catch {
      return { valid: false, error: '表達式格式錯誤，請檢查括號與運算子' };
    }
  } else {
    let found = false;
    outer: for (let v1 = 1; v1 <= 13; v1++) {
      jokerCards[0].jokerDeclaredValue = v1;
      if (jokerCards.length === 1) {
        if (evalTo24()) {
          found = true;
          break;
        }
      } else {
        for (let v2 = 1; v2 <= 13; v2++) {
          jokerCards[1].jokerDeclaredValue = v2;
          if (evalTo24()) {
            found = true;
            break outer;
          }
        }
      }
    }
    if (!found) {
      return { valid: false, error: 'Joker 無法補齊至 24，請調整方程式' };
    }
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
