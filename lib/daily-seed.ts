import { evaluate } from 'mathjs';
import { getTaipeiDateString } from '@/lib/date';

export type FormulaItem =
  | { type: 'number'; value: number; cardIndex: number }
  | { type: 'symbol'; value: string };

export type DailyChallengeRecord = {
  date: string;
  score: number;
  formula: FormulaItem[];
  done: boolean;
  streak: number;
  maxStreak: number;
  /** 完成 3 題的總秒數（改版後新增；舊紀錄無此欄位） */
  totalSeconds?: number;
};

type DailyRecordsMap = Record<string, DailyChallengeRecord>;

const STORAGE_KEY = 'math24_daily_records';
const SENTINEL_KEY = '__migrated';

/** 線性同餘偽隨機數產生器 */
function createSeededRandom(seed: number) {
  let s = seed >>> 0 || 1;
  return (): number => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** 遞迴暴力搜索：4 張牌能否組出 24 */
export function canMake24(nums: number[]): boolean {
  if (nums.length === 1) return Math.abs(nums[0] - 24) < 1e-6;
  for (let i = 0; i < nums.length; i++) {
    for (let j = 0; j < nums.length; j++) {
      if (i === j) continue;
      const remaining = nums.filter((_, k) => k !== i && k !== j);
      const a = nums[i];
      const b = nums[j];
      const candidates = [a + b, a - b, a * b];
      if (Math.abs(b) > 1e-8) candidates.push(a / b);
      for (const c of candidates) {
        if (canMake24([...remaining, c])) return true;
      }
    }
  }
  return false;
}

/** 每日挑戰的「今天」以台灣時區為界（全球同題） */
export function getTodayDateString(): string {
  return getTaipeiDateString();
}

function dateToSeed(dateStr: string): number {
  return (
    dateStr
      .split('')
      .reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 17) >>> 0
  );
}

function getYesterdayDateString(today: string): string {
  const d = new Date(today + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 根據今日日期產生固定的 4 張合法牌 */
export function getDailyCards(): number[] {
  const dateStr = getTodayDateString();
  const baseSeed = dateToSeed(dateStr);
  return generatePuzzleFromSeed(baseSeed);
}

function generatePuzzleFromSeed(seed: number): number[] {
  for (let attempt = 0; attempt < 500; attempt++) {
    const rng = createSeededRandom(seed + attempt * 7919);
    const cards = [
      Math.floor(rng() * 10) + 1,
      Math.floor(rng() * 10) + 1,
      Math.floor(rng() * 10) + 1,
      Math.floor(rng() * 10) + 1,
    ];
    if (canMake24(cards)) return cards;
  }
  return [1, 2, 3, 4];
}

/** 每日 3 題：同日全球 deterministic，每題各自可解 */
export function getDailyPuzzles(count = 3): number[][] {
  const baseSeed = dateToSeed(getTodayDateString());
  return Array.from({ length: count }, (_, i) =>
    generatePuzzleFromSeed((baseSeed + i * 104729) >>> 0),
  );
}

// ---------------------------------------------------------------------------
// 新 schema：統一 map（STORAGE_KEY）
// ---------------------------------------------------------------------------

function migrateOldRecords(map: DailyRecordsMap): DailyRecordsMap {
  if (SENTINEL_KEY in map) return map;

  const migrated: Record<string, unknown> = { ...map };

  // 收集舊 key，避免邊遍歷邊刪除
  const keysToMigrate: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('dailyChallenge_')) keysToMigrate.push(key);
  }

  for (const key of keysToMigrate) {
    const date = key.replace('dailyChallenge_', '');
    try {
      const oldRecord = JSON.parse(localStorage.getItem(key) ?? '{}');
      migrated[date] = {
        date,
        score: oldRecord.score ?? 0,
        formula: [],
        done: oldRecord.done ?? true,
        streak: 1,
        maxStreak: 1,
      } satisfies DailyChallengeRecord;
      localStorage.removeItem(key);
    } catch {
      // 忽略無效資料
    }
  }

  migrated[SENTINEL_KEY] = true;
  return migrated as DailyRecordsMap;
}

export function getDailyRecord(date: string): DailyChallengeRecord | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? '{}';
    const parsed = JSON.parse(raw) as DailyRecordsMap;
    const didMigrate = !(SENTINEL_KEY in parsed);
    const map = migrateOldRecords(parsed);
    // Only write back when migration actually ran
    if (didMigrate) localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    return map[date];
  } catch {
    return undefined;
  }
}

