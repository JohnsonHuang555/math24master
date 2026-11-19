import { type Page, devices, expect, test } from '@playwright/test';
import { openSinglePlayMode, playClassicToEnd } from './helpers/classic';
import { enterFormula, readCardValues } from './helpers/play';
import { partitionInto24Groups, solve24 } from './helpers/solver';

type TrackedEvent = [string, Record<string, unknown> | undefined];

/** 擋掉送往 Google 的請求，事件從 dataLayer 讀；並關掉結算後的登入提示 */
async function prepare(page: Page) {
  await page.route(/googletagmanager\.com|google-analytics\.com/, route =>
    route.abort(),
  );
  await page.addInitScript(() => {
    localStorage.setItem(
      'login-prompt-preference',
      JSON.stringify({ state: { skipLoginPrompt: true }, version: 0 }),
    );
  });
}

async function shareEvents(page: Page): Promise<TrackedEvent[]> {
  return page.evaluate(() =>
    (
      (window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ??
      []
    )
      .map(entry => Array.from(entry))
      .filter(
        ([command, name]) =>
          command === 'event' &&
          (name === 'share_card_open' || name === 'share_click'),
      )
      .map(([, name, params]) => [name, params] as TrackedEvent),
  );
}

/** 預覽圖是 1080×1350 的 PNG */
async function expectPreviewImage(page: Page) {
  const preview = page.getByTestId('share-card-preview');
  await expect(preview).toBeVisible();
  await expect
    .poll(() =>
      preview.evaluate(img => {
        const el = img as HTMLImageElement;
        return el.complete ? `${el.naturalWidth}x${el.naturalHeight}` : '';
      }),
    )
    .toBe('1080x1350');
}

/** 台灣日期（每日挑戰日），寫入一筆今天已完成的紀錄，直接進入完成畫面 */
async function seedDailyDone(page: Page, score: number, streak: number) {
  await page.addInitScript(
    ([s, k]) => {
      const date = new Date(Date.now() + 8 * 3600_000)
        .toISOString()
        .slice(0, 10);
      localStorage.setItem(
        'math24_daily_records',
        JSON.stringify({
          __migrated: true,
          [date]: { done: true, score: s, streak: k, maxStreak: k, date },
        }),
      );
    },
    [score, streak],
  );
}

test.describe('分享成績圖卡', () => {
  test.beforeEach(async ({ page }) => {
    await prepare(page);
  });

  test('每日挑戰：產生圖卡 → 預覽 → 下載、複製連結', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await seedDailyDone(page, 17, 6);
    await page.goto('/daily-challenge');

    await page.getByTestId('share-result-button').click();
    const dialog = page.getByTestId('share-card-dialog');
    await expect(
      dialog.getByRole('heading', { name: '分享成績' }),
    ).toBeVisible();
    await expectPreviewImage(page);

    // 桌機 Chrome 不能把檔案交給系統分享：主按鈕是下載
    const download = page.waitForEvent('download');
    await dialog.getByRole('button', { name: '下載圖片' }).click();
    expect((await download).suggestedFilename()).toMatch(
      /^math24-daily-\d{4}-\d{2}-\d{2}\.png$/,
    );
    await expect(dialog.getByRole('status')).toHaveText(/圖片已下載/);

    await dialog.getByRole('button', { name: '複製連結' }).click();
    await expect(dialog.getByRole('status')).toHaveText('連結已複製');
    const link = new URL(
      await page.evaluate(() => navigator.clipboard.readText()),
    );
    expect(link.pathname).toBe('/daily-challenge');
    expect(link.searchParams.get('utm_source')).toBe('share');
    expect(link.searchParams.get('utm_campaign')).toBe('daily');

    await dialog.getByRole('button', { name: '複製文字' }).click();
    await expect(
      page.evaluate(() => navigator.clipboard.readText()),
    ).resolves.toContain('本日 17 分 · 連續 6 天');

    expect(await shareEvents(page)).toEqual([
      ['share_card_open', { mode: 'daily' }],
      [
        'share_click',
        { mode: 'daily', outcome: 'downloaded', method: 'download' },
      ],
      [
        'share_click',
        { mode: 'daily', outcome: 'copied', method: 'copy_link' },
      ],
      [
        'share_click',
        { mode: 'daily', outcome: 'copied', method: 'copy_text' },
      ],
    ]);

    // 關掉再開：同一份成績不重畫，直接打開
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await page.getByTestId('share-result-button').click();
    await expectPreviewImage(page);
  });

  test('經典模式：打完一局後分享成績', async ({ page }) => {
    await openSinglePlayMode(page, '經典模式');
    await playClassicToEnd(page);

    await page.getByTestId('share-result-button').click();
    await expectPreviewImage(page);
    await expect(
      page.getByTestId('share-card-dialog').getByRole('button', {
        name: '複製圖片',
      }),
    ).toBeVisible();
    expect((await shareEvents(page))[0]).toEqual([
      'share_card_open',
      { mode: 'classic' },
    ]);
  });

  test('消消樂：全清後分享成績', async ({ page }) => {
    await openSinglePlayMode(page, '消消樂模式');
    const matchCards = page.getByTestId('match-card');
    await expect(matchCards).toHaveCount(16);
    const groups = partitionInto24Groups(await readCardValues(matchCards));
    expect(groups).not.toBeNull();
    for (const group of groups!) {
      await enterFormula(page, solve24(group)!, () =>
        page.locator('[data-testid="match-card"][data-selected="false"]'),
      );
      await page.getByRole('button', { name: '確認消除' }).click();
    }
    await expect(page.getByRole('heading', { name: '全清！' })).toBeVisible();

    await page.getByTestId('share-result-button').click();
    await expectPreviewImage(page);
    expect((await shareEvents(page))[0]).toEqual([
      'share_card_open',
      { mode: 'match' },
    ]);
  });
});

test.describe('分享成績圖卡：手機', () => {
  const { viewport, deviceScaleFactor, isMobile, hasTouch, userAgent } =
    devices['Pixel 7'];
  test.use({ viewport, deviceScaleFactor, isMobile, hasTouch, userAgent });

  test('手機版是底部抽屜，預覽與操作都在畫面內', async ({ page }) => {
    await prepare(page);
    await seedDailyDone(page, 9, 1);
    await page.goto('/daily-challenge');
    await page.getByTestId('share-result-button').tap();

    const dialog = page.getByTestId('share-card-dialog');
    await expectPreviewImage(page);
    const height = page.viewportSize()!.height;
    // 抽屜滑入結束後貼齊底部
    await expect
      .poll(async () => {
        const box = await dialog.boundingBox();
        return box ? Math.round(box.y + box.height) : 0;
      })
      .toBe(height);
    // 預覽不會被主按鈕蓋住
    const preview = await page.getByTestId('share-card-preview').boundingBox();
    const primary = await dialog
      .getByRole('button', { name: '下載圖片' })
      .boundingBox();
    expect(preview!.y + preview!.height).toBeLessThanOrEqual(primary!.y);
    for (const name of ['複製文字', '複製連結']) {
      await expect(dialog.getByRole('button', { name })).toBeInViewport();
    }
  });
});
