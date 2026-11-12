import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { store } from '@/test/firestore-mock';
import type { Mode } from './config';
import { markSessionFinished } from './guard';
import { GET, POST } from './route';
import {
  createReceiptToken,
  createSessionToken,
  verifySessionToken,
} from './token';

// 只替換外部依賴（登入、Firestore），route 本身的驗證與覆寫邏輯照常執行
const currentUser = vi.hoisted(() => ({
  value: { id: 'user-1', name: '測試玩家', email: 'p@example.com' } as {
    id: string;
    name: string;
    email: string;
  } | null,
}));

vi.mock('@/auth', () => ({
  auth: async () => (currentUser.value ? { user: currentUser.value } : null),
}));
vi.mock('@/lib/firebase-admin', () => import('@/test/firestore-mock'));

process.env.AUTH_SECRET = 'test-secret';

/** 模擬一場已經在 /finish 結算過的遊戲，回傳它的成績收據 */
async function receiptFor(mode: Mode, payload: Record<string, number>) {
  const session = verifySessionToken(createSessionToken(mode), mode)!;
  await markSessionFinished(session.nonce, mode);
  return createReceiptToken(session, payload);
}

function postReceipt(mode: string, receipt: string, extra = {}) {
  return POST(
    new NextRequest('http://localhost/api/leaderboard', {
      method: 'POST',
      body: JSON.stringify({ mode, receipt, ...extra }),
    }),
  );
}

async function post(mode: Mode, payload: Record<string, number>) {
  return postReceipt(mode, await receiptFor(mode, payload));
}

const GUEST = {
  guestId: 'guest_123e4567-e89b-42d3-a456-426614174000',
  guestKey: '11111111-2222-4333-8444-555555555555',
};

function saved(collection: string, id = 'user-1') {
  return store.get(collection)?.get(id);
}

beforeEach(() => {
  store.clear();
  currentUser.value = {
    id: 'user-1',
    name: '測試玩家',
    email: 'p@example.com',
  };
});

describe('POST /api/leaderboard - 成績收據', () => {
  it('沒有收據、亂寫的收據都拒絕', async () => {
    expect((await postReceipt('classic', '')).status).toBe(401);
    expect((await postReceipt('classic', 'abc.def')).status).toBe(401);
    expect(saved('leaderboard_classic')).toBeUndefined();
  });

  it('收據的成績被竄改時簽章不符', async () => {
    const receipt = await receiptFor('classic', { score: 10 });
    const [data, signature] = receipt.split('.');
    const decoded = JSON.parse(Buffer.from(data, 'base64url').toString());
    decoded.payload.score = 66;
    const forged = `${Buffer.from(JSON.stringify(decoded)).toString('base64url')}.${signature}`;

    expect((await postReceipt('classic', forged)).status).toBe(401);
  });

  it('不能拿開局憑證直接上榜', async () => {
    const token = createSessionToken('classic');
    expect((await postReceipt('classic', token)).status).toBe(401);
  });

  it('收據的模式要和送出的模式相同', async () => {
    const receipt = await receiptFor('match', { score: 40 });
    expect((await postReceipt('classic', receipt)).status).toBe(401);
  });

  it('同一位玩家重送同一張收據視為成功（網路重試）', async () => {
    const receipt = await receiptFor('classic', { score: 30 });
    expect((await postReceipt('classic', receipt)).status).toBe(200);
    expect((await postReceipt('classic', receipt)).status).toBe(200);
  });

  it('同一張收據不能換帳號再上榜一次', async () => {
    const receipt = await receiptFor('classic', { score: 30 });
    expect((await postReceipt('classic', receipt)).status).toBe(200);

    currentUser.value = null;
    const res = await postReceipt('classic', receipt, {
      ...GUEST,
      guestName: '小帳號',
    });
    expect(res.status).toBe(409);
  });

  it('訪客暱稱含不雅字詞時拒絕', async () => {
    currentUser.value = null;
    const guest = GUEST;
    const receipt = await receiptFor('classic', { score: 30 });

    const bad = await postReceipt('classic', receipt, {
      ...guest,
      guestName: '幹你娘',
    });
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: 'inappropriate name' });

    const ok = await postReceipt('classic', receipt, {
      ...guest,
      guestName: '小明',
    });
    expect(ok.status).toBe(200);
  });

  it('上榜的成績以收據內容為準，不看另外送的 payload', async () => {
    const receipt = await receiptFor('classic', { score: 12 });
    await postReceipt('classic', receipt, { payload: { score: 66 } });
    expect(saved('leaderboard_classic')).toMatchObject({ score: 12 });
  });
});

