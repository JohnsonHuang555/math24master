import { describe, expect, it } from 'vitest';
import {
  ALL_CARDS,
  LINE_CLUE_CARDS,
  applyClue,
  calcClueResult,
  drawCards,
  getGuessRating,
  getInitialRemaining,
} from './guess-number';
import type { LineClueCard } from './guess-number';

const card = (id: LineClueCard['id']): LineClueCard =>
  LINE_CLUE_CARDS.find(c => c.id === id)!;

describe('applyClue — 空陣列 guard', () => {
  it('returns [] when remaining is empty', () => {
    expect(applyClue([], card('odd-even'), 'yes')).toEqual([]);
    expect(applyClue([], card('half'), 'no')).toEqual([]);
  });
});

describe('applyClue — 陰陽雙極', () => {
  const all = getInitialRemaining();

  it('yes → keep odd (45 numbers)', () => {
    const result = applyClue(all, card('odd-even'), 'yes');
    expect(result).toHaveLength(45);
    expect(result.every(n => n % 2 !== 0)).toBe(true);
  });

  it('no → keep even (45 numbers)', () => {
    const result = applyClue(all, card('odd-even'), 'no');
    expect(result).toHaveLength(45);
    expect(result.every(n => n % 2 === 0)).toBe(true);
  });
});

describe('applyClue — 半壁江山', () => {
  const all = getInitialRemaining();

  it('yes → keep >50 (49 numbers)', () => {
    const result = applyClue(all, card('half'), 'yes');
    expect(result).toHaveLength(49);
    expect(result.every(n => n > 50)).toBe(true);
  });

  it('no → keep <=50, boundary 50 included (41 numbers)', () => {
    const result = applyClue(all, card('half'), 'no');
    expect(result).toHaveLength(41);
    expect(result).toContain(50);
    expect(result.every(n => n <= 50)).toBe(true);
  });
});

describe('applyClue — 三陽開泰', () => {
  const all = getInitialRemaining();

  it('yes → keep multiples of 3 (30 numbers)', () => {
    const result = applyClue(all, card('triple'), 'yes');
    expect(result).toHaveLength(30);
    expect(result.every(n => n % 3 === 0)).toBe(true);
  });

  it('no → keep non-multiples of 3 (60 numbers)', () => {
    const result = applyClue(all, card('triple'), 'no');
    expect(result).toHaveLength(60);
    expect(result.every(n => n % 3 !== 0)).toBe(true);
  });
});

describe('applyClue — 複製貼上', () => {
  const all = getInitialRemaining();

  it('yes → keep repeated digits 11,22,...,99 (9 numbers)', () => {
    const result = applyClue(all, card('repeat'), 'yes');
    expect(result).toHaveLength(9);
    expect(result).toEqual([11, 22, 33, 44, 55, 66, 77, 88, 99]);
  });

  it('no → keep different digits (81 numbers)', () => {
    const result = applyClue(all, card('repeat'), 'no');
    expect(result).toHaveLength(81);
    expect(result).not.toContain(11);
    expect(result).not.toContain(99);
  });
});

describe('applyClue — 個位偵測', () => {
  const all = getInitialRemaining();

  it('yes → keep last digit >5 (36 numbers)', () => {
    const result = applyClue(all, card('last-digit'), 'yes');
    expect(result).toHaveLength(36);
    expect(result.every(n => n % 10 > 5)).toBe(true);
  });

  it('no → keep last digit <=5, boundary 0 included for 10,20,...,90 (54 numbers)', () => {
    const result = applyClue(all, card('last-digit'), 'no');
    expect(result).toHaveLength(54);
    expect(result.every(n => n % 10 <= 5)).toBe(true);
    expect(result).toContain(10);
    expect(result).toContain(20);
    expect(result).toContain(90);
  });
});

