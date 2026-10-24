import { expect, test } from '@playwright/test';

test.describe('多國語系（英文瀏覽器）', () => {
  test.use({ locale: 'en-US' });

  test('第一次造訪依瀏覽器語言進入英文版，首頁與排行榜為英文', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Can you make 24',
    );

    await page.getByRole('link', { name: 'Leaderboard' }).first().click();
    await expect(page).toHaveURL(/\/en\/leaderboard/);
    await expect(
      page.getByRole('heading', { name: 'Global Leaderboard' }),
    ).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Classic' })).toBeVisible();
  });

  test('手動切回繁體中文後，之後造訪都維持中文', async ({ page }) => {
    await page.goto('/en');
    await page.getByRole('combobox', { name: 'Language' }).click();
    await page.getByRole('option', { name: '繁體中文' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      '你能用 4 張牌',
    );

    await page.goto('/');
    await expect(page).not.toHaveURL(/\/en/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant-TW');
  });

  test('還沒翻譯的頁面不給搜尋引擎收錄', async ({ request }) => {
    const translated = await request.get('/en/leaderboard');
    expect(translated.headers()['x-robots-tag']).toBeUndefined();

    const untranslated = await request.get('/en/single-play');
    expect(untranslated.headers()['x-robots-tag']).toBe('noindex');
  });
});
