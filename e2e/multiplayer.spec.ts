import { type Browser, type Page, expect, test } from '@playwright/test';
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
  // 作答按鈕的文字已改為「確認」（GameUI.puzzle.submit）
  await page.getByRole('button', { name: '確認', exact: true }).click();
}

test('多人搶答：兩位玩家建房、加入、開局並各答對一題', async ({ browser }) => {
  const alice = await openPlayer(browser, 'Alice');
  const bob = await openPlayer(browser, 'Bob');

  // Alice 建立房間
  await alice.goto('/multiple-play');
  // 等暱稱載入再開房，否則會先跳出設定暱稱的視窗
  await expect(
    alice.getByRole('button', { name: '修改暱稱：Alice' }),
  ).toBeVisible();
  await alice.getByRole('button', { name: /開私人房間/ }).click();
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

test('遊戲中重新整理：回到同一場遊戲、仍是同一位玩家，不會多出幽靈玩家', async ({
  browser,
}) => {
  const alice = await openPlayer(browser, 'Alice');
  const bob = await openPlayer(browser, 'Bob');

  await alice.goto('/multiple-play');
  // 等暱稱載入再開房，否則會先跳出設定暱稱的視窗
  await expect(
    alice.getByRole('button', { name: '修改暱稱：Alice' }),
  ).toBeVisible();
  await alice.getByRole('button', { name: /開私人房間/ }).click();
  await alice.getByPlaceholder('請輸入房間名稱').fill('E2E 重整房');
  await alice.getByRole('button', { name: '確定' }).click();
  await alice.waitForURL(/\/multiple-play\/[^/]+$/);

  await bob.goto(alice.url());
  await expect(bob.getByText('Alice')).toBeVisible();
  await bob.getByRole('button', { name: '準備遊戲' }).click();
  const startButton = alice.getByRole('button', { name: '開始遊戲' });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  for (const page of [alice, bob]) {
    await expect(scoreOf(page, 'Bob')).toHaveAttribute('data-score', '0');
  }

  // Bob 重新整理：伺服器把它當成暫時斷線，頁面載入後用 token 回到原本的位置
  bob.on('dialog', dialog => dialog.accept());
  await bob.reload();
  await expect(scoreOf(bob, 'Bob')).toHaveAttribute('data-score', '0');
  await expect(scoreOf(bob, 'Alice')).toHaveAttribute('data-score', '0');
  // 雙方都仍然只有兩位玩家
  for (const page of [alice, bob]) {
    await expect(page.getByTestId('buzzer-player')).toHaveCount(2);
  }

  // 重整後仍可作答得分
  await buzzAndAnswer(bob);
  for (const page of [alice, bob]) {
    await expect(scoreOf(page, 'Bob')).not.toHaveAttribute('data-score', '0');
  }
});

/** Alice 開一間私人房，回傳房間網址 */
async function createRoom(alice: Page, roomName: string) {
  await alice.goto('/multiple-play');
  await expect(
    alice.getByRole('button', { name: '修改暱稱：Alice' }),
  ).toBeVisible();
  await alice.getByRole('button', { name: /開私人房間/ }).click();
  await alice.getByPlaceholder('請輸入房間名稱').fill(roomName);
  await alice.getByRole('button', { name: '確定' }).click();
  await alice.waitForURL(/\/multiple-play\/[^/]+$/);
  return alice.url();
}

const playerCount = (page: Page, count: number) =>
  page.getByRole('heading', { name: `玩家（${count}）` });

test('SPA 返回大廳：立即離開房間，不留幽靈玩家', async ({ browser }) => {
  const alice = await openPlayer(browser, 'Alice');
  const bob = await openPlayer(browser, 'Bob');
  const roomUrl = await createRoom(alice, 'E2E 返回房');

  // Bob 先開大廳，再用前端路由進房，之後按上一頁就是 SPA 導頁（不是整頁卸載）
  await bob.goto('/multiple-play');
  await expect(
    bob.getByRole('button', { name: '修改暱稱：Bob' }),
  ).toBeVisible();
  await bob.evaluate(path => {
    (
      window as unknown as { next: { router: { push: (p: string) => void } } }
    ).next.router.push(path);
  }, new URL(roomUrl).pathname);
  await expect(playerCount(alice, 2)).toBeVisible();
  await expect(playerCount(bob, 2)).toBeVisible();

  await bob.goBack();
  await bob.waitForURL(/\/multiple-play$/);
  await expect(playerCount(alice, 1)).toBeVisible();
});

test('兩個分頁用同一個連線憑證：新分頁接手，舊分頁回大廳，房內不會多出玩家', async ({
  browser,
}) => {
  const alice = await openPlayer(browser, 'Alice');
  const bob = await openPlayer(browser, 'Bob');
  const roomUrl = await createRoom(alice, 'E2E 雙分頁房');
  await bob.goto(roomUrl);
  await expect(playerCount(alice, 2)).toBeVisible();
  await expect
    .poll(() => bob.evaluate(() => sessionStorage.getItem('reconnectToken')))
    .toBeTruthy();

  // 模擬「複製分頁」：新分頁帶著同一份 sessionStorage
  const storage = await bob.evaluate(() => ({
    token: sessionStorage.getItem('reconnectToken')!,
    roomId: sessionStorage.getItem('reconnectRoomId')!,
  }));
  const bobTab2 = await bob.context().newPage();
  await bobTab2.addInitScript(({ token, roomId }) => {
    if (!sessionStorage.getItem('reconnectToken')) {
      sessionStorage.setItem('reconnectToken', token);
      sessionStorage.setItem('reconnectRoomId', roomId);
    }
  }, storage);
  await bobTab2.goto(roomUrl);

  await expect(playerCount(bobTab2, 2)).toBeVisible();
  await expect(bob.getByText('你已在另一個分頁開啟這個房間')).toBeVisible();
  await bob.waitForURL(/\/multiple-play$/);
  // 舊分頁回到大廳不會把玩家帶走；房內仍是 Alice 與 Bob 兩人
  await alice.waitForTimeout(500);
  await expect(playerCount(alice, 2)).toBeVisible();
  await expect(playerCount(bobTab2, 2)).toBeVisible();
});