describe('applyClue — 十位奇偶', () => {
  const all = getInitialRemaining();

  // tens digit 1,3,5,7,9 → 5 groups × 10 = 50; tens digit 2,4,6,8 → 4 groups × 10 = 40
  it('yes → keep tens digit odd (50 numbers)', () => {
    const result = applyClue(all, card('tens-odd-even'), 'yes');
    expect(result).toHaveLength(50);
    expect(result.every(n => Math.floor(n / 10) % 2 !== 0)).toBe(true);
  });

  it('no → keep tens digit even (40 numbers)', () => {
    const result = applyClue(all, card('tens-odd-even'), 'no');
    expect(result).toHaveLength(40);
    expect(result.every(n => Math.floor(n / 10) % 2 === 0)).toBe(true);
  });
});

describe('applyClue — 數位加總', () => {
  const all = getInitialRemaining();

  it('yes → digit sum >10 (36 numbers)', () => {
    const result = applyClue(all, card('digit-sum-gt10'), 'yes');
    expect(result).toHaveLength(36);
    expect(result.every(n => Math.floor(n / 10) + (n % 10) > 10)).toBe(true);
  });

  it('no → digit sum <=10, boundary 10 included (54 numbers)', () => {
    const result = applyClue(all, card('digit-sum-gt10'), 'no');
    expect(result).toHaveLength(54);
    expect(result.every(n => Math.floor(n / 10) + (n % 10) <= 10)).toBe(true);
    expect(result).toContain(10);
    expect(result).toContain(19);
  });
});

describe('applyClue — 六十門檻', () => {
  const all = getInitialRemaining();

  it('yes → keep >=60 (40 numbers)', () => {
    const result = applyClue(all, card('sixty-plus'), 'yes');
    expect(result).toHaveLength(40);
    expect(result.every(n => n >= 60)).toBe(true);
    expect(result).toContain(60);
  });

  it('no → keep <60 (50 numbers)', () => {
    const result = applyClue(all, card('sixty-plus'), 'no');
    expect(result).toHaveLength(50);
    expect(result.every(n => n < 60)).toBe(true);
    expect(result).toContain(59);
    expect(result).not.toContain(60);
  });
});

describe('applyClue — 五的倍數', () => {
  const all = getInitialRemaining();

  it('yes → keep multiples of 5 (18 numbers)', () => {
    const result = applyClue(all, card('multiple-5'), 'yes');
    expect(result).toHaveLength(18);
    expect(result.every(n => n % 5 === 0)).toBe(true);
    expect(result).toContain(10);
    expect(result).toContain(95);
  });

  it('no → keep non-multiples of 5 (72 numbers)', () => {
    const result = applyClue(all, card('multiple-5'), 'no');
    expect(result).toHaveLength(72);
    expect(result.every(n => n % 5 !== 0)).toBe(true);
  });
});

describe('applyClue — 位數比較', () => {
  const all = getInitialRemaining();

  it('yes → tens > ones (45 numbers)', () => {
    const result = applyClue(all, card('tens-gt-ones'), 'yes');
    expect(result).toHaveLength(45);
    expect(result.every(n => Math.floor(n / 10) > n % 10)).toBe(true);
    expect(result).toContain(10);
    expect(result).toContain(91);
  });

  it('no → tens <= ones (45 numbers)', () => {
    const result = applyClue(all, card('tens-gt-ones'), 'no');
    expect(result).toHaveLength(45);
    expect(result.every(n => Math.floor(n / 10) <= n % 10)).toBe(true);
    expect(result).toContain(19);
    expect(result).toContain(99);
  });
});

describe('applyClue — 雙奇組合', () => {
  const all = getInitialRemaining();

  it('yes → both digits odd (25 numbers)', () => {
    const result = applyClue(all, card('both-odd'), 'yes');
    expect(result).toHaveLength(25);
    expect(
      result.every(
        n => Math.floor(n / 10) % 2 !== 0 && n % 10 % 2 !== 0,
      ),
    ).toBe(true);
    expect(result).toContain(11);
    expect(result).toContain(99);
  });

  it('no → not both digits odd (65 numbers)', () => {
    const result = applyClue(all, card('both-odd'), 'no');
    expect(result).toHaveLength(65);
    expect(result).not.toContain(11);
    expect(result).not.toContain(99);
  });
});

