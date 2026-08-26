// 心算快答出題器
// 產生符合約束的隨機四則運算題：
// - 標準先乘除後加減、無括號
// - 除法保證整除
// - 所有中間值（乘除連段逐步值、加減 running sum）與答案皆為 0-100 整數
// - 乘法相鄰運算元 ≤ 12
//
// Advanced Mode 額外混入 Advanced Operator（平方／階乘／根號），
// 詳見 CONTEXT.md 與 docs/adr/0001-advanced-operator-single-operand-only.md：
// 只套用在單一原始操作數上，不產生巢狀括號。

export type Op = '+' | '-' | '*' | '/';
export type Tier = 1 | 2 | 3;
export type QuickMathMode = 'basic' | 'advanced';
export type UnaryOp = 'square' | 'factorial' | 'sqrt';

// Advanced Operator 套用紀錄：operandIndex 對應 operands[] 的位置，
// base 是顯示用的原始數字（square/factorial 是底數，sqrt 是被開方數），
// operands[operandIndex] 存的則是套用後、實際參與四則運算的數值。
export interface UnaryApplication {
  operandIndex: number;
  op: UnaryOp;
  base: number;
}

export interface QuickMathQuestion {
  operands: number[];
  operators: Op[];
  answer: number;
  display: string; // 例："5 + 10 × 2 − 8" 或 "3² + 5"
  unary: UnaryApplication | null;
}

export const TOTAL_QUESTIONS = 10;

const MAX_VALUE = 100;
const MAX_ATTEMPTS = 100;

// Advanced Mode 各 Tier 混入 Advanced Operator 的機率。
// 套用位置僅限「前後都不是 ×÷」的操作數（見 findEligibleUnaryIndexes），越多運算元、
// 越常強制出現乘除（Tier2/3 的 requireMulDiv），符合套用條件的位置比例就越低，
// 這裡設定的是「意圖機率」，不是實際顯示機率，兩者有落差、且落差隨 Tier 加大。
// 玩家實測回饋「前三題明顯偏簡單」後，依實測顯示機率（見下方每個 Tier 的註解）
// 反推調整，讓三個 Tier 的實際顯示機率呈現 ~56% → ~68% → ~73% 的遞增曲線
const ADVANCED_TIER_PROBABILITY: Record<Tier, number> = {
  1: 0.75, // 意圖機率 0.75 → 實測顯示機率 ~56%（原 0.2 只有 ~16%）
  2: 0.85, // 意圖機率 0.85 → 實測顯示機率 ~68%（原 0.4 只有 ~31%）
  3: 0.9, // 意圖機率 0.9 → 實測顯示機率 ~73%（原 0.6 只有 ~48%）
};

const ADVANCED_OPS: UnaryOp[] = ['square', 'factorial', 'sqrt'];
const FACTORIALS = [1, 1, 2, 6, 24]; // 0!..4!

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

