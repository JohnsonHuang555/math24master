import { auth } from '@/auth';
import { db } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

type Mode = 'normal' | 'challenge' | 'classic';

const COLLECTION: Record<Mode, string> = {
  normal: 'leaderboard_normal',
  challenge: 'leaderboard_challenge',
  classic: 'leaderboard_classic',
};

const ORDER_FIELD: Record<Mode, string> = {
  normal: 'rankingScore',
  challenge: 'stage',
  classic: 'score',
};

const ORDER_DIR: Record<Mode, FirebaseFirestore.OrderByDirection> = {
  normal: 'desc',
  challenge: 'desc',
  classic: 'desc',
};

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('mode') as Mode | null;
  if (!mode || !COLLECTION[mode]) {
    return NextResponse.json({ error: 'invalid mode' }, { status: 400 });
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 100), 100);

  const snap = await db
    .collection(COLLECTION[mode])
    .orderBy(ORDER_FIELD[mode], ORDER_DIR[mode])
    .limit(limit)
    .get();

  const rows = snap.docs.map((doc, i) => ({
    rank: i + 1,
    userId: doc.id,
    ...doc.data(),
    submittedAt: doc.data().submittedAt?.toDate?.()?.toISOString() ?? null,
  }));

  return NextResponse.json(rows, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: 'no user id' }, { status: 400 });
  }

  const body = await req.json();
  const { mode, payload } = body as { mode: Mode; payload: Record<string, unknown> };

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
    if (!Number.isFinite(score) || score < 0 || score > 5000) {
      return NextResponse.json({ error: 'invalid score' }, { status: 400 });
    }
  }

  const ref = db.collection(COLLECTION[mode]).doc(userId);
  const existing = await ref.get();

  if (existing.exists) {
    const old = existing.data()!;
    const isWorse =
      (mode === 'normal' && Number(payload.rankingScore) <= Number(old.rankingScore)) ||
      (mode === 'challenge' && Number(payload.stage) <= Number(old.stage)) ||
      (mode === 'classic' && Number(payload.score) <= Number(old.score));
    if (isWorse) {
      return NextResponse.json({ ok: true, updated: false });
    }
  }

  const safePayload =
    mode === 'normal'
      ? { seconds: payload.seconds, totalScore: payload.totalScore, rankingScore: payload.rankingScore }
      : mode === 'challenge'
      ? { stage: payload.stage, totalScore: payload.totalScore }
      : { score: payload.score };

  await ref.set({
    displayName: session.user.name ?? 'Anonymous',
    photoURL: session.user.image ?? null,
    ...safePayload,
    submittedAt: new Date(),
  });

  return NextResponse.json({ ok: true, updated: true });
}