describe('applyClue — 多條線索交集', () => {
  it('odd-even(yes) + half(yes) → odd AND >50 (25 numbers)', () => {
    const all = getInitialRemaining();
    const afterOdd = applyClue(all, card('odd-even'), 'yes');
    const result = applyClue(afterOdd, card('half'), 'yes');
    expect(result).toHaveLength(25);
    expect(result.every(n => n % 2 !== 0 && n > 50)).toBe(true);
  });

  it('triple(yes) + last-digit(no) → multiple of 3 AND last digit <=5 (18 numbers)', () => {
    const all = getInitialRemaining();
    const afterTriple = applyClue(all, card('triple'), 'yes');
    const result = applyClue(afterTriple, card('last-digit'), 'no');
    expect(result).toHaveLength(18);
    expect(result.every(n => n % 3 === 0 && n % 10 <= 5)).toBe(true);
  });
});

describe('drawCards', () => {
  it('always returns exactly 3 cards', () => {
    expect(drawCards([], false)).toHaveLength(3);
    expect(drawCards([], true)).toHaveLength(3);
  });

  it('peekUsed=true → no peek card in 200 draws', () => {
    for (let i = 0; i < 200; i++) {
      expect(drawCards([], true).every(c => c.id !== 'peek')).toBe(true);
    }
  });

  it('peekUsed=false → peek can appear in 500 draws', () => {
    let peekFound = false;
    for (let i = 0; i < 500; i++) {
      if (drawCards([], false).some(c => c.id === 'peek')) {
        peekFound = true;
        break;
      }
    }
    expect(peekFound).toBe(true);
  });

  it('usedIds excludes those cards from pool in 200 draws', () => {
    const usedIds = ['odd-even', 'half', 'triple', 'repeat', 'last-digit'] as const;
    for (let i = 0; i < 200; i++) {
      const drawn = drawCards([...usedIds], true);
      drawn.forEach(c => {
        expect(usedIds).not.toContain(c.id);
      });
    }
  });

  it('no duplicate cards within a single hand in 500 draws', () => {
    for (let i = 0; i < 500; i++) {
      const drawn = drawCards([], false);
      const ids = drawn.map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('fallback: all line cards used → resets pool to full line cards', () => {
    const allIds = LINE_CLUE_CARDS.map(c => c.id);
    for (let i = 0; i < 50; i++) {
      const drawn = drawCards(allIds, true);
      expect(drawn).toHaveLength(3);
      drawn.forEach(c => {
        expect(c.id).not.toBe('peek');
      });
    }
  });

  it('cards come from the known pool', () => {
    const validIds = ALL_CARDS.map(c => c.id);
    const drawn = drawCards([], false);
    expect(drawn.every(c => validIds.includes(c.id))).toBe(true);
  });
});

describe('calcClueResult', () => {
  it('odd-even: odd answer → yes', () => {
    expect(calcClueResult(51, card('odd-even'))).toBe('yes');
    expect(calcClueResult(50, card('odd-even'))).toBe('no');
  });

  it('half: >50 → yes, <=50 → no (boundary 50)', () => {
    expect(calcClueResult(51, card('half'))).toBe('yes');
    expect(calcClueResult(50, card('half'))).toBe('no');
  });

  it('triple: multiple of 3 → yes', () => {
    expect(calcClueResult(33, card('triple'))).toBe('yes');
    expect(calcClueResult(34, card('triple'))).toBe('no');
  });

  it('repeat: same digits → yes', () => {
    expect(calcClueResult(44, card('repeat'))).toBe('yes');
    expect(calcClueResult(45, card('repeat'))).toBe('no');
  });

  it('last-digit: last digit >5 → yes, <=5 → no (boundary 0)', () => {
    expect(calcClueResult(36, card('last-digit'))).toBe('yes');
    expect(calcClueResult(30, card('last-digit'))).toBe('no');
    expect(calcClueResult(35, card('last-digit'))).toBe('no');
  });

  it('tens-odd-even: tens digit odd → yes', () => {
    expect(calcClueResult(31, card('tens-odd-even'))).toBe('yes');
    expect(calcClueResult(20, card('tens-odd-even'))).toBe('no');
    expect(calcClueResult(90, card('tens-odd-even'))).toBe('yes');
    expect(calcClueResult(80, card('tens-odd-even'))).toBe('no');
  });

  it('digit-sum-gt10: digit sum >10 → yes, <=10 → no (boundary 10)', () => {
    expect(calcClueResult(29, card('digit-sum-gt10'))).toBe('yes'); // 2+9=11
    expect(calcClueResult(19, card('digit-sum-gt10'))).toBe('no');  // 1+9=10, not >10
    expect(calcClueResult(56, card('digit-sum-gt10'))).toBe('yes'); // 5+6=11
    expect(calcClueResult(55, card('digit-sum-gt10'))).toBe('no');  // 5+5=10, not >10
    expect(calcClueResult(10, card('digit-sum-gt10'))).toBe('no');  // 1+0=1
  });

  it('sixty-plus: >=60 → yes, <60 → no (boundary 60)', () => {
    expect(calcClueResult(60, card('sixty-plus'))).toBe('yes');
    expect(calcClueResult(59, card('sixty-plus'))).toBe('no');
    expect(calcClueResult(99, card('sixty-plus'))).toBe('yes');
  });

  it('multiple-5: multiple of 5 → yes', () => {
    expect(calcClueResult(25, card('multiple-5'))).toBe('yes');
    expect(calcClueResult(26, card('multiple-5'))).toBe('no');
    expect(calcClueResult(10, card('multiple-5'))).toBe('yes');
  });

  it('tens-gt-ones: tens > ones → yes, tens <= ones → no (boundary equal)', () => {
    expect(calcClueResult(31, card('tens-gt-ones'))).toBe('yes');
    expect(calcClueResult(13, card('tens-gt-ones'))).toBe('no');
    expect(calcClueResult(33, card('tens-gt-ones'))).toBe('no');
  });

  it('both-odd: both digits odd → yes', () => {
    expect(calcClueResult(31, card('both-odd'))).toBe('yes');
    expect(calcClueResult(32, card('both-odd'))).toBe('no');
    expect(calcClueResult(22, card('both-odd'))).toBe('no');
    expect(calcClueResult(99, card('both-odd'))).toBe('yes');
  });
});

describe('getGuessRating', () => {
  it('isWin=false → 下次再試 😤 regardless of round count', () => {
    expect(getGuessRating(1, false)).toBe('下次再試 😤');
    expect(getGuessRating(10, false)).toBe('下次再試 😤');
  });

  it('round 1 = 運氣爆棚！🎲', () => {
    expect(getGuessRating(1, true)).toBe('運氣爆棚！🎲');
  });

  it('round 2–3 = 邏輯天才！🧠', () => {
    expect(getGuessRating(2, true)).toBe('邏輯天才！🧠');
    expect(getGuessRating(3, true)).toBe('邏輯天才！🧠');
  });

  it('round 4–6 = 穩健推理 👍', () => {
    expect(getGuessRating(4, true)).toBe('穩健推理 👍');
    expect(getGuessRating(6, true)).toBe('穩健推理 👍');
  });

  it('round 7–10 = 快追上了 💪', () => {
    expect(getGuessRating(7, true)).toBe('快追上了 💪');
    expect(getGuessRating(10, true)).toBe('快追上了 💪');
  });

  it('round 11+ = 再接再厲 🌱', () => {
    expect(getGuessRating(11, true)).toBe('再接再厲 🌱');
    expect(getGuessRating(99, true)).toBe('再接再厲 🌱');
  });
});
