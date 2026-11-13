import { NextRequest, NextResponse } from 'next/server';
import { GUEST_ID_RE } from '../config';
import {
  checkGuestKey,
  checkRateLimit,
  clientKey,
  isValidGuestKey,
} from '../guard';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/**
 * 訪客登記密鑰（見 docs/adr/0012）：前端在拿到訪客身分後先登記一次，
 * 之後別人就無法拿排行榜上公開的 guestId 上傳成績。已經登記過的話要密鑰相同才回成功
 */
export async function POST(req: NextRequest) {
  const { guestId, guestKey } = (await req.json().catch(() => ({}))) as {
    guestId?: string;
    guestKey?: string;
  };
  if (!guestId || !GUEST_ID_RE.test(guestId) || !isValidGuestKey(guestKey)) {
    return NextResponse.json(
      { error: 'invalid request' },
      { status: 400, headers: NO_STORE },
    );
  }
  if (!(await checkRateLimit(clientKey(req), 'guest'))) {
    return NextResponse.json(
      { error: 'too many requests' },
      { status: 429, headers: NO_STORE },
    );
  }
  if (!(await checkGuestKey(guestId, guestKey))) {
    return NextResponse.json(
      { error: 'guest key mismatch' },
      { status: 403, headers: NO_STORE },
    );
  }
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
