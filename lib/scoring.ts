import { SelectedCard } from '@/models/SelectedCard';
import { Symbol } from '@/models/Symbol';

/** 根據已選符號計算本回合得分 */
export function calcRoundScore(symbols: SelectedCard[]): number {
  const plusMinusCount = symbols.filter(
    s => s.symbol === Symbol.Plus || s.symbol === Symbol.Minus,
  ).length;
  const timesCount = symbols.filter(s => s.symbol === Symbol.Times).length;
  const divideCount = symbols.filter(s => s.symbol === Symbol.Divide).length;
  let score = plusMinusCount + timesCount * 2 + divideCount * 3;
  if (timesCount >= 2) score += 1;
  if (divideCount >= 2) score += 1;
  return score;
}
