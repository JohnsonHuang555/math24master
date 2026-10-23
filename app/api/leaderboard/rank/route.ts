import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/firebase-admin';
import {
  COLLECTION,
  GUEST_ID_RE,
  ORDER_DIR,
  ORDER_FIELD,
  hasZeroScore,
  isValidMode,
} from '../config';

// 個人名次因人而異，絕不能被 CDN 快取（否則 A 的名次會被快取給 B 看）
const NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('mode');
  if (!isValidMode(mode)) {
    return NextResponse.json({ error: 'invalid mode' }, { status: 400 });
  }

  const session = await auth();
  const googleId = (session?.user as { id?: string } | undefined)?.id;
  const guestId = req.nextUrl.searchParams.get('guestId');

  let userId: string;
  if (googleId) {
    userId = googleId;
  } else if (guestId && GUEST_ID_RE.test(guestId)) {
    userId = guestId;
  } else {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401, headers: NO_STORE },
    );
  }

  const collection = db.collection(COLLECTION[mode]);
  const doc = await collection.doc(userId).get();
  const data = doc.data();
  if (!data || hasZeroScore(mode, data)) {
    return NextResponse.json(null, { headers: NO_STORE });
  }

  const field = ORDER_FIELD[mode];
  const value = Number(data[field]);
  if (!Number.isFinite(value)) {
    return NextResponse.json(null, { headers: NO_STORE });
  }

  // 1224 標準競賽排名：名次 = 成績嚴格優於我的人數 + 1，與列表的並列規則一致。
  // 0 分紀錄不可能嚴格優於任何上榜成績，因此不需另外濾掉。
  const better = await collection
    .where(field, ORDER_DIR[mode] === 'desc' ? '>' : '<', value)
    .count()
    .get();

  return NextResponse.json(
    {
      rank: better.data().count + 1,
      userId,
      displayName: data.displayName,
      photoURL: data.photoURL ?? null,
      score: data.score,
      stage: data.stage,
      seconds: data.seconds,
      totalScore: data.totalScore,
      submittedAt: data.submittedAt?.toDate?.()?.toISOString() ?? null,
    },
    { headers: NO_STORE },
  );
}
