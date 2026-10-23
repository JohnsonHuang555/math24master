import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/firebase-admin';
import {
  COLLECTION,
  GUEST_ID_RE,
  type Mode,
  ORDER_DIR,
  ORDER_FIELD,
  SCORE_MAX,
  hasZeroScore,
  isScoreMode,
  isValidMode,
} from './config';

// quickmath 與 quickmath_advanced 除了寫入的 collection 不同外，
// 驗證/排序/覆寫規則完全相同（詳見 CONTEXT.md 的 Mode 定義）
function isQuickMathMode(mode: Mode): boolean {
  return mode === 'quickmath' || mode === 'quickmath_advanced';
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('mode');
  if (!isValidMode(mode)) {
    return NextResponse.json({ error: 'invalid mode' }, { status: 400 });
  }

  const limit = Math.min(
    Number(req.nextUrl.searchParams.get('limit') ?? 100),
    100,
  );

  const snap = await db
    .collection(COLLECTION[mode])
    .orderBy(ORDER_FIELD[mode], ORDER_DIR[mode])
    .limit(limit)
    .get();

  const valueField = ORDER_FIELD[mode];
  const docs = snap.docs.filter(doc => !hasZeroScore(mode, doc.data()));

  // 1224 標準競賽排名：同分並列名次，下一位直接跳號
  let rank = 0;
  let prevValue: unknown;
  const rows = docs.map((doc, i) => {
    const data = doc.data();
    const value = data[valueField];
    if (i === 0 || value !== prevValue) rank = i + 1;
    prevValue = value;
    return {
      rank,
      userId: doc.id,
      ...data,
      submittedAt: data.submittedAt?.toDate?.()?.toISOString() ?? null,
    };
  });

  return NextResponse.json(rows, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();

  const body = await req.json();
  const { mode, payload, guestId, guestName } = body as {
    mode: Mode;
    payload: Record<string, unknown>;
    guestId?: string;
    guestName?: string;
  };

  let userId: string;
  let displayName: string;
  let photoURL: string | null;

  let email: string | null = null;

  if (session?.user) {
    const id = (session.user as { id?: string }).id;
    if (!id) {
      return NextResponse.json({ error: 'no user id' }, { status: 400 });
    }
    userId = id;
    displayName = session.user.name ?? 'Anonymous';
    photoURL = session.user.image ?? null;
    email = session.user.email ?? null;
  } else if (guestId && guestName) {
    if (!GUEST_ID_RE.test(guestId)) {
      return NextResponse.json({ error: 'invalid guest id' }, { status: 400 });
    }
    const trimmedName = String(guestName).trim();
    if (trimmedName.length < 2 || trimmedName.length > 12) {
      return NextResponse.json({ error: 'invalid name' }, { status: 400 });
    }
    userId = guestId;
    displayName = trimmedName;
    photoURL = null;
  } else {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!isValidMode(mode)) {
    return NextResponse.json({ error: 'invalid mode' }, { status: 400 });
  }

  // Sanity checks
  if (mode === 'challenge') {
    const stage = Number(payload.stage);
    if (!Number.isFinite(stage) || stage < 1 || stage > 500) {
      return NextResponse.json({ error: 'invalid score' }, { status: 400 });
    }
  }
  // 以分數比高低的模式（經典、消消樂、牌桌）：分數必須落在 0～單局理論上限之間
  if (isScoreMode(mode)) {
    const score = Number(payload.score);
    if (!Number.isFinite(score) || score < 0 || score > SCORE_MAX[mode]!) {
      return NextResponse.json({ error: 'invalid score' }, { status: 400 });
    }
  }
  if (isQuickMathMode(mode)) {
    const seconds = Number(payload.seconds);
    if (!Number.isFinite(seconds) || seconds < 10 || seconds > 300) {
      return NextResponse.json({ error: 'invalid score' }, { status: 400 });
    }
    payload.seconds = Math.round(seconds * 10) / 10;
  }

  let ref = db.collection(COLLECTION[mode]).doc(userId);
  let existing = await ref.get();

  // If no document found by userId, search by email to detect stale records
  // created under a different token.sub (e.g., from a previous NextAuth session).
  if (!existing.exists && email) {
    const emailSnap = await db
      .collection(COLLECTION[mode])
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!emailSnap.empty) {
      const staleDoc = emailSnap.docs[0];
      // Delete the stale document and migrate its data to the current userId.
      const staleData = staleDoc.data();
      await staleDoc.ref.delete();

      const isStaleWorse =
        (mode === 'challenge' &&
          Number(payload.stage) <= Number(staleData.stage)) ||
        (isScoreMode(mode) &&
          Number(payload.score) <= Number(staleData.score)) ||
        // 快答比完成秒數，越小越好，方向與其他模式相反
        (isQuickMathMode(mode) &&
          Number(payload.seconds) >= Number(staleData.seconds));

      const mergedPayload = isStaleWorse
        ? {
            seconds: staleData.seconds,
            totalScore: staleData.totalScore,
            stage: staleData.stage,
            score: staleData.score,
          }
        : payload;

      const safeMerged =
        mode === 'challenge'
          ? {
              stage: mergedPayload.stage,
              totalScore: mergedPayload.totalScore,
            }
          : isQuickMathMode(mode)
            ? { seconds: mergedPayload.seconds }
            : { score: mergedPayload.score };

      await ref.set({
        displayName,
        photoURL,
        email,
        ...safeMerged,
        submittedAt: isStaleWorse
          ? (staleData.submittedAt ?? new Date())
          : new Date(),
      });

      return NextResponse.json({ ok: true, updated: !isStaleWorse });
    }
  }

  if (existing.exists) {
    const old = existing.data()!;
    const isWorse =
      (mode === 'challenge' && Number(payload.stage) <= Number(old.stage)) ||
      (isScoreMode(mode) && Number(payload.score) <= Number(old.score)) ||
      // 快答比完成秒數，越小越好
      (isQuickMathMode(mode) && Number(payload.seconds) >= Number(old.seconds));
    if (isWorse) {
      return NextResponse.json({ ok: true, updated: false });
    }
  }

  const safePayload =
    mode === 'challenge'
      ? { stage: payload.stage, totalScore: payload.totalScore }
      : isQuickMathMode(mode)
        ? { seconds: payload.seconds }
        : { score: payload.score };

  await ref.set({
    displayName,
    photoURL,
    ...(email ? { email } : {}),
    ...safePayload,
    submittedAt: new Date(),
  });

  return NextResponse.json({ ok: true, updated: true });
}