export function saveDailyRecord(
  date: string,
  score: number,
  formula: FormulaItem[],
  totalSeconds?: number,
): { streak: number; maxStreak: number } {
  if (typeof window === 'undefined') return { streak: 1, maxStreak: 1 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? '{}';
    const map = migrateOldRecords(JSON.parse(raw) as DailyRecordsMap);

    // Guard：同一天已完成，只更新 score/formula，不重算 streak
    if (map[date]?.done) {
      map[date] = {
        ...map[date],
        score,
        formula,
        totalSeconds: totalSeconds ?? map[date].totalSeconds,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
      return { streak: map[date].streak, maxStreak: map[date].maxStreak };
    }

    // 計算 streak
    const yesterday = getYesterdayDateString(date);
    const prevRecord = map[yesterday];
    const prevStreak = prevRecord?.done ? prevRecord.streak : 0;
    const streak = prevStreak + 1;

    // 計算 maxStreak（掃描全部記錄取最大值，上限 365 筆，速度可接受）
    const allRecords = Object.entries(map)
      .filter(([k]) => k !== SENTINEL_KEY)
      .map(([, v]) => v);
    const maxStreak = Math.max(
      streak,
      ...allRecords.map(r => r.maxStreak ?? 0),
    );

    map[date] = {
      date,
      score,
      formula,
      done: true,
      streak,
      maxStreak,
      totalSeconds,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    return { streak, maxStreak };
  } catch {
    return { streak: 1, maxStreak: 1 };
  }
}

// ---------------------------------------------------------------------------
// findAllSolutions：收集所有能得 24 的解法
// ---------------------------------------------------------------------------

export type Solution = {
  formula: string;
  score: number;
};

const DFS_OPS = [
  { sym: '+', fn: (a: number, b: number) => a + b },
  { sym: '-', fn: (a: number, b: number) => a - b },
  { sym: '×', fn: (a: number, b: number) => a * b },
  {
    sym: '÷',
    fn: (a: number, b: number) => (Math.abs(b) > 1e-8 ? a / b : NaN),
  },
] as const;

function scoreOps(opsUsed: string[]): number {
  const plusMinus = opsUsed.filter(o => o === '+' || o === '-').length;
  const times = opsUsed.filter(o => o === '×').length;
  const divide = opsUsed.filter(o => o === '÷').length;
  let score = plusMinus + times * 2 + divide * 3;
  if (times >= 2) score++;
  if (divide >= 2) score++;
  return score;
}

/**
 * 收集所有能得 24 的解法，按分數由高到低排序，字串去重。
 * 與 canMake24 完全獨立，不修改現有函數。
 */
export function findAllSolutions(nums: number[]): Solution[] {
  const results: Solution[] = [];
  const seen = new Set<string>();

  function dfs(
    items: Array<{ val: number; expr: string }>,
    opsUsed: string[],
  ): void {
    if (items.length === 1) {
      if (Math.abs(items[0].val - 24) < 1e-6) {
        // 移除最外層多餘括號
        const formulaStr = items[0].expr.replace(/^\((.+)\)$/, '$1');
        if (!seen.has(formulaStr)) {
          seen.add(formulaStr);
          results.push({ formula: formulaStr, score: scoreOps(opsUsed) });
        }
      }
      return;
    }

    for (let i = 0; i < items.length; i++) {
      for (let j = 0; j < items.length; j++) {
        if (i === j) continue;
        const a = items[i],
          b = items[j];
        const remaining = items.filter((_, k) => k !== i && k !== j);

        for (const op of DFS_OPS) {
          const val = op.fn(a.val, b.val);
          if (!isFinite(val)) continue;
          const expr = `(${a.expr} ${op.sym} ${b.expr})`;
          dfs([...remaining, { val, expr }], [...opsUsed, op.sym]);
        }
      }
    }
  }

  dfs(
    nums.map(n => ({ val: n, expr: String(n) })),
    [],
  );

  return results.sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// 舊 API（deprecated，保留相容性）
// ---------------------------------------------------------------------------

/** @deprecated 改用 getDailyRecord */
export function getDailyChallengeRecord(): DailyChallengeRecord | null {
  const record = getDailyRecord(getTodayDateString());
  return record ?? null;
}

/** @deprecated 改用 saveDailyRecord */
export function saveDailyChallengeRecord(score: number): void {
  saveDailyRecord(getTodayDateString(), score, []);
}

// ---------------------------------------------------------------------------
// 計分 / 評估
// ---------------------------------------------------------------------------

/** 依公式計算得分（與伺服器邏輯相同） */
export function calculateDailyScore(formula: FormulaItem[]): number {
  const ops = formula.filter(
    f => f.type === 'symbol' && f.value !== '(' && f.value !== ')',
  );
  let score = 0;
  const plusMinusCount = ops.filter(
    o => o.value === '+' || o.value === '-',
  ).length;
  const timesCount = ops.filter(o => o.value === '*').length;
  const divideCount = ops.filter(o => o.value === '/').length;
  score += plusMinusCount;
  score += timesCount * 2;
  score += divideCount * 3;
  if (timesCount >= 2) score += 1;
  if (divideCount >= 2) score += 1;
  return score;
}

/** 評估公式字串，回傳結果；算式有誤回傳 null */
export function evaluateFormula(formula: FormulaItem[]): number | null {
  const expression = formula.map(f => f.value).join('');
  try {
    const result = evaluate(expression);
    return typeof result === 'number' ? result : null;
  } catch {
    return null;
  }
}
