import { describe, expect, it } from 'vitest';
import { SelectedCard } from '@/models/SelectedCard';
import { Symbol } from '@/models/Symbol';
import { checkAnswer, isWellFormedExpression } from '../answer-check';

const IDS = ['a', 'b', 'c', 'd'];

/** 用簡寫組算式：數字寫成 'a:8'（牌 id:值），符號直接寫 */
function tokens(...parts: string[]): SelectedCard[] {
  return parts.map(part => {
    const [id, value] = part.split(':');
    if (value !== undefined) return { number: { id, value: Number(value) } };
    return { symbol: part as Symbol };
  });
}

describe('checkAnswer', () => {
  it('四張牌都用上且等於 24 即答對', () => {
    // (8 - 2) × (1 + 3)
    expect(
      checkAnswer(
        IDS,
        tokens('(', 'a:8', '-', 'b:2', ')', '*', '(', 'c:1', '+', 'd:3', ')'),
      ),
    ).toEqual({ ok: true });
  });

  it('浮點誤差在容許範圍內：8 ÷ (3 − 8 ÷ 3)', () => {
    expect(
      checkAnswer(
        IDS,
        tokens('a:8', '/', '(', 'b:3', '-', 'c:8', '/', 'd:3', ')'),
      ),
    ).toEqual({ ok: true });
  });

  it('沒有組算式', () => {
    expect(checkAnswer(IDS, [])).toEqual({ ok: false, error: 'EMPTY' });
  });

  it('沒有用滿 4 張牌（與經典、每日挑戰相同）', () => {
    expect(checkAnswer(IDS, tokens('a:4', '*', 'b:6'))).toEqual({
      ok: false,
      error: 'NOT_ALL_CARDS',
    });
  });

  it('同一張牌不能用兩次，也不能用不屬於這題的牌', () => {
    expect(
      checkAnswer(IDS, tokens('a:6', '+', 'a:6', '+', 'b:6', '+', 'c:6')),
    ).toMatchObject({ error: 'NOT_ALL_CARDS' });
    expect(
      checkAnswer(IDS, tokens('a:6', '+', 'b:6', '+', 'c:6', '+', 'x:6')),
    ).toMatchObject({ error: 'NOT_ALL_CARDS' });
  });

  it('相鄰數字不會被串成多位數（2、4 連點不等於 24）', () => {
    expect(
      checkAnswer(IDS, tokens('a:2', 'b:4', '*', 'c:3', '/', 'd:3')),
    ).toEqual({ ok: false, error: 'MALFORMED' });
  });

  it('括號相鄰不會被當成隱式乘法', () => {
    expect(
      checkAnswer(
        IDS,
        tokens('(', 'a:1', '+', 'b:2', ')', '(', 'c:3', '+', 'd:5', ')'),
      ),
    ).toEqual({ ok: false, error: 'MALFORMED' });
  });

  it('括號不平衡、符號結尾都算算式有誤', () => {
    expect(
      checkAnswer(IDS, tokens('(', 'a:6', '+', 'b:6', '+', 'c:6', '+', 'd:6')),
    ).toMatchObject({ error: 'MALFORMED' });
    expect(
      checkAnswer(IDS, tokens('a:6', '+', 'b:6', '+', 'c:6', '+', 'd:6', '+')),
    ).toMatchObject({ error: 'MALFORMED' });
  });

  it('除以零不會丟錯', () => {
    expect(
      checkAnswer(
        IDS,
        tokens('a:6', '/', '(', 'b:3', '-', 'c:3', ')', '*', 'd:4'),
      ),
    ).toEqual({ ok: false, error: 'MALFORMED' });
  });

  it('結果不是 24 時回傳算出的值（四捨五入到小數兩位）', () => {
    expect(
      checkAnswer(IDS, tokens('a:1', '+', 'b:2', '+', 'c:3', '/', 'd:7')),
    ).toEqual({ ok: false, error: 'NOT_24', value: 3.43 });
  });
});

describe('isWellFormedExpression', () => {
  it('數字與符號交替、括號平衡', () => {
    expect(isWellFormedExpression(tokens('a:1', '+', 'b:2'))).toBe(true);
    expect(isWellFormedExpression(tokens('(', 'a:1', ')'))).toBe(true);
    expect(isWellFormedExpression(tokens(')', 'a:1', '('))).toBe(false);
    expect(isWellFormedExpression(tokens('+', 'a:1'))).toBe(false);
    expect(isWellFormedExpression(tokens('a:1', '(', 'b:2', ')'))).toBe(false);
  });
});
