import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { store } from '@/test/firestore-mock';
import { POST } from './route';

vi.mock('@/lib/firebase-admin', () => import('@/test/firestore-mock'));

const GUEST_ID = 'guest_123e4567-e89b-42d3-a456-426614174000';
const KEY = '11111111-2222-4333-8444-555555555555';

function register(body: unknown) {
  return POST(
    new NextRequest('http://localhost/api/leaderboard/guest', {
      method: 'POST',
      headers: { 'x-forwarded-for': '1.2.3.4' },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => store.clear());

describe('POST /api/leaderboard/guest', () => {
  it('第一次登記成功，同一把密鑰再登記也成功', async () => {
    expect((await register({ guestId: GUEST_ID, guestKey: KEY })).status).toBe(
      200,
    );
    expect((await register({ guestId: GUEST_ID, guestKey: KEY })).status).toBe(
      200,
    );
  });

  it('已經被登記的 guestId 換一把密鑰就拒絕', async () => {
    await register({ guestId: GUEST_ID, guestKey: KEY });
    const res = await register({
      guestId: GUEST_ID,
      guestKey: '99999999-8888-4777-8666-555555555555',
    });
    expect(res.status).toBe(403);
  });

  it('資料庫只存密鑰的雜湊，不存原文', async () => {
    await register({ guestId: GUEST_ID, guestKey: KEY });
    const doc = store.get('leaderboard_guests')?.get(GUEST_ID);
    expect(doc?.keyHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(doc)).not.toContain(KEY);
  });

  it('格式不對的 guestId 或密鑰回 400', async () => {
    expect((await register({ guestId: 'abc', guestKey: KEY })).status).toBe(
      400,
    );
    expect(
      (await register({ guestId: GUEST_ID, guestKey: 'short' })).status,
    ).toBe(400);
  });
});
