import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Mode } from './config';

/**
 * 排行榜防作弊用的簽章憑證（見 docs/adr/0011）。
 * - session：開局時發給前端，記錄模式與 server 端的開局時間
 * - receipt：結束時檢查通過後發給前端，上排行榜只認這張
 * 兩者共用同一個 nonce，server 用它確保一場遊戲只能結算、上榜各一次。
 */
export type SessionToken = {
  type: 'session';
  mode: Mode;
  nonce: string;
  /** server 發出憑證的時間（毫秒） */
  issuedAt: number;
};

export type ReceiptToken = {
  type: 'receipt';
  mode: Mode;
  nonce: string;
  issuedAt: number;
  /** 已檢查過的成績，上榜時以這份為準，不看前端另外送的 payload */
  payload: Record<string, number>;
};

type Token = SessionToken | ReceiptToken;

// 開局到結束最久 6 小時；結束後最久 7 天內要上榜（未登入的玩家可能隔天才登入補送）
export const SESSION_MAX_AGE_MS = 6 * 60 * 60 * 1000;
export const RECEIPT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
// 不同 server 執行個體的時鐘可能差幾秒，未來時間容許這麼多
const CLOCK_SKEW_MS = 5_000;

function secret(): string {
  const value = process.env.LEADERBOARD_SECRET || process.env.AUTH_SECRET;
  if (!value) throw new Error('LEADERBOARD_SECRET or AUTH_SECRET is not set');
  return value;
}

function sign(data: string): string {
  return createHmac('sha256', secret()).update(data).digest('base64url');
}

function encode(token: Token): string {
  const data = Buffer.from(JSON.stringify(token)).toString('base64url');
  return `${data}.${sign(data)}`;
}

function decode(raw: unknown): Token | null {
  if (typeof raw !== 'string') return null;
  const [data, signature] = raw.split('.');
  if (!data || !signature) return null;
  const expected = Buffer.from(sign(data));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export function createSessionToken(mode: Mode, now = Date.now()): string {
  return encode({ type: 'session', mode, nonce: randomUUID(), issuedAt: now });
}

export function createReceiptToken(
  session: SessionToken,
  payload: Record<string, number>,
  now = Date.now(),
): string {
  return encode({
    type: 'receipt',
    mode: session.mode,
    nonce: session.nonce,
    issuedAt: now,
    payload,
  });
}

/** 驗證開局憑證：簽章正確、類型與模式相符、沒有過期 */
export function verifySessionToken(
  raw: unknown,
  mode: Mode,
  now = Date.now(),
): SessionToken | null {
  const token = decode(raw);
  if (token?.type !== 'session' || token.mode !== mode) return null;
  if (
    now - token.issuedAt > SESSION_MAX_AGE_MS ||
    token.issuedAt > now + CLOCK_SKEW_MS
  ) {
    return null;
  }
  return token;
}

/** 驗證成績收據：簽章正確、類型與模式相符、沒有過期 */
export function verifyReceiptToken(
  raw: unknown,
  mode: Mode,
  now = Date.now(),
): ReceiptToken | null {
  const token = decode(raw);
  if (token?.type !== 'receipt' || token.mode !== mode) return null;
  if (
    now - token.issuedAt > RECEIPT_MAX_AGE_MS ||
    token.issuedAt > now + CLOCK_SKEW_MS
  ) {
    return null;
  }
  return token;
}
