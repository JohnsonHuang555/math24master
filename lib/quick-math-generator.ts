// 心算快答出題器
// 產生符合約束的隨機四則運算題：
// - 標準先乘除後加減、無括號
// - 除法保證整除
// - 所有中間值（乘除連段逐步值、加減 running sum）與答案皆為 0-100 整數
// - 乘法相鄰運算元 ≤ 12

export type Op = '+' | '-' | '*' | '/';
export type Tier = 1 | 2 | 3;

export interface QuickMathQuestion {
  operands: number[];
  operators: Op[];
  answer: number;
  display: string; // 例："5 + 10 × 2 − 8"
}

export const TOTAL_QUESTIONS = 10;

const MAX_VALUE = 100;
const MAX_ATTEMPTS = 100;

type TierConfig = {
  operandCount: number;
  requireMulDiv: boolean;
  addRange: [number, number];
  mulRange: [number, number];
  opWeights: Array<{ op: Op; w: number }>;
};

const TIER_CONFIG: Record<Tier, TierConfig> = {
  1: {
    operandCount: 2,
    requireMulDiv: false,
    addRange: [1, 20],
    mulRange: [2, 9],
    opWeights: [
      { op: '+', w: 4 },
      { op: '-', w: 4 },
      { op: '*', w: 2 },
    ],
  },
  2: {
    operandCount: 3,
    requireMulDiv: true,
    addRange: [1, 20],
    mulRange: [2, 12],
    opWeights: [
      { op: '+', w: 3 },
      { op: '-', w: 3 },
      { op: '*', w: 2 },
      { op: '/', w: 2 },
    ],
  },
  3: {
    operandCount: 4,
    requireMulDiv: true,
    addRange: [1, 20],
    mulRange: [2, 12],
    opWeights: [
      { op: '+', w: 3 },
      { op: '-', w: 3 },
      { op: '*', w: 2 },
      { op: '/', w: 2 },
    ],
  },
};

