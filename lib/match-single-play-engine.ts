import { v4 as uuidv4 } from 'uuid';
import { canMake24 } from '@/lib/daily-seed';
import { generateMatchBoard } from '@/lib/match-board-generator';
import { calcRoundScore } from '@/lib/scoring';
import { calculateAnswer } from '@/lib/utils';
import {
  MATCH_MAX_GROUP,
  MATCH_MIN_GROUP,
  MatchBoardState,
} from '@/models/MatchBoard';
import { NumberCard } from '@/models/Player';
import { SelectedCard } from '@/models/SelectedCard';
import { Symbol } from '@/models/Symbol';

type EngineResult =
  | { success: true; board: MatchBoardState }
  | { success: false; error: string };

type SubmitResult =
  | {
      success: true;
      board: MatchBoardState;
      cleared: boolean;
      isCorrect: boolean;
      scoreGained: number;
    }
  | { success: false; error: string };

/** 建立消消樂模式初始牌局（反向構造，保證存在全清解法） */
export function createInitialBoard(rng?: () => number): MatchBoardState {
  return {
    boardId: uuidv4(),
    cells: generateMatchBoard(rng),
    selectedCards: [],
    score: 0,
    status: 'playing',
  };
}

/**
 * 選牌規則與 `lib/classic-single-play-engine.ts` 的 `selectCard` 同源（數字牌不能連續選、
 * 右括號後自動補乘號、左括號後不能加減號、連續運算子擋掉、同張牌 toggle 取消），
 * 額外加上「已選數字牌 < 4」的上限檢查。兩處未抽成共用函式，因為 classic 引擎沒有自動化
 * 測試覆蓋，任何無行為變化的重構都只能靠人工跑一輪經典模式全流程才能保證沒改壞——
 * 未來若要收斂成共用函式，可參考這兩處。
 */
export function selectCard(
  board: MatchBoardState,
  number: NumberCard | undefined,
  symbol: Symbol | undefined,
): EngineResult {
  try {
    const selectedCards = [...board.selectedCards];

    if (selectedCards.length === 0 && symbol && symbol !== Symbol.LeftBracket) {
      return { success: false, error: '第一個只能用左括號或數字' };
    }

    if (number) {
      const selectedNumberCount = selectedCards.filter(c => c.number).length;
      const isExistIndex = selectedCards.findIndex(
        s => s.number?.id === number.id,
      );

      if (isExistIndex === -1 && selectedNumberCount >= MATCH_MAX_GROUP) {
        return { success: false, error: `最多選擇 ${MATCH_MAX_GROUP} 張牌` };
      }

      const currentSelect = selectedCards[selectedCards.length - 1];

      // 如果前一個是數字則不能選
      if (currentSelect?.number && currentSelect?.number.id !== number.id) {
        return { success: false, error: '數字牌不能連續使用' };
      }

      if (currentSelect?.symbol === Symbol.RightBracket) {
        selectedCards.push({ symbol: Symbol.Times });
      }

      if (isExistIndex !== -1) {
        selectedCards.splice(isExistIndex, 1);
      } else {
        selectedCards.push({ number });
      }
    }
    if (symbol) {
      const lastCard = selectedCards[selectedCards.length - 1];
      if (lastCard?.symbol === Symbol.Minus && symbol === Symbol.Minus) {
        return { success: false, error: '減號不能連續用' };
      }

      if (lastCard?.symbol === Symbol.Plus && symbol === Symbol.Plus) {
        return { success: false, error: '加號不能連續用' };
      }

      if (lastCard?.symbol === Symbol.Times && symbol === Symbol.Times) {
        return { success: false, error: '乘號不能連續用' };
      }

      if (lastCard?.symbol === Symbol.Divide && symbol === Symbol.Divide) {
        return { success: false, error: '除號不能連續用' };
      }

      if (
        lastCard?.symbol === Symbol.LeftBracket &&
        [Symbol.Plus, Symbol.Minus].includes(symbol)
      ) {
        return { success: false, error: '左括號後面無法使用減號或加號' };
      }

      if (symbol === Symbol.LeftBracket && lastCard?.number) {
        selectedCards.push({ symbol: Symbol.Times });
      }
      selectedCards.push({ symbol });
    }

    return { success: true, board: { ...board, selectedCards } };
  } catch (e) {
    return { success: false, error: '發生錯誤，請稍後再試 (select card)' };
  }
}

export function reselectCard(board: MatchBoardState): EngineResult {
  return { success: true, board: { ...board, selectedCards: [] } };
}

export function backCard(board: MatchBoardState): EngineResult {
  return {
    success: true,
    board: { ...board, selectedCards: board.selectedCards.slice(0, -1) },
  };
}

/** 遞迴檢查某個數字組（長度 size）是否存在能湊出 24 的子集合 */
function hasSolvableCombo(values: number[], size: number): boolean {
  const seen = new Set<string>();

  function combo(start: number, picked: number[]): boolean {
    if (picked.length === size) {
      const key = [...picked].sort((a, b) => a - b).join(',');
      if (seen.has(key)) return false;
      seen.add(key);
      return canMake24(picked);
    }
    for (let i = start; i < values.length; i++) {
      if (combo(i + 1, [...picked, values[i]])) return true;
    }
    return false;
  }

  return combo(0, []);
}

/** 剩餘牌組任選 2~4 張是否都湊不出 24（卡關） */
function isBoardStuck(values: number[]): boolean {
  if (values.length <= 1) return true;
  for (
    let size = MATCH_MIN_GROUP;
    size <= Math.min(MATCH_MAX_GROUP, values.length);
    size++
  ) {
    if (hasSolvableCombo(values, size)) return false;
  }
  return true;
}

/** 提交目前選取，嘗試消除；答錯不視為 engine error，回傳 isCorrect:false 讓 UI 處理 */
export function submitSelection(board: MatchBoardState): SubmitResult {
  const numberCards = board.selectedCards
    .filter(c => c.number)
    .map(c => c.number!);

  if (numberCards.length < MATCH_MIN_GROUP) {
    return { success: false, error: `至少選擇 ${MATCH_MIN_GROUP} 張牌` };
  }
  if (numberCards.length > MATCH_MAX_GROUP) {
    return { success: false, error: `最多選擇 ${MATCH_MAX_GROUP} 張牌` };
  }

  let answer: unknown;
  try {
    answer = calculateAnswer(board.selectedCards);
  } catch {
    return { success: false, error: '算式有誤' };
  }

  const isCorrect = typeof answer === 'number' && Math.abs(answer - 24) < 1e-9;
  if (!isCorrect) {
    return {
      success: true,
      board,
      cleared: false,
      isCorrect: false,
      scoreGained: 0,
    };
  }

  const scoreGained = calcRoundScore(board.selectedCards);
  const usedIds = new Set(numberCards.map(c => c.id));
  const newCells = board.cells.map(cell =>
    cell.card && usedIds.has(cell.card.id) ? { ...cell, card: null } : cell,
  );
  const remainingValues = newCells.filter(c => c.card).map(c => c.card!.value);
  const isCleared = remainingValues.length === 0;
  const isStuck = !isCleared && isBoardStuck(remainingValues);

  return {
    success: true,
    cleared: isCleared,
    isCorrect: true,
    scoreGained,
    board: {
      ...board,
      cells: newCells,
      selectedCards: [],
      score: board.score + scoreGained,
      status: isCleared ? 'cleared' : isStuck ? 'stuck' : 'playing',
    },
  };
}
