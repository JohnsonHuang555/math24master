import { NextRequest, NextResponse } from 'next/server';
import { isValidMode } from '../config';
import { checkRateLimit, clientKey } from '../guard';
import { createSessionToken } from '../token';

// 個人憑證絕不能被 CDN 快取
const NO_STORE = { 'Cache-Control': 'private, no-store' };

/** 開局：發一張有簽章的開局憑證，記錄模式與 server 端的開局時間（見 docs/adr/0011） */
export async function POST(req: NextRequest) {
  const { mode } = (await req.json().catch(() => ({}))) as { mode?: string };
  if (!isValidMode(mode)) {
    return NextResponse.json(
      { error: 'invalid mode' },
      { status: 400, headers: NO_STORE },
    );
  }
  if (!(await checkRateLimit(clientKey(req), 'session'))) {
    return NextResponse.json(
      { error: 'too many requests' },
      { status: 429, headers: NO_STORE },
    );
  }
  return NextResponse.json(
    { token: createSessionToken(mode) },
    { headers: NO_STORE },
  );
}
