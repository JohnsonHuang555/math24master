import { expect, test, type Locator } from '@playwright/test';
import { createTestUser, signInAs } from './helpers/auth';
import { openSinglePlayMode, playClassicToEnd } from './helpers/classic';

/** 圖片要真的載入成功（naturalWidth > 0），且經由 next/image 最佳化路徑 */
async function expectImageLoaded(img: Locator) {
  await expect(img).toBeVisible();
  await expect(img).toHaveAttribute('src', /\/_next\/image\?url=/);
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);
}

test.describe('Google 登入與排行榜', () => {
  const user = createTestUser();

  test.beforeEach(async ({ context }) => {
    await signInAs(context, user);
  });

  test('登入狀態可由 session API 讀到', async ({ page }) => {
    const res = await page.request.get('/api/auth/session');
    expect(res.ok()).toBe(true);
    expect(await res.json()).toMatchObject({
      user: { name: user.name, email: user.email, image: user.image },
    });
  });

  test('經典模式完賽後送出成績，排行榜顯示本人與 Google 頭像', async ({
    page,
  }) => {
    await openSinglePlayMode(page, '經典模式');

    const submitted = page.waitForResponse(
      res =>
        res.url().endsWith('/api/leaderboard') &&
        res.request().method() === 'POST',
      { timeout: 120_000 },
    );
    const score = await playClassicToEnd(page);
    expect(score).toBeGreaterThan(0);

    const res = await submitted;
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, updated: true });

    // 從首頁打開排行榜（預設分頁就是經典）
    await page.goto('/');
    await page.getByRole('button', { name: '排行榜' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('全球排行榜')).toBeVisible();

    // 登入狀態列：名字 + 頭像
    await expect(dialog.getByRole('button', { name: '登出' })).toBeVisible();
    await expectImageLoaded(dialog.getByRole('img', { name: user.name }).first());

    // 本人那一列：標示「我」、分數正確、頭像載入
    const myRow = dialog
      .locator('div.flex.items-center.gap-3')
      .filter({ hasText: '我' })
      .filter({ hasText: user.name });
    await expect(myRow).toHaveCount(1);
    await expect(myRow).toContainText(String(score));
    await expectImageLoaded(myRow.getByRole('img', { name: user.name }));
  });
});
