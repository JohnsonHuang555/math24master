import type { NextRequest } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/firebase-admin';

/** 一場遊戲的結算紀錄：key 是憑證的 nonce，確保同一場只能結算、上榜各一次 */
export const SESSIONS_COLLECTION = 'leaderboard_sessions';
/** 依 IP 的頻率限制計數 */
export const RATE_LIMIT_COLLECTION = 'leaderboard_rate_limits';
/** 訪客密鑰的雜湊：key 是 guestId（見 docs/adr/0012） */
export const GUESTS_COLLECTION = 'leaderboard_guests';

// 這兩個 collection 的文件都帶 expireAt；在 Firestore 開啟 TTL 政策後會自動清掉過期資料
const SESSION_RECORD_TTL_MS = 8 * 24 * 60 * 60 * 1000;

export const RATE_LIMITS = {
  session: { limit: 60, windowMs: 60_000 },
  finish: { limit: 20, windowMs: 60_000 },
  submit: { limit: 20, windowMs: 60_000 },
  guest: { limit: 10, windowMs: 60_000 },
} as const;

/** 訪客密鑰的格式：前端用 uuid 產生，這裡只檢查長度範圍 */
export function isValidGuestKey(key: unknown): key is string {
  return typeof key === 'string' && key.length >= 20 && key.length <= 100;
}

function hashGuestKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * 確認送成績的是這個訪客本人。guestId 會公開在排行榜上，所以另外要求只存在玩家裝置上的密鑰：
 * - 這個 guestId 還沒登記過：用這把密鑰登記（先登記的人取得這個 guestId）
 * - 已經登記過：密鑰要相同
 */
export async function checkGuestKey(
  guestId: string,
  guestKey: string,
  now = Date.now(),
): Promise<boolean> {
  const ref = db.collection(GUESTS_COLLECTION).doc(guestId);
  const keyHash = hashGuestKey(guestKey);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      tx.set(ref, { keyHash, claimedAt: new Date(now) });
      return true;
    }
    const stored = Buffer.from(String(snap.data()?.keyHash ?? ''));
    const given = Buffer.from(keyHash);
    return stored.length === given.length && timingSafeEqual(stored, given);
  });
}

/** 用戶端 IP（Vercel 放在 x-forwarded-for 第一個）雜湊後當 key，資料庫不存原始 IP */
export function clientKey(req: NextRequest): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

/**
 * 固定時間窗的頻率限制：同一個 key 在 windowMs 內最多 limit 次。
 * 回傳 false 代表超過限制
 */
export async function checkRateLimit(
  key: string,
  action: keyof typeof RATE_LIMITS,
  now = Date.now(),
): Promise<boolean> {
  const { limit, windowMs } = RATE_LIMITS[action];
  const ref = db.collection(RATE_LIMIT_COLLECTION).doc(`${action}_${key}`);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const data = snap.data() as
      { windowStart: number; count: number } | undefined;
    if (!data || now - data.windowStart >= windowMs) {
      tx.set(ref, {
        windowStart: now,
        count: 1,
        expireAt: new Date(now + windowMs * 2),
      });
      return true;
    }
    if (data.count >= limit) return false;
    tx.update(ref, { count: data.count + 1 });
    return true;
  });
}

/** 結算：同一張開局憑證只能結算一次。回傳 false 代表已經結算過 */
export async function markSessionFinished(
  nonce: string,
  mode: string,
  now = Date.now(),
): Promise<boolean> {
  const ref = db.collection(SESSIONS_COLLECTION).doc(nonce);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (snap.exists) return false;
    tx.set(ref, {
      mode,
      finishedAt: new Date(now),
      submittedBy: null,
      expireAt: new Date(now + SESSION_RECORD_TTL_MS),
    });
    return true;
  });
}

/**
 * 上榜：同一張收據只能上榜一次，避免拿同一場成績灌好幾個訪客帳號。
 * 同一位玩家重送同一張收據（例如網路重試）視為成功
 */
export async function markReceiptSubmitted(
  nonce: string,
  userId: string,
): Promise<boolean> {
  const ref = db.collection(SESSIONS_COLLECTION).doc(nonce);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) return false;
    const submittedBy = snap.data()?.submittedBy as string | null | undefined;
    if (submittedBy && submittedBy !== userId) return false;
    if (!submittedBy) tx.update(ref, { submittedBy: userId });
    return true;
  });
}
