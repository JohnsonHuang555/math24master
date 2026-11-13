import { type Page, devices, expect, test } from '@playwright/test';
import { enterFormula, readCardValues } from './helpers/play';
import { solve24 } from './helpers/solver';

type TrackedEvent = [string, Record<string, unknown> | undefined];

/**
 * 版面固定載入 GA4，inline 的 gtag() 只把參數推進 window.dataLayer。
 * 測試擋掉送往 Google 的請求（避免污染正式報表），再從 dataLayer 讀出事件，
 * 驗證每個事件只在實際行為發生時送出一次
 */
async function stubAnalytics(page: Page) {
  await page.route(/googletagmanager\.com|google-analytics\.com/, route =>
    route.abort(),
  );
}

async function trackedEvents(page: Page): Promise<TrackedEvent[]> {
  return page.evaluate(() =>
    (
      (window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ??
      []
    )
      .map(entry => Array.from(entry))
      .filter(
        ([command, name]) =>
          command === 'event' &&
          typeof name === 'string' &&
          [
            'quick_play_start',
            'first_puzzle_solved',
            'onboarding_complete',
            'onboarding_exit',
          ].includes(name),
      )
      .map(([, name, params]) => [name, params] as TrackedEvent),
  );
}

const eventNames = async (page: Page) =>
  (await trackedEvents(page)).map(([name]) => name);

const handCards = (page: Page) => page.getByTestId('hand-card');

/** 解出目前這一題並按確認 */
async function solveCurrent(page: Page) {
  const values = await readCardValues(handCards(page));
  const tokens = solve24(values);
  expect(tokens, `題目 ${values} 應該有解`).not.toBeNull();
  await enterFormula(page, tokens!, () =>
    page.locator('[data-testid="hand-card"][data-selected="false"]'),
  );
  await page.getByRole('button', { name: '確認', exact: true }).click();
}

async function playThreePuzzles(page: Page) {
  for (const step of [1, 2, 3]) {
    if (step < 3) {
      await expect(page.getByText(`第 ${step} / 3 題`).first()).toBeAttached();
    }
    await expect(handCards(page)).toHaveCount(4);
    await solveCurrent(page);
  }
}

test.describe('快速試玩：新手三題引導', () => {
  test.beforeEach(async ({ page }) => {
    await stubAnalytics(page);
  });

  test('首頁立即開始 → 三題 → 完成畫面，不需登入', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: '立即開始' }).click();
    await expect(page).toHaveURL(/\/quick-play\?from=home$/);

    // 第一次玩：顯示可關閉的操作提示
    const tips = page.getByTestId('quick-play-tips');
    await expect(tips).toBeVisible();
    await tips.getByRole('button', { name: '知道了' }).click();
    await expect(tips).toBeHidden();

    await playThreePuzzles(page);

    await expect(
      page.getByRole('heading', { name: '新手挑戰完成' }),
    ).toBeVisible();
    await expect(page.getByTestId('result-value')).toHaveText(/^\d{2}:\d{2}$/);
    await expect(page.getByText('3/3')).toBeVisible();
    await expect(page.getByRole('button', { name: '再玩一次' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: '探索其他模式' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: '挑戰今日題目' }),
    ).toHaveAttribute('href', '/daily-challenge');

    const events = await trackedEvents(page);
    expect(events.map(([name]) => name)).toEqual([
      'quick_play_start',
      'first_puzzle_solved',
      'onboarding_complete',
    ]);
    expect(events[0][1]).toEqual({ source: 'home_hero', is_first_time: true });
    expect(events[1][1]).toMatchObject({ step: 1, hint_level: 0 });
    expect(events[2][1]).toMatchObject({ hints_used: 0, is_first_time: true });

    // 再玩一次：不再顯示提示、改為一般題，first_puzzle_solved 不會再送
    await page.getByRole('button', { name: '再玩一次' }).click();
    await expect(page.getByTestId('quick-play-tips')).toBeHidden();
    await playThreePuzzles(page);
    await expect(
      page.getByRole('heading', { name: '3 題全部完成' }),
    ).toBeVisible();
    const replay = await trackedEvents(page);
    expect(replay.map(([name]) => name)).toEqual([
      'quick_play_start',
      'first_puzzle_solved',
      'onboarding_complete',
      'quick_play_start',
      'onboarding_complete',
    ]);
    expect(replay[3][1]).toEqual({ source: 'replay', is_first_time: false });
  });

  test('答錯會顯示原因且停在同一題', async ({ page }) => {
    await page.goto('/quick-play');
    await expect(handCards(page)).toHaveCount(4);
    const alert = page.getByTestId('quick-play-error');

    // 沒組算式就按確認
    await page.getByRole('button', { name: '確認', exact: true }).click();
    await expect(alert).toContainText('先點數字牌和符號組成算式');

    // 只用兩張牌
    await handCards(page).nth(0).click();
    await page.getByTestId('symbol-+').click();
    await handCards(page).nth(1).click();
    await page.getByRole('button', { name: '確認', exact: true }).click();
    await expect(alert).toContainText('4 張牌都要用到');

    // 數字相鄰（不會被當成多位數）
    await page.getByRole('button', { name: '清除所選取的牌' }).click();
    for (let i = 0; i < 4; i++) await handCards(page).nth(i).click();
    await page.getByRole('button', { name: '確認', exact: true }).click();
    await expect(alert).toContainText('數字之間要放運算符號');

    await expect(page.getByText('第 1 / 3 題').first()).toBeAttached();
    expect(await eventNames(page)).toEqual(['quick_play_start']);
  });

  test('提示分兩段：先給符號，再按才顯示答案', async ({ page }) => {
    await page.goto('/quick-play');
    const hintButton = page.getByTestId('quick-play-hint-button');
    const hint = page.getByTestId('quick-play-hint');

    await expect(hint).toBeHidden();
    await hintButton.click();
    await expect(hint).toContainText('會用到');
    await expect(hint).not.toContainText('= 24');

    await hintButton.click();
    await expect(hint).toContainText('= 24');
    await expect(hintButton).toBeHidden();
  });

  test('中途離開送出 onboarding_exit 一次並回到首頁', async ({ page }) => {
    await page.goto('/quick-play');
    await expect(handCards(page)).toHaveCount(4);
    await solveCurrent(page);

    await page.getByRole('button', { name: '離開' }).first().click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: '離開' })
      .click();
    await expect(page).toHaveURL(/\/$/);

    const events = await trackedEvents(page).catch(() => []);
    const exits = events.filter(([name]) => name === 'onboarding_exit');
    expect(exits).toHaveLength(1);
    expect(exits[0][1]).toMatchObject({
      step: 2,
      reason: 'back_button',
      is_first_time: true,
    });
  });

  test('首頁「選擇模式」仍可進入單人模式選單', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '選擇模式' }).click();
    await expect(page).toHaveURL(/\/single-play$/);
  });
});

test.describe('快速試玩：手機', () => {
  // 只取尺寸與觸控設定；defaultBrowserType 會強制開新 worker，不能放在 describe 裡
  const { viewport, deviceScaleFactor, isMobile, hasTouch, userAgent } =
    devices['Pixel 7'];
  test.use({ viewport, deviceScaleFactor, isMobile, hasTouch, userAgent });

  test('觸控可以完成三題', async ({ page }) => {
    await stubAnalytics(page);
    await page.goto('/');
    await page.getByRole('link', { name: '立即開始' }).tap();
    await page.getByRole('button', { name: '關閉操作提示' }).tap();
    await playThreePuzzles(page);
    await expect(
      page.getByRole('heading', { name: '新手挑戰完成' }),
    ).toBeVisible();
  });
});
