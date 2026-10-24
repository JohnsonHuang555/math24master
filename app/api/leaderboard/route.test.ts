import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

// 只替換外部依賴（登入、Firestore），route 本身的驗證與覆寫邏輯照常執行
const store = new Map<string, Map<string, Record<string, unknown>>>();

vi.mock('@/auth', () => ({
  auth: async () => ({
    user: { id: 'user-1', name: '測試玩家', email: 'p@example.com' },
  }),
}));

vi.mock('@/lib/firebase-admin', () => {
  const collection = (name: string) => {
    if (!store.has(name)) store.set(name, new Map());
    const docs = store.get(name)!;
    return {
      doc: (id: string) => ({
        get: async () => ({ exists: docs.has(id), data: () => docs.get(id) }),
        set: async (data: Record<string, unknown>) => void docs.set(id, data),
      }),
      where: (field: string, _op: string, value: unknown) => ({
        limit: () => ({
          get: async () => {
            const matched = [...docs.entries()].filter(
              ([, d]) => d[field] === value,
            );
            return {
              empty: matched.length === 0,
              docs: matched.map(([id, d]) => ({
                data: () => d,
                ref: { delete: async () => void docs.delete(id) },
              })),
            };
          },
        }),
      }),
    };
  };
  return { db: { collection } };
});

function post(mode: string, payload: Record<string, unknown>) {
  return POST(
    new NextRequest('http://localhost/api/leaderboard', {
      method: 'POST',
      body: JSON.stringify({ mode, payload }),
    }),
  );
}

function saved(collection: string) {
  return store.get(collection)?.get('user-1');
}

beforeEach(() => store.clear());

describe('POST /api/leaderboard - 牌桌模式', () => {
  it('寫入對應難度的 collection', async () => {
    const res = await post('tabletop_hard', { score: 52 });

    expect(await res.json()).toEqual({ ok: true, updated: true });
    expect(saved('leaderboard_tabletop_hard')).toMatchObject({ score: 52 });
    expect(saved('leaderboard_tabletop_easy')).toBeUndefined();
  });

  it('超過單局上限 2590 分時拒絕', async () => {
    expect((await post('tabletop_normal', { score: 2591 })).status).toBe(400);
    expect((await post('tabletop_normal', { score: 2590 })).status).toBe(200);
  });

  it('分數比舊紀錄低或相同時不覆寫', async () => {
    await post('tabletop_easy', { score: 40 });

    const res = await post('tabletop_easy', { score: 40 });

    expect(await res.json()).toEqual({ ok: true, updated: false });
    expect(saved('leaderboard_tabletop_easy')).toMatchObject({ score: 40 });
  });

  it('分數比舊紀錄高時覆寫', async () => {
    await post('tabletop_easy', { score: 40 });
    await post('tabletop_easy', { score: 41 });

    expect(saved('leaderboard_tabletop_easy')).toMatchObject({ score: 41 });
  });
});

describe('POST /api/leaderboard - 既有模式的上限維持不變', () => {
  it.each([
    ['classic', 66],
    ['match', 40],
  ])('%s 上限 %i 分', async (mode, max) => {
    expect((await post(mode, { score: max + 1 })).status).toBe(400);
    expect((await post(mode, { score: max })).status).toBe(200);
  });

  it('經典模式分數比舊紀錄低時不覆寫', async () => {
    await post('classic', { score: 30 });
    const res = await post('classic', { score: 20 });
    expect(await res.json()).toEqual({ ok: true, updated: false });
  });
});
