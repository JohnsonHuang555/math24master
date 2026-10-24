import { expect, test, type Browser, type Page } from '@playwright/test';
import { enterFormula, readCardValues } from './helpers/play';
import { solve24 } from './helpers/solver';

/** 開一個獨立的瀏覽器 context 當作一位玩家，預先寫好暱稱略過暱稱彈窗 */
async function openPlayer(browser: Browser, name: string): Promise<Page> {
  const context = await browser.newContext();
  await context.addInitScript(playerName => {
    window.localStorage.setItem('playerName', playerName);
  }, name);
  return context.newPage();
}

function scoreOf(page: Page, playerName: string) {
  return page.locator(
    `[data-testid="buzzer-player"][data-player-name="${playerName}"]`,
  );
}

/** 搶答並送出正確算式 */
async function buzzAndAnswer(page: Page) {
  await page.getByRole('button', { name: '搶答！' }).click();

  const cards = page.getByTestId('buzzer-card');
  await expect(cards.first()).toBeVisible();
  const values = await readCardValues(cards);
  const tokens = solve24(values);
  expect(tokens, `搶答的牌 ${values} 應該有解`).not.toBeNull();

  await enterFormula(page, tokens!, () =>
    page.locator('[data-testid="buzzer-card"]:not([disabled])'),
  );
  await page.getByRole('button', { name: '提交', exact: true }).click();
}

test('多人搶答：兩位玩家建房、加入、開局並各答對一題', async ({ browser }) => {
  const alice = await openPlayer(browser, 'Alice');
  const bob = await openPlayer(browser, 'Bob');

  // Alice 建立房間
  await alice.goto('/multiple-play');
  await alice.getByRole('button', { name: '建立房間', exact: true }).click();
  await alice.getByPlaceholder('請輸入房間名稱').fill('E2E 測試房');
  await alice.getByRole('button', { name: '確定' }).click();
  await alice.waitForURL(/\/multiple-play\/[^/]+$/);

  // Bob 從同一個網址加入並準備
  await bob.goto(alice.url());
  await expect(bob.getByText('Alice')).toBeVisible();
  await bob.getByRole('button', { name: '準備遊戲' }).click();

  // Alice 開始遊戲
  const startButton = alice.getByRole('button', { name: '開始遊戲' });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  // 倒數的系統訊息由 server 送代碼，client 翻成文字
  await expect(bob.getByText('遊戲將在 5 秒開始')).toBeVisible();

  // 雙方都進入搶答畫面
  for (const page of [alice, bob]) {
    await expect(scoreOf(page, 'Alice')).toHaveAttribute('data-score', '0');
    await expect(scoreOf(page, 'Bob')).toHaveAttribute('data-score', '0');
  }

  // 第一回合 Alice 答對，雙方畫面同步加分
  await buzzAndAnswer(alice);
  for (const page of [alice, bob]) {
    await expect(scoreOf(page, 'Alice')).not.toHaveAttribute('data-score', '0');
  }

  // 第二回合 Bob 答對
  await buzzAndAnswer(bob);
  for (const page of [alice, bob]) {
    await expect(scoreOf(page, 'Bob')).not.toHaveAttribute('data-score', '0');
  }
});