describe('POST /api/leaderboard - 牌桌模式', () => {
  it('寫入牌桌的 collection', async () => {
    const res = await post('tabletop_hard', { score: 52 });

    expect(await res.json()).toEqual({ ok: true, updated: true });
    expect(saved('leaderboard_tabletop_hard')).toMatchObject({ score: 52 });
  });

  it('已移除的簡單、普通難度不接受', async () => {
    const receipt = await receiptFor('tabletop_hard', { score: 40 });
    expect((await postReceipt('tabletop_easy', receipt)).status).toBe(400);
    expect((await postReceipt('tabletop_normal', receipt)).status).toBe(400);
  });

  it('分數比舊紀錄低或相同時不覆寫', async () => {
    await post('tabletop_hard', { score: 40 });

    const res = await post('tabletop_hard', { score: 40 });

    expect(await res.json()).toEqual({ ok: true, updated: false });
    expect(saved('leaderboard_tabletop_hard')).toMatchObject({ score: 40 });
  });

  it('分數比舊紀錄高時覆寫', async () => {
    await post('tabletop_hard', { score: 40 });
    await post('tabletop_hard', { score: 41 });

    expect(saved('leaderboard_tabletop_hard')).toMatchObject({ score: 41 });
  });
});

describe('GET /api/leaderboard - 公開列表', () => {
  it('不回傳玩家 email', async () => {
    await post('classic', { score: 30 });
    expect(saved('leaderboard_classic')).toMatchObject({
      email: 'p@example.com',
    });

    const res = await GET(
      new NextRequest('http://localhost/api/leaderboard?mode=classic'),
    );
    const rows = await res.json();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ rank: 1, userId: 'user-1', score: 30 });
    expect(rows[0]).not.toHaveProperty('email');
  });
});

describe('POST /api/leaderboard - 既有模式', () => {
  it('經典模式分數比舊紀錄低時不覆寫', async () => {
    await post('classic', { score: 30 });
    const res = await post('classic', { score: 20 });
    expect(await res.json()).toEqual({ ok: true, updated: false });
  });

  it('快答秒數越少越好', async () => {
    await post('quickmath', { seconds: 40 });
    await post('quickmath', { seconds: 35.5 });
    await post('quickmath', { seconds: 50 });
    expect(saved('leaderboard_quickmath')).toMatchObject({ seconds: 35.5 });
  });
});

describe('POST /api/leaderboard - 訪客密鑰', () => {
  beforeEach(() => {
    currentUser.value = null;
  });

  const submit = async (extra: Record<string, unknown>, score = 30) =>
    postReceipt('classic', await receiptFor('classic', { score }), {
      guestName: '小明',
      ...extra,
    });

  it('沒有密鑰不能用訪客身分上榜', async () => {
    const res = await submit({ guestId: GUEST.guestId });
    expect(res.status).toBe(401);
  });

  it('第一次上榜登記密鑰，之後要用同一把密鑰', async () => {
    expect((await submit(GUEST)).status).toBe(200);
    expect((await submit(GUEST, 40)).status).toBe(200);
    expect(saved('leaderboard_classic', GUEST.guestId)).toMatchObject({
      score: 40,
    });
  });

  it('別人拿公開的 guestId 加上自己的密鑰，不能蓋掉紀錄', async () => {
    await submit(GUEST);

    const res = await submit(
      {
        guestId: GUEST.guestId,
        guestKey: '99999999-8888-4777-8666-555555555555',
        guestName: '冒牌貨',
      },
      66,
    );

    expect(res.status).toBe(403);
    expect(saved('leaderboard_classic', GUEST.guestId)).toMatchObject({
      displayName: '小明',
      score: 30,
    });
  });

  it('密鑰被拒時不會用掉這張收據，換回正確密鑰還能上榜', async () => {
    await submit(GUEST);
    const receipt = await receiptFor('classic', { score: 50 });
    const wrong = await postReceipt('classic', receipt, {
      guestId: GUEST.guestId,
      guestKey: '99999999-8888-4777-8666-555555555555',
      guestName: '小明',
    });
    expect(wrong.status).toBe(403);

    const right = await postReceipt('classic', receipt, {
      ...GUEST,
      guestName: '小明',
    });
    expect(right.status).toBe(200);
  });

  it('登入 Google 的玩家不需要密鑰', async () => {
    currentUser.value = {
      id: 'user-1',
      name: '測試玩家',
      email: 'p@example.com',
    };
    expect((await post('classic', { score: 30 })).status).toBe(200);
  });
});
