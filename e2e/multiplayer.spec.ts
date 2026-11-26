import {
  type Browser,
  type Locator,
  type Page,
  expect,
  test,
} from '@playwright/test';
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

test('瀏覽器實際收到的 WebSocket 封包不含牌庫、密碼、對方 token 或別人的手牌', async ({
  browser,
}) => {
  const alice = await openPlayer(browser, 'Alice');
  const bob = await openPlayer(browser, 'Bob');
  // 錄下 Bob 收到的每一個 socket.io 封包
  const bobFrames: string[] = [];
  bob.on('websocket', ws =>
    ws.on('framereceived', frame => {
      if (typeof frame.payload === 'string') bobFrames.push(frame.payload);
    }),
  );

  const roomUrl = await createRoom(alice, 'E2E 封包房');
  await bob.goto(roomUrl);
  await expect(playerCount(alice, 2)).toBeVisible();
  await bob.getByRole('button', { name: '準備遊戲' }).click();
  const startButton = alice.getByRole('button', { name: '開始遊戲' });
  await expect(startButton).toBeEnabled();
  await startButton.click();
  await expect(scoreOf(bob, 'Alice')).toHaveAttribute('data-score', '0');
  await buzzAndAnswer(bob);
  await expect(scoreOf(alice, 'Bob')).not.toHaveAttribute('data-score', '0');

  const aliceToken = await alice.evaluate(() =>
    sessionStorage.getItem('reconnectToken'),
  );
  expect(aliceToken).toBeTruthy();
  expect(bobFrames.length).toBeGreaterThan(10);
  const all = bobFrames.join('\n');
  expect(all).not.toContain(aliceToken!);
  for (const key of [
    '"deck"',
    '"password"',
    '"reconnectToken"',
    '"pendingPlay"',
  ]) {
    expect(all, `封包含有 ${key}`).not.toContain(key);
  }
  // 手牌只會出現在自己的 self 裡；公開的玩家資料只有張數
  const handOutsideSelf = bobFrames.filter(
    f => f.includes('"handCard"') && !f.includes('"self"'),
  );
  expect(handOutsideSelf).toEqual([]);
});

/** 等到可以搶答，或已經出現結算；回傳是哪一個 */
async function waitForBuzzOrGameOver(
  buzz: Locator,
  gameOverTitle: Locator,
): Promise<'buzz' | 'over'> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await gameOverTitle.isVisible()) return 'over';
    if ((await buzz.isVisible()) && (await buzz.isEnabled())) return 'buzz';
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('等不到可以搶答，也沒有出現結算');
}

test.describe('快速配對與再玩一場', () => {
  test('快速開始看得到配對狀態，可以取消；取消後按鈕不會一直轉圈', async ({
    browser,
  }) => {
    const alice = await openPlayer(browser, 'Alice');
    await alice.goto('/multiple-play');
    await expect(
      alice.getByRole('button', { name: '修改暱稱：Alice' }),
    ).toBeVisible();
    await alice.getByRole('button', { name: '快速開始' }).click();
    await alice.waitForURL(/\/multiple-play\/[^/]+$/);

    const panel = alice.locator('[data-testid="quick-match-panel"]:visible');
    await expect(panel.getByText('正在尋找對手')).toBeVisible();
    await expect(
      alice.locator('[data-testid="quick-match-humans"]:visible'),
    ).toHaveText('已有 1 位玩家（最多 4 人）');
    await expect(panel.getByText(/秒後開局/)).toBeVisible();

    await panel.getByRole('button', { name: '取消配對' }).click();
    await alice.waitForURL(/\/multiple-play$/);
    await expect(alice.getByRole('button', { name: '快速開始' })).toBeEnabled();
  });

  test('不等了直接開局、電腦補位；打到結算看得到勝負與真人電腦，再玩一場進到新的配對房', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const alice = await openPlayer(browser, 'Alice');
    await alice.goto('/multiple-play');
    await expect(
      alice.getByRole('button', { name: '修改暱稱：Alice' }),
    ).toBeVisible();
    await alice.getByRole('button', { name: '快速開始' }).click();
    await alice.waitForURL(/\/multiple-play\/[^/]+$/);
    const firstRoomUrl = alice.url();

    await alice
      .locator('[data-testid="quick-match-panel"]:visible')
      .getByRole('button', { name: '不等了，直接開始' })
      .click();
    // 電腦補到 3 人
    await expect(alice.getByTestId('buzzer-player')).toHaveCount(3);

    // 每題一開放就搶答（電腦最快 2 秒才出手），答對後等分數更新，一直答到結算
    const gameOverTitle = alice.getByTestId('game-over-title');
    const buzz = alice.getByRole('button', { name: '搶答！' });
    const myScore = scoreOf(alice, 'Alice');
    for (let round = 0; round < 20; round++) {
      const state = await waitForBuzzOrGameOver(buzz, gameOverTitle);
      if (state === 'over') break;
      const before = await myScore.getAttribute('data-score');
      await buzzAndAnswer(alice);
      await expect
        .poll(
          async () =>
            (await gameOverTitle.isVisible()) ||
            (await myScore.getAttribute('data-score')) !== before,
          { timeout: 30_000 },
        )
        .toBe(true);
    }

    await expect(gameOverTitle).toBeVisible({ timeout: 30_000 });
    await expect(gameOverTitle).toHaveText('你贏了！');
    await expect(alice.getByTestId('game-over-self-rank')).toHaveText(
      '你是第 1 名（共 3 人）',
    );
    const rows = alice.getByTestId('game-over-player');
    await expect(rows).toHaveCount(3);
    await expect(
      rows.and(alice.locator('[data-player-kind="bot"]')),
    ).toHaveCount(2);
    await expect(
      rows.and(alice.locator('[data-player-kind="human"]')),
    ).toHaveCount(1);

    // 再玩一場：不用重新設定，直接進到新的配對房（不是原本那間）
    await alice.getByRole('button', { name: '再玩一場' }).click();
    await expect.poll(() => alice.url()).not.toBe(firstRoomUrl);
    await expect(alice).toHaveURL(/\/multiple-play\/[^/]+$/);
    await expect(
      alice.locator('[data-testid="quick-match-humans"]:visible'),
    ).toHaveText('已有 1 位玩家（最多 4 人）');
    await expect(gameOverTitle).toBeHidden();

    // 新房間：再開一局，分數從 0 開始
    await alice
      .locator('[data-testid="quick-match-panel"]:visible')
      .getByRole('button', { name: '不等了，直接開始' })
      .click();
    await expect(alice.getByTestId('buzzer-player')).toHaveCount(3);
    for (const player of await alice.getByTestId('buzzer-player').all()) {
      await expect(player).toHaveAttribute('data-score', '0');
    }
  });
});