// 依 Advanced Operator 產生底數與套用後的實際運算值
// square: 底數 0-10 → 值 0-100；factorial: 底數 0-4 → 值 1-24；
// sqrt: 只允許完全平方數，底數（被開方數）= 開根後的值²
function generateUnaryValue(op: UnaryOp): { value: number; base: number } {
  if (op === 'square') {
    const base = randInt(0, 10);
    return { value: base * base, base };
  }
  if (op === 'factorial') {
    const base = randInt(0, 4);
    return { value: FACTORIALS[base], base };
  }
  // sqrt：base 是顯示用的被開方數，value 是開根後參與運算的值
  const root = randInt(1, 10);
  return { value: root, base: root * root };
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

function renderOperand(
  operands: number[],
  index: number,
  unary: UnaryApplication | null,
): string {
  if (unary && unary.operandIndex === index) {
    if (unary.op === 'square') return `${unary.base}²`;
    if (unary.op === 'factorial') return `${unary.base}!`;
    return `√${unary.base}`;
  }
  return String(operands[index]);
}

function buildDisplay(
  operands: number[],
  operators: Op[],
  unary: UnaryApplication | null,
): string {
  const symbolMap: Record<Op, string> = {
    '+': '+',
    '-': '−',
    '*': '×',
    '/': '÷',
  };
  const parts: string[] = [renderOperand(operands, 0, unary)];
  operators.forEach((op, i) => {
    parts.push(symbolMap[op], renderOperand(operands, i + 1, unary));
  });
  return parts.join(' ');
}

// 找出可以套用 Advanced Operator 的操作數位置：
// 必須是「單獨一個 term」（前後都不是 ×÷），才不會影響乘除連段的整除／範圍約束
function findEligibleUnaryIndexes(
  operandCount: number,
  operators: Op[],
): number[] {
  const opCount = operators.length;
  const eligible: number[] = [];
  for (let i = 0; i < operandCount; i++) {
    const prevOp: Op | null = i === 0 ? null : operators[i - 1];
    const nextOp: Op | null = i < opCount ? operators[i] : null;
    const isConnectorStart =
      prevOp === null || prevOp === '+' || prevOp === '-';
    const isStandalone = nextOp === null || nextOp === '+' || nextOp === '-';
    if (isConnectorStart && isStandalone) eligible.push(i);
  }
  return eligible;
}

// 建構式生成一次嘗試：運算子先定，運算元沿途取（除數只挑因數），失敗回 null
// wantUnary：Advanced Mode 依機率決定「這題想不想混入 Advanced Operator」；
// 若找不到合適的操作數位置，就當作一般題目生成（機率是軟性的，不強制保證）
function tryGenerate(
  config: TierConfig,
  wantUnary: boolean,
): QuickMathQuestion | null {
  const opCount = config.operandCount - 1;
  const operators: Op[] = [];
  for (let i = 0; i < opCount; i++) {
    operators.push(pickWeighted(config.opWeights));
  }
  if (config.requireMulDiv && !operators.some(op => op === '*' || op === '/')) {
    operators[randInt(0, opCount - 1)] = Math.random() < 0.5 ? '*' : '/';
  }

  let unaryPlan: { index: number; op: UnaryOp } | null = null;
  if (wantUnary) {
    const eligible = findEligibleUnaryIndexes(config.operandCount, operators);
    if (eligible.length > 0) {
      const index = eligible[randInt(0, eligible.length - 1)];
      const op = ADVANCED_OPS[randInt(0, ADVANCED_OPS.length - 1)];
      unaryPlan = { index, op };
    }
  }

  const operands: number[] = [];
  let runValue = 0;
  let appliedUnary: UnaryApplication | null = null;

  for (let i = 0; i < config.operandCount; i++) {
    const prevOp: Op | null = i === 0 ? null : operators[i - 1];
    const nextOp: Op | null = i < opCount ? operators[i] : null;

    if (prevOp === null || prevOp === '+' || prevOp === '-') {
      // 連段開頭
      let value: number;
      if (unaryPlan && unaryPlan.index === i) {
        const { value: unaryValue, base } = generateUnaryValue(unaryPlan.op);
        value = unaryValue;
        appliedUnary = { operandIndex: i, op: unaryPlan.op, base };
      } else if (nextOp === '*') {
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
    display: buildDisplay(operands, operators, appliedUnary),
    unary: appliedUnary,
  };
}

// retry 耗盡時的固定模板題（按同約束直接建構，永不失敗；不含 Advanced Operator）
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
    display: buildDisplay(operands, operators, null),
    unary: null,
  };
}

export function generateQuestion(
  tier: Tier,
  mode: QuickMathMode = 'basic',
): QuickMathQuestion {
  const config = TIER_CONFIG[tier];
  const wantUnary =
    mode === 'advanced' && Math.random() < ADVANCED_TIER_PROBABILITY[tier];
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const question = tryGenerate(config, wantUnary);
    if (question) return question;
  }
  return fallbackQuestion(tier);
}

export function generateQuestionSet(
  mode: QuickMathMode = 'basic',
): QuickMathQuestion[] {
  return Array.from({ length: TOTAL_QUESTIONS }, (_, i) =>
    generateQuestion(getTierForIndex(i), mode),
  );
}
