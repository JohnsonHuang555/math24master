import { expect, type Page } from '@playwright/test';
import { enterFormula, readCardValues } from './play';
import { solve24 } from './solver';

/** 從單人模式選單進入某個模式（選單按鈕有 500ms 延遲才切換） */
export async function openSinglePlayMode(page: Page, label: string) {
  await page.goto('/single-play');
  await page.getByRole('button', { name: new RegExp(label) }).click();
}

/** 經典模式：每手能解就出牌，不能解就跳過，一路打到結算畫面，回傳最終得分 */
export async function playClassicToEnd(page: Page): Promise<number> {
  const handCards = page.getByTestId('hand-card');
  const gameOver = page.getByRole('heading', { name: '遊戲結束' });

  for (let hand = 0; hand < 20; hand++) {
    await expect(handCards.first().or(gameOver)).toBeVisible();
    if (await gameOver.isVisible()) break;

    const values = await readCardValues(handCards);
    // 經典模式以 `=== 24` 嚴格比對，只能用浮點結果剛好是 24 的解法
    const tokens = solve24(values, { exactOnly: true });
    if (tokens) {
      await enterFormula(page, tokens, () =>
        page.locator('[data-testid="hand-card"][data-selected="false"]'),
      );
      await page.getByRole('button', { name: '出牌', exact: true }).click();
    } else {
      await page
        .getByRole('button', { name: /^(跳過換牌|結算)$/ })
        .click();
    }

    // 等這一手結算完：換成新的一手（算式列回到提示文字）或進入結算畫面
    await expect(
      page.getByText('點選數字和符號組成算式...').or(gameOver),
    ).toBeVisible({ timeout: 20_000 });
    await expect
      .poll(
        async () =>
          (await gameOver.isVisible()) ||
          (await readCardValues(handCards)).join(',') !== values.join(','),
        { timeout: 10_000 },
      )
      .toBe(true)
      .catch(() => {
        // 新的一手剛好跟上一手同樣的數字，不影響後續流程
      });
  }

  await expect(gameOver).toBeVisible();
  const score = await page
    .getByText('最終得分')
    .locator('xpath=preceding-sibling::p[1]')
    .textContent();
  return Number(score);
}
