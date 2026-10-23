import type { Locator, Page } from '@playwright/test';
import type { FormulaToken } from './solver';

/** 讀出某一組牌目前顯示的數字 */
export async function readCardValues(cards: Locator): Promise<number[]> {
  return (await cards.allTextContents()).map(text => Number(text.trim()));
}

/**
 * 依算式依序點選牌與符號。
 * availableCards 要能篩出「還沒被選過」的牌，重複的數字才會點到不同張。
 */
export async function enterFormula(
  page: Page,
  tokens: FormulaToken[],
  availableCards: () => Locator,
) {
  for (const token of tokens) {
    if (token.kind === 'number') {
      await availableCards()
        .filter({ hasText: new RegExp(`^\\s*${token.value}\\s*$`) })
        .first()
        .click();
    } else {
      await page.getByTestId(`symbol-${token.value}`).click();
    }
  }
}