// 題目 index（0-9）對應難度：1-3 題易、4-7 題中、8-10 題難
export function getTierForIndex(index: number): Tier {
  if (index <= 2) return 1;
  if (index <= 6) return 2;
  return 3;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickWeighted(weights: Array<{ op: Op; w: number }>): Op {
  const total = weights.reduce((sum, x) => sum + x.w, 0);
  let r = Math.random() * total;
  for (const { op, w } of weights) {
    r -= w;
    if (r < 0) return op;
  }
  return weights[weights.length - 1].op;
}

// runValue 在 2..12 之間的因數（除法只從這裡挑除數 = 整除保證）
function smallDivisors(value: number): number[] {
  const result: number[] = [];
  for (let d = 2; d <= 12; d++) {
    if (value % d === 0 && value / d >= 1) result.push(d);
  }
  return result;
}

// 獨立的兩階段求值 + 逐步約束檢查（與建構過程無關，供複驗與測試用）
// 違反任一約束回傳 null
export function evaluateWithConstraints(
  operands: number[],
  operators: Op[],
): number | null {
  if (operands.length !== operators.length + 1) return null;
  if (operands.some(n => !Number.isInteger(n) || n < 1 || n > MAX_VALUE)) {
    return null;
  }

  // 第一階段：把每個 ×÷ 連段收斂成 term，逐步檢查
  const terms: number[] = [];
  const signs: number[] = [1];
  let run = operands[0];
  for (let i = 0; i < operators.length; i++) {
    const op = operators[i];
    const next = operands[i + 1];
    if (op === '*') {
      run *= next;
    } else if (op === '/') {
      if (next === 0 || run % next !== 0) return null;
      run /= next;
    } else {
      terms.push(run);
      signs.push(op === '+' ? 1 : -1);
      run = next;
      continue;
    }
    if (!Number.isInteger(run) || run < 0 || run > MAX_VALUE) return null;
  }
  terms.push(run);

  // 第二階段：加減 running sum，每個 prefix 都須在 [0, 100]
  let sum = 0;
  for (let i = 0; i < terms.length; i++) {
    sum += signs[i] * terms[i];
    if (sum < 0 || sum > MAX_VALUE) return null;
  }
  return sum;
}

function buildDisplay(operands: number[], operators: Op[]): string {
  const symbolMap: Record<Op, string> = {
    '+': '+',
    '-': '−',
    '*': '×',
    '/': '÷',
  };
  const parts: string[] = [String(operands[0])];
  operators.forEach((op, i) => {
    parts.push(symbolMap[op], String(operands[i + 1]));
  });
  return parts.join(' ');
}

// 建構式生成一次嘗試：運算子先定，運算元沿途取（除數只挑因數），失敗回 null
function tryGenerate(config: TierConfig): QuickMathQuestion | null {
  const opCount = config.operandCount - 1;
  const operators: Op[] = [];
  for (let i = 0; i < opCount; i++) {
    operators.push(pickWeighted(config.opWeights));
  }
  if (config.requireMulDiv && !operators.some(op => op === '*' || op === '/')) {
    operators[randInt(0, opCount - 1)] = Math.random() < 0.5 ? '*' : '/';
  }

  const operands: number[] = [];
  let runValue = 0;

  for (let i = 0; i < config.operandCount; i++) {
    const prevOp: Op | null = i === 0 ? null : operators[i - 1];
    const nextOp: Op | null = i < opCount ? operators[i] : null;

    if (prevOp === null || prevOp === '+' || prevOp === '-') {
      // 連段開頭
      let value: number;
      if (nextOp === '*') {
        value = randInt(config.mulRange[0], config.mulRange[1]);
      } else if (nextOp === '/') {
        // 先挑除數 d 與商 q，開頭值 = d*q，保證之後有因數可挑
        const d = randInt(2, 12);
        const q = randInt(2, Math.min(12, Math.floor(MAX_VALUE / d)));
        value = d * q;
      } else {
        value = randInt(config.addRange[0], config.addRange[1]);
      }
      operands.push(value);
      runValue = value;
    } else if (prevOp === '*') {
      const cap = Math.min(
        config.mulRange[1],
        Math.floor(MAX_VALUE / Math.max(runValue, 1)),
      );
      if (cap < config.mulRange[0]) return null;
      const m = randInt(config.mulRange[0], cap);
      operands.push(m);
      runValue *= m;
    } else {
      // prevOp === '/'
      const candidates = smallDivisors(runValue);
      if (candidates.length === 0) return null;
      const d = candidates[randInt(0, candidates.length - 1)];
      operands.push(d);
      runValue /= d;
    }

    if (!Number.isInteger(runValue) || runValue < 0 || runValue > MAX_VALUE) {
      return null;
    }
    // 乘法相鄰運算元 ≤ 12
    if (
      (nextOp === '*' || prevOp === '*') &&
      operands[operands.length - 1] > 12
    ) {
      return null;
    }
  }

  // 獨立複驗（含加減 prefix 非負檢查）
  const answer = evaluateWithConstraints(operands, operators);
  if (answer === null) return null;

  return {
    operands,
    operators,
    answer,
    display: buildDisplay(operands, operators),
  };
}

// retry 耗盡時的固定模板題（按同約束直接建構，永不失敗）
function fallbackQuestion(tier: Tier): QuickMathQuestion {
  let operands: number[];
  let operators: Op[];
  if (tier === 1) {
    operands = [randInt(1, 20), randInt(1, 20)];
    operators = ['+'];
  } else if (tier === 2) {
    const a = randInt(2, 9);
    const b = randInt(2, 9);
    operands = [a, b, randInt(1, Math.min(20, MAX_VALUE - a * b))];
    operators = ['*', '+'];
  } else {
    const a = randInt(2, 9);
    const b = randInt(2, 9);
    const c = randInt(1, Math.min(20, MAX_VALUE - a * b));
    const d = randInt(1, a * b + c);
    operands = [a, b, c, d];
    operators = ['*', '+', '-'];
  }
  const answer = evaluateWithConstraints(operands, operators);
  return {
    operands,
    operators,
    answer: answer ?? 0,
    display: buildDisplay(operands, operators),
  };
}

export function generateQuestion(tier: Tier): QuickMathQuestion {
  const config = TIER_CONFIG[tier];
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const question = tryGenerate(config);
    if (question) return question;
  }
  return fallbackQuestion(tier);
}

export function generateQuestionSet(): QuickMathQuestion[] {
  return Array.from({ length: TOTAL_QUESTIONS }, (_, i) =>
    generateQuestion(getTierForIndex(i)),
  );
}