test.describe('多人分析事件', () => {
  test('快速開始到開局、參與作答：每個事件只送一次，遊戲中重新整理不會重複記錄開局，參數沒有個人資料', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      window.localStorage.setItem('playerName', 'Alice');
      // 本機不會載入 GA4；換成記錄器，事件存在 sessionStorage，重新整理後還看得到
      const key = 'e2e_ga_events';
      (window as unknown as { gtag: unknown }).gtag = (
        _command: string,
        name: string,
        params?: Record<string, unknown>,
      ) => {
        const list = JSON.parse(sessionStorage.getItem(key) ?? '[]');
        list.push({ name, params: params ?? null });
        sessionStorage.setItem(key, JSON.stringify(list));
      };
    });
    const alice = await context.newPage();
    const recorded = async () =>
      alice.evaluate(
        () =>
          JSON.parse(sessionStorage.getItem('e2e_ga_events') ?? '[]') as {
            name: string;
            params: Record<string, unknown> | null;
          }[],
      );
    const count = async (name: string) =>
      (await recorded()).filter(e => e.name === name).length;

    await alice.goto('/multiple-play');
    await expect(
      alice.getByRole('button', { name: '修改暱稱：Alice' }),
    ).toBeVisible();
    await alice.getByRole('button', { name: '快速開始' }).click();
    await alice.waitForURL(/\/multiple-play\/[^/]+$/);
    const roomId = new URL(alice.url()).pathname.split('/').pop()!;
    await alice
      .locator('[data-testid="quick-match-panel"]:visible')
      .getByRole('button', { name: '不等了，直接開始' })
      .click();
    await expect(alice.getByTestId('buzzer-player')).toHaveCount(3);
    await expect.poll(() => count('game_start')).toBe(1);

    // 遊戲中重新整理：回到同一局，開局與配對完成都不會再記一次
    await alice.reload();
    await expect(alice.getByTestId('buzzer-player')).toHaveCount(3);
    await alice.waitForTimeout(1000);
    expect(await count('game_start')).toBe(1);
    expect(await count('quick_match_start')).toBe(1);

    // 參與作答：搶到一次就記一次，同一局之後不再記
    const buzz = alice.getByRole('button', { name: '搶答！' });
    await expect(buzz).toBeEnabled({ timeout: 30_000 });
    await buzzAndAnswer(alice);
    await expect.poll(() => count('multiplayer_participated')).toBe(1);

    const events = await recorded();
    const names = events.map(e => e.name);
    for (const name of [
      'multiplayer_lobby_view',
      'quick_match_requested',
      'quick_match_joined',
      'quick_match_start',
      'game_start',
      'multiplayer_participated',
    ]) {
      expect(
        names.filter(n => n === name),
        name,
      ).toHaveLength(1);
    }
    const start = events.find(e => e.name === 'game_start')!.params!;
    expect(start).toMatchObject({
      mode: 'multiplayer',
      game_type: 'buzzer',
      human_player_count: 1,
      bot_player_count: 2,
    });
    expect(start.match_id).toEqual(expect.any(String));
    const sent = JSON.stringify(events);
    expect(sent).not.toContain('Alice');
    expect(sent).not.toContain(roomId);
    expect(sent).not.toMatch(/token|password/i);
  });
});
