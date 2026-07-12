import { describe, expect, it } from 'vitest';
import {
  Op,
  TOTAL_QUESTIONS,
  evaluateWithConstraints,
  generateQuestion,
  generateQuestionSet,
  getTierForIndex,
} from './quick-math-generator';

describe('getTierForIndex', () => {
  it('maps question index to increasing tiers', () => {
    expect([0, 1, 2].map(getTierForIndex)).toEqual([1, 1, 1]);
    expect([3, 4, 5, 6].map(getTierForIndex)).toEqual([2, 2, 2, 2]);
    expect([7, 8, 9].map(getTierForIndex)).toEqual([3, 3, 3]);
  });
});

describe('evaluateWithConstraints', () => {
  it('follows multiplication/division precedence', () => {
    // 5 + 10 * 2 - 8 = 17
    expect(evaluateWithConstraints([5, 10, 2, 8], ['+', '*', '-'])).toBe(17);
  });

  it('rejects non-exact division', () => {
    expect(evaluateWithConstraints([7, 2], ['/'])).toBeNull();
  });

  it('rejects negative running prefix even if final answer is valid', () => {
    // 3 - 8 + 10 = 5，但 prefix 3-8 = -5
    expect(evaluateWithConstraints([3, 8, 10], ['-', '+'])).toBeNull();
  });

  it('rejects intermediate values above 100', () => {
    // 11 * 11 = 121
    expect(evaluateWithConstraints([11, 11, 100], ['*', '-'])).toBeNull();
  });
});

describe('generateQuestionSet', () => {
  const RUNS = 500;

  it('generates valid questions across many runs', () => {
    for (let run = 0; run < RUNS; run++) {
      const questions = generateQuestionSet();
      expect(questions).toHaveLength(TOTAL_QUESTIONS);

      questions.forEach((q, i) => {
        // 答案為 0-100 整數，且與獨立求值一致
        expect(Number.isInteger(q.answer)).toBe(true);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThanOrEqual(100);
        expect(evaluateWithConstraints(q.operands, q.operators)).toBe(q.answer);

        // 難度模板：題 1-3 兩運算元、4-7 三運算元、8-10 四運算元
        const tier = getTierForIndex(i);
        expect(q.operands).toHaveLength(tier + 1);
        expect(q.operators).toHaveLength(tier);

        // tier 2/3 必含乘除
        if (tier >= 2) {
          expect(q.operators.some(op => op === '*' || op === '/')).toBe(true);
        }

        // 乘法相鄰運算元 ≤ 12
        q.operators.forEach((op: Op, j: number) => {
          if (op === '*') {
            expect(q.operands[j]).toBeLessThanOrEqual(12);
            expect(q.operands[j + 1]).toBeLessThanOrEqual(12);
          }
        });
      });
    }
  });

  it('display uses ×÷− symbols instead of */-', () => {
    const q = generateQuestion(3);
    expect(q.display).not.toMatch(/[*/]/);
    const parts = q.display.split(' ');
    expect(parts).toHaveLength(q.operands.length + q.operators.length);
  });
});
