import { evaluate } from 'mathjs';

export type FormulaItem =
  | { type: 'number'; value: number; cardIndex: number }
  | { type: 'symbol'; value: string };

/** 線性同餘偽隨機數產生器 */
function createSeededRandom(seed: number) {
  let s = (seed >>> 0) || 1;
  return (): number => {
    s = ((s * 1664525 + 1013904223) >>> 0);
    return s / 0x100000000;
  };
}

/** 遞迴暴力搜索：4 張牌能否組出 24 */
function canMake24(nums: number[]): boolean {
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

export function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function dateToSeed(dateStr: string): number {
  return (
    dateStr
      .split('')
      .reduce((acc, c) => ((acc * 31 + c.charCodeAt(0)) | 0), 17) >>> 0
  );
}

/** 根據今日日期產生固定的 4 張合法牌 */
export function getDailyCards(): number[] {
  const dateStr = getTodayDateString();
  const baseSeed = dateToSeed(dateStr);

  for (let attempt = 0; attempt < 500; attempt++) {
    const rng = createSeededRandom(baseSeed + attempt * 7919);
    const cards = [
      Math.floor(rng() * 10) + 1,
      Math.floor(rng() * 10) + 1,
      Math.floor(rng() * 10) + 1,
      Math.floor(rng() * 10) + 1,
    ];
    if (canMake24(cards)) return cards;
  }

  return [1, 2, 3, 4]; // fallback（永遠有解）
}

export function getDailyChallengeKey(): string {
  return `dailyChallenge_${getTodayDateString()}`;
}

export type DailyChallengeRecord = {
  score: number;
  done: boolean;
  date: string;
};

export function getDailyChallengeRecord(): DailyChallengeRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(getDailyChallengeKey());
    if (!stored) return null;
    return JSON.parse(stored) as DailyChallengeRecord;
  } catch {
    return null;
  }
}

export function saveDailyChallengeRecord(score: number): void {
  if (typeof window === 'undefined') return;
  const record: DailyChallengeRecord = {
    score,
    done: true,
    date: getTodayDateString(),
  };
  localStorage.setItem(getDailyChallengeKey(), JSON.stringify(record));
}

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
