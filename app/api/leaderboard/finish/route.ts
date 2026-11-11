import { NextRequest, NextResponse } from 'next/server';
import { checkResult, isValidMode } from '../config';
import { checkRateLimit, clientKey, markSessionFinished } from '../guard';
import { createReceiptToken, verifySessionToken } from '../token';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/**
 * 結束：用開局憑證換成績收據（見 docs/adr/0011）。
 * 檢查成績範圍與開局到現在的實際經過時間，一張開局憑證只能結算一次。
 * 不需要登入：未登入的玩家先拿收據存起來，登入後再上榜
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    mode?: string;
    token?: string;
    payload?: Record<string, unknown>;
  };
  const { mode, token, payload } = body;

  if (!isValidMode(mode) || !payload || typeof payload !== 'object') {
    return NextResponse.json(
      { error: 'invalid request' },
      { status: 400, headers: NO_STORE },
    );
  }
  if (!(await checkRateLimit(clientKey(req), 'finish'))) {
    return NextResponse.json(
      { error: 'too many requests' },
      { status: 429, headers: NO_STORE },
    );
  }

  const now = Date.now();
  const session = verifySessionToken(token, mode, now);
  if (!session) {
    return NextResponse.json(
      { error: 'invalid session' },
      { status: 401, headers: NO_STORE },
    );
  }

  const result = checkResult(mode, payload, (now - session.issuedAt) / 1000);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason },
      { status: 400, headers: NO_STORE },
    );
  }

  if (!(await markSessionFinished(session.nonce, mode, now))) {
    return NextResponse.json(
      { error: 'session already finished' },
      { status: 409, headers: NO_STORE },
    );
  }

  return NextResponse.json(
    { receipt: createReceiptToken(session, result.payload, now) },
    { headers: NO_STORE },
  );
}
