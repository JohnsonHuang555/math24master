import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { store } from '@/test/firestore-mock';
import { POST as startSession } from '../session/route';
import { verifyReceiptToken } from '../token';
import { POST } from './route';

vi.mock('@/lib/firebase-admin', () => import('@/test/firestore-mock'));

process.env.AUTH_SECRET = 'test-secret';

function request(path: string, body: unknown, ip = '1.2.3.4') {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

async function start(mode: string, ip?: string) {
  const res = await startSession(
    request('/api/leaderboard/session', { mode }, ip),
  );
  return { status: res.status, token: (await res.json()).token as string };
}

function finish(body: unknown, ip?: string) {
  return POST(request('/api/leaderboard/finish', body, ip));
}

beforeEach(() => {
  store.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-11T00:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('開局到結算', () => {
  it('正常玩完拿到收據，收據內容就是檢查過的成績', async () => {
    const { token } = await start('classic');
    vi.advanceTimersByTime(5 * 60_000);

    const res = await finish({
      mode: 'classic',
      token,
      payload: { score: 30 },
    });
    const { receipt } = await res.json();

    expect(res.status).toBe(200);
    expect(verifyReceiptToken(receipt, 'classic')?.payload).toEqual({
      score: 30,
    });
  });

  it('開局後馬上回報高分會被擋下', async () => {
    const { token } = await start('classic');
    vi.advanceTimersByTime(2_000);

    const res = await finish({
      mode: 'classic',
      token,
      payload: { score: 66 },
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'too_fast' });
  });

  it('同一張開局憑證只能結算一次', async () => {
    const { token } = await start('match');
    vi.advanceTimersByTime(60_000);
    const body = { mode: 'match', token, payload: { score: 20 } };

    expect((await finish(body)).status).toBe(200);
    expect((await finish(body)).status).toBe(409);
  });

  it('超過分數上限不發收據', async () => {
    const { token } = await start('classic');
    vi.advanceTimersByTime(60 * 60_000);

    const res = await finish({
      mode: 'classic',
      token,
      payload: { score: 67 },
    });
    expect(res.status).toBe(400);
  });

  it('偽造或其他模式的開局憑證不接受', async () => {
    const { token } = await start('match');
    vi.advanceTimersByTime(60_000);

    expect(
      (await finish({ mode: 'classic', token, payload: { score: 1 } })).status,
    ).toBe(401);
    expect(
      (await finish({ mode: 'classic', token: 'x.y', payload: { score: 1 } }))
        .status,
    ).toBe(401);
  });

  it('開局憑證超過 6 小時就失效', async () => {
    const { token } = await start('classic');
    vi.advanceTimersByTime(6 * 60 * 60_000 + 1);

    const res = await finish({
      mode: 'classic',
      token,
      payload: { score: 10 },
    });
    expect(res.status).toBe(401);
  });

  it('快答回報的秒數不能比實際經過的時間還長', async () => {
    const { token } = await start('quickmath');
    vi.advanceTimersByTime(30_000);

    const res = await finish({
      mode: 'quickmath',
      token,
      payload: { seconds: 40 },
    });
    expect(res.status).toBe(400);
  });
});

describe('頻率限制', () => {
  it('同一個 IP 一分鐘內開局超過 60 次就回 429', async () => {
    for (let i = 0; i < 60; i++) {
      expect((await start('classic', '9.9.9.9')).status).toBe(200);
    }
    expect((await start('classic', '9.9.9.9')).status).toBe(429);
    // 其他 IP 不受影響
    expect((await start('classic', '8.8.8.8')).status).toBe(200);

    vi.advanceTimersByTime(60_000);
    expect((await start('classic', '9.9.9.9')).status).toBe(200);
  });
});
