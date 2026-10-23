import { type Locator, expect, test } from '@playwright/test';
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

test.describe('排行榜頁（未登入）', () => {
  test('首頁排行榜按鈕連到排行榜頁，未登入時提示登入', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: '排行榜' }).first().click();
    await expect(page).toHaveURL(/\/leaderboard/);
    await expect(
      page.getByRole('heading', { name: '全球排行榜' }),
    ).toBeVisible();

    const myRank = page.getByTestId('my-rank');
    await expect(myRank).toContainText('登入後即可上榜');
    await expect(
      myRank.getByRole('button', { name: 'Google 登入' }),
    ).toBeVisible();
  });

  test('切換模式與難度會同步到網址', async ({ page }) => {
    await page.goto('/leaderboard');
    await expect(page.getByRole('tab', { name: '經典' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    // 單一難度的模式不顯示難度切換
    await expect(page.getByRole('tab', { name: '進階' })).toHaveCount(0);

    await page.getByRole('tab', { name: '快答' }).click();
    await expect(page).toHaveURL(/mode=quickmath/);
    await page.getByRole('tab', { name: '進階' }).click();
    await expect(page).toHaveURL(/mode=quickmath&level=advanced/);
    await expect(page.getByRole('tab', { name: '進階' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});

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

  test('經典模式完賽後送出成績，排行榜頁顯示本人名次與 Google 頭像', async ({
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

    // 結算畫面：送分完成後按鈕帶出名次，點開精簡 modal 顯示新紀錄與完整排行榜連結
    const rankButton = page.getByRole('button', {
      name: /第 \d+ 名 · 查看排行榜/,
    });
    await expect(rankButton).toBeVisible();
    await rankButton.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByTestId('my-rank')).toContainText('新紀錄');
    await expect(dialog.getByTestId('my-rank')).toContainText(`${score} 分`);
    await expect(
      dialog.getByRole('link', { name: '查看完整排行榜' }),
    ).toHaveAttribute('href', '/leaderboard?mode=classic');

    // 排行榜頁預設就是經典
    await page.goto('/leaderboard');

    // 右上角身分：名字 + 頭像 + 登出
    const header = page.locator('header');
    await expect(header.getByRole('button', { name: '登出' })).toBeVisible();
    await expectImageLoaded(header.getByRole('img', { name: user.name }));

    // 我的名次：有名次、分數正確
    const myRank = page.getByTestId('my-rank');
    await expect(myRank).toContainText(/第 \d+ 名/);
    await expect(myRank).toContainText(`${score} 分`);

    // 榜上（頒獎台或列表）本人那一格：標示「我」、分數正確、頭像載入
    const mySlot = page
      .locator('[data-testid="podium-slot"], [data-testid="ranking-row"]')
      .filter({ hasText: user.name })
      .filter({ hasText: '我' });
    await expect(mySlot).toHaveCount(1);
    await expect(mySlot).toContainText(`${score} 分`);
    await expectImageLoaded(mySlot.getByRole('img', { name: user.name }));
  });
});
