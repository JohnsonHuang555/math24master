/**
 * 快速試玩／新手引導的本機紀錄（不需要登入）。
 * localStorage 不可用（無痕模式、被封鎖）時一律當成第一次玩，不影響遊戲。
 */
const STORAGE_KEY = 'math24_onboarding_v1';

export type OnboardingRecord = {
  /** 第一次完成三題引導的時間（ISO） */
  completedAt?: string;
  /** 完成三題的最快耗時（毫秒） */
  bestMs?: number;
  /** 玩家已關閉操作提示 */
  tipsDismissed?: boolean;
  /** 這台裝置第一次在快速試玩答對的時間（ISO），用於 first_puzzle_solved 只送一次 */
  firstSolvedAt?: string;
};

export function loadOnboarding(): OnboardingRecord {
  if (typeof window === 'undefined') return {};
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '{}',
    );
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    const r = parsed as Record<string, unknown>;
    return {
      completedAt:
        typeof r.completedAt === 'string' ? r.completedAt : undefined,
      bestMs:
        typeof r.bestMs === 'number' && Number.isFinite(r.bestMs)
          ? r.bestMs
          : undefined,
      tipsDismissed: r.tipsDismissed === true,
      firstSolvedAt:
        typeof r.firstSolvedAt === 'string' ? r.firstSolvedAt : undefined,
    };
  } catch {
    return {};
  }
}

function save(patch: OnboardingRecord): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...loadOnboarding(), ...patch }),
    );
  } catch {
    // localStorage 不可用時靜默失敗
  }
}

export function dismissOnboardingTips(): void {
  save({ tipsDismissed: true });
}

/** 記下第一次答對；回傳這次是不是這台裝置的第一次 */
export function markFirstPuzzleSolved(now = new Date()): boolean {
  if (loadOnboarding().firstSolvedAt) return false;
  save({ firstSolvedAt: now.toISOString() });
  return true;
}

/** 完成一輪三題：保留第一次完成的時間，更新最快耗時 */
export function markOnboardingCompleted(
  durationMs: number,
  now = new Date(),
): void {
  const current = loadOnboarding();
  save({
    completedAt: current.completedAt ?? now.toISOString(),
    bestMs:
      current.bestMs === undefined
        ? durationMs
        : Math.min(current.bestMs, durationMs),
  });
}
