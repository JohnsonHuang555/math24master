import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/firebase-admin';

type Mode = 'normal' | 'challenge' | 'classic' | 'quickmath';

const COLLECTION: Record<Mode, string> = {
  normal: 'leaderboard_normal',
  challenge: 'leaderboard_challenge',
  classic: 'leaderboard_classic',
  quickmath: 'leaderboard_quickmath',
};

const ORDER_FIELD: Record<Mode, string> = {
  normal: 'rankingScore',
  challenge: 'stage',
  classic: 'score',
  quickmath: 'seconds',
};

const ORDER_DIR: Record<Mode, FirebaseFirestore.OrderByDirection> = {
  normal: 'desc',
  challenge: 'desc',
  classic: 'desc',
  quickmath: 'asc',
};

// 經典模式單局理論最高分：6 手 * 每手最高 11 分
const CLASSIC_MAX_SCORE = 66;

// 分數為 0 視同沒有實質成績，排行榜顯示時濾掉（資料庫仍正常寫入）
// quickmath 是完成時間制，沒有「0 分」的概念，不列入
const ZERO_FILTER_FIELD: Partial<Record<Mode, string>> = {
  classic: 'score',
  normal: 'totalScore',
  challenge: 'totalScore',
};

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('mode') as Mode | null;
  if (!mode || !COLLECTION[mode]) {
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
  const zeroField = ZERO_FILTER_FIELD[mode];

  const docs = snap.docs.filter(doc => {
    if (!zeroField) return true;
    return Number(doc.data()[zeroField] ?? 0) !== 0;
  });

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

const GUEST_ID_RE =
  /^guest_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

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

  if (!mode || !COLLECTION[mode]) {
    return NextResponse.json({ error: 'invalid mode' }, { status: 400 });
  }

  // Sanity checks + compute rankingScore for normal mode
  if (mode === 'normal') {
    const seconds = Number(payload.seconds);
    const totalScore = Number(payload.totalScore ?? 0);
    if (!Number.isFinite(seconds) || seconds < 30) {
      return NextResponse.json({ error: 'invalid score' }, { status: 400 });
    }
    if (!Number.isFinite(totalScore) || totalScore < 0 || totalScore > 10) {
      return NextResponse.json({ error: 'invalid score' }, { status: 400 });
    }
    payload.rankingScore = totalScore * 10 - seconds;
  }
  if (mode === 'challenge') {
    const stage = Number(payload.stage);
    if (!Number.isFinite(stage) || stage < 1 || stage > 500) {
      return NextResponse.json({ error: 'invalid score' }, { status: 400 });
    }
  }
  if (mode === 'classic') {
    const score = Number(payload.score);
    // 經典模式單局理論上限：牌庫 24 張 / 每手 4 張 = 6 手，
    // 每手最高 11 分（全除法 3*3=9 ＋ 2 個以上除法加成 1 ＋ 完美手 bonus 1）
    // 詳見 lib/classic-single-play-engine.ts 的 updateScore。
    if (!Number.isFinite(score) || score < 0 || score > CLASSIC_MAX_SCORE) {
      return NextResponse.json({ error: 'invalid score' }, { status: 400 });
    }
  }
  if (mode === 'quickmath') {
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
        (mode === 'normal' &&
          Number(payload.rankingScore) <= Number(staleData.rankingScore)) ||
        (mode === 'challenge' &&
          Number(payload.stage) <= Number(staleData.stage)) ||
        (mode === 'classic' &&
          Number(payload.score) <= Number(staleData.score)) ||
        // 快答比完成秒數，越小越好，方向與其他模式相反
        (mode === 'quickmath' &&
          Number(payload.seconds) >= Number(staleData.seconds));

      const mergedPayload = isStaleWorse
        ? {
            seconds: staleData.seconds,
            totalScore: staleData.totalScore,
            rankingScore: staleData.rankingScore,
            stage: staleData.stage,
            score: staleData.score,
          }
        : payload;

      const safeMerged =
        mode === 'normal'
          ? {
              seconds: mergedPayload.seconds,
              totalScore: mergedPayload.totalScore,
              rankingScore: mergedPayload.rankingScore,
            }
          : mode === 'challenge'
            ? {
                stage: mergedPayload.stage,
                totalScore: mergedPayload.totalScore,
              }
            : mode === 'quickmath'
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
      (mode === 'normal' &&
        Number(payload.rankingScore) <= Number(old.rankingScore)) ||
      (mode === 'challenge' && Number(payload.stage) <= Number(old.stage)) ||
      (mode === 'classic' && Number(payload.score) <= Number(old.score)) ||
      // 快答比完成秒數，越小越好
      (mode === 'quickmath' && Number(payload.seconds) >= Number(old.seconds));
    if (isWorse) {
      return NextResponse.json({ ok: true, updated: false });
    }
  }

  const safePayload =
    mode === 'normal'
      ? {
          seconds: payload.seconds,
          totalScore: payload.totalScore,
          rankingScore: payload.rankingScore,
        }
      : mode === 'challenge'
        ? { stage: payload.stage, totalScore: payload.totalScore }
        : mode === 'quickmath'
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
