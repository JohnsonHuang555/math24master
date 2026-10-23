import { expect, test } from '@playwright/test';
import { openSinglePlayMode, playClassicToEnd } from './helpers/classic';
import { enterFormula, readCardValues } from './helpers/play';
import { partitionInto24Groups, solve24 } from './helpers/solver';

test.describe('單人模式', () => {
  test('經典模式：打完整局並進入結算畫面', async ({ page }) => {
    await openSinglePlayMode(page, '經典模式');

    const score = await playClassicToEnd(page);

    expect(score).toBeGreaterThan(0);
    await expect(page.getByRole('button', { name: '再來一局' })).toBeVisible();
  });

  test('挑戰模式：連續答對兩關', async ({ page }) => {
    await openSinglePlayMode(page, '挑戰模式');
    const handCards = page.getByTestId('hand-card');

    for (const stage of [1, 2]) {
      await expect(page.getByText(`第 ${stage} 關`)).toBeVisible();
      const values = await readCardValues(handCards);
      const tokens = solve24(values);
      expect(tokens, `第 ${stage} 關的牌 ${values} 應該有解`).not.toBeNull();

      await enterFormula(page, tokens!, () =>
        page.locator('[data-testid="hand-card"][data-selected="false"]'),
      );
      await page.getByRole('button', { name: '確認', exact: true }).click();
    }

    await expect(page.getByText('第 3 關')).toBeVisible();
  });

  test('消消樂模式：清空 16 張牌', async ({ page }) => {
    await openSinglePlayMode(page, '消消樂模式');
    const matchCards = page.getByTestId('match-card');
    await expect(matchCards).toHaveCount(16);

    const groups = partitionInto24Groups(await readCardValues(matchCards));
    expect(groups, '牌面應該能拆成數組各自湊出 24').not.toBeNull();

    let remaining = 16;
    for (const group of groups!) {
      await enterFormula(page, solve24(group)!, () =>
        page.locator('[data-testid="match-card"][data-selected="false"]'),
      );
      await page.getByRole('button', { name: '確認消除' }).click();
      remaining -= group.length;
      if (remaining > 0) await expect(matchCards).toHaveCount(remaining);
    }

    await expect(page.getByRole('heading', { name: '全清！' })).toBeVisible();
  });

  test('快答模式（初階）：答完 10 題', async ({ page }) => {
    await page.goto('/quick-math');
    await page.getByRole('button', { name: /初階模式/ }).click();
    await page.getByRole('button', { name: '開始挑戰' }).click();

    const question = page.getByText(/= \?$/);
    for (let i = 0; i < 10; i++) {
      await expect(page.getByText(`第 ${i + 1} / 10 題`)).toBeVisible();
      const display = (await question.textContent())!.replace(/= \?$/, '');
      const answer = Math.round(
        Function(
          `return (${display.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')})`,
        )() as number,
      );

      for (const digit of String(answer)) {
        await page.getByRole('button', { name: digit, exact: true }).click();
      }
      await page.getByRole('button', { name: '送出答案' }).click();
    }

    await expect(page.getByText('10 題完成時間')).toBeVisible();
  });
});
