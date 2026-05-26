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

const all = getInitialRemaining();

describe('applyClue — 空陣列 guard', () => {
  it('returns [] when remaining is empty', () => {
    expect(applyClue([], card('odd-even'), 'yes')).toEqual([]);
    expect(applyClue([], card('half'), 'no')).toEqual([]);
  });
});

describe('applyClue — 半壁江山', () => {
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

describe('applyClue — 陰陽雙極', () => {
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

describe('applyClue — 三陽開泰', () => {
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

describe('applyClue — 五福臨門', () => {
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

describe('applyClue — 七星高照', () => {
  it('yes → keep multiples of 7 (13 numbers)', () => {
    const result = applyClue(all, card('multiple-7'), 'yes');
    expect(result).toHaveLength(13); // 14,21,28,35,42,49,56,63,70,77,84,91,98
    expect(result.every(n => n % 7 === 0)).toBe(true);
    expect(result).toContain(14);
    expect(result).toContain(49); // 7×7, IS a multiple of 7
    expect(result).toContain(98);
  });

  it('no → keep non-multiples of 7 (77 numbers)', () => {
    const result = applyClue(all, card('multiple-7'), 'no');
    expect(result).toHaveLength(77);
    expect(result.every(n => n % 7 !== 0)).toBe(true);
  });
});

describe('applyClue — 黃金質數', () => {
  it('yes → keep primes (21 numbers)', () => {
    const result = applyClue(all, card('prime'), 'yes');
    expect(result).toHaveLength(21);
    expect(result).toContain(11);
    expect(result).toContain(97);
    expect(result).not.toContain(49); // 7×7, not prime
    expect(result).not.toContain(91); // 7×13, not prime
  });

  it('no → keep non-primes (69 numbers)', () => {
    const result = applyClue(all, card('prime'), 'no');
    expect(result).toHaveLength(69);
    expect(result).toContain(49);
    expect(result).toContain(91);
    expect(result).not.toContain(11);
  });
});

describe('applyClue — 複製貼上', () => {
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

describe('applyClue — 步步高升', () => {
  it('yes → ones > tens (36 numbers)', () => {
    const result = applyClue(all, card('ones-gt-tens'), 'yes');
    expect(result).toHaveLength(36);
    expect(result.every(n => n % 10 > Math.floor(n / 10))).toBe(true);
    expect(result).toContain(19);
  });

  it('no → ones <= tens (54 numbers), equal counts as no', () => {
    const result = applyClue(all, card('ones-gt-tens'), 'no');
    expect(result).toHaveLength(54);
    expect(result).toContain(11); // equal
    expect(result).toContain(91); // tens > ones
    expect(result).not.toContain(19);
  });
});

describe('applyClue — 數位加總', () => {
  it('yes → digit sum is odd (45 numbers)', () => {
    const result = applyClue(all, card('digit-sum-odd'), 'yes');
    expect(result).toHaveLength(45);
    expect(result.every(n => (Math.floor(n / 10) + n % 10) % 2 !== 0)).toBe(true);
    expect(result).toContain(10); // 1+0=1, odd
    expect(result).toContain(29); // 2+9=11, odd
  });

  it('no → digit sum is even (45 numbers)', () => {
    const result = applyClue(all, card('digit-sum-odd'), 'no');
    expect(result).toHaveLength(45);
    expect(result.every(n => (Math.floor(n / 10) + n % 10) % 2 === 0)).toBe(true);
    expect(result).toContain(11); // 1+1=2, even
    expect(result).toContain(19); // 1+9=10, even
  });
});

describe('applyClue — 尾數偵測', () => {
  it('yes → ones digit >5 (36 numbers)', () => {
    const result = applyClue(all, card('last-digit-gt5'), 'yes');
    expect(result).toHaveLength(36);
    expect(result.every(n => n % 10 > 5)).toBe(true);
  });

  it('no → ones digit <=5, boundary 0 included (54 numbers)', () => {
    const result = applyClue(all, card('last-digit-gt5'), 'no');
    expect(result).toHaveLength(54);
    expect(result.every(n => n % 10 <= 5)).toBe(true);
    expect(result).toContain(10);
    expect(result).toContain(20);
    expect(result).toContain(90);
  });
});

describe('applyClue — 十位偵測', () => {
  it('yes → tens digit >5 (40 numbers: 60–99)', () => {
    const result = applyClue(all, card('tens-gt5'), 'yes');
    expect(result).toHaveLength(40);
    expect(result.every(n => Math.floor(n / 10) > 5)).toBe(true);
    expect(result).toContain(60);
    expect(result).toContain(99);
  });

  it('no → tens digit <=5 (50 numbers: 10–59)', () => {
    const result = applyClue(all, card('tens-gt5'), 'no');
    expect(result).toHaveLength(50);
    expect(result.every(n => Math.floor(n / 10) <= 5)).toBe(true);
    expect(result).toContain(10);
    expect(result).toContain(59);
  });
});

describe('applyClue — 數位之積', () => {
  it('yes → tens×ones >20 (39 numbers)', () => {
    const result = applyClue(all, card('digit-product-gt20'), 'yes');
    expect(result).toHaveLength(39);
    expect(result.every(n => Math.floor(n / 10) * (n % 10) > 20)).toBe(true);
    expect(result).not.toContain(10); // 1×0=0
    expect(result).not.toContain(45); // 4×5=20, not >20
    expect(result).toContain(46); // 4×6=24, >20
    expect(result).toContain(99); // 9×9=81
  });

  it('no → tens×ones <=20 (51 numbers), boundary 20 included', () => {
    const result = applyClue(all, card('digit-product-gt20'), 'no');
    expect(result).toHaveLength(51);
    expect(result).toContain(45); // 4×5=20, exactly at boundary
    expect(result).not.toContain(46);
  });
});

describe('applyClue — 高低雷達 (dynamic)', () => {
  it('yes → keep numbers > lastGuess', () => {
    const result = applyClue(all, card('higher-than-last'), 'yes', { lastGuess: 50 });
    expect(result.every(n => n > 50)).toBe(true);
    expect(result).toHaveLength(49);
  });

  it('no → keep numbers <= lastGuess', () => {
    const result = applyClue(all, card('higher-than-last'), 'no', { lastGuess: 50 });
    expect(result.every(n => n <= 50)).toBe(true);
    expect(result).toHaveLength(41);
  });

  it('context=undefined → noop, returns remaining unchanged', () => {
    const result = applyClue(all, card('higher-than-last'), 'yes');
    expect(result).toEqual(all);
  });
});

describe('applyClue — 黃金交叉 (dynamic)', () => {
  it('yes → keep numbers within 10 of lastGuess (inclusive)', () => {
    const result = applyClue(all, card('within-ten'), 'yes', { lastGuess: 50 });
    expect(result.every(n => Math.abs(n - 50) <= 10)).toBe(true);
    expect(result).toContain(40);
    expect(result).toContain(50);
    expect(result).toContain(60);
    expect(result).not.toContain(39);
    expect(result).not.toContain(61);
  });

  it('no → keep numbers >10 away from lastGuess', () => {
    const result = applyClue(all, card('within-ten'), 'no', { lastGuess: 50 });
    expect(result.every(n => Math.abs(n - 50) > 10)).toBe(true);
    expect(result).not.toContain(50);
  });

  it('context=undefined → noop', () => {
    const result = applyClue(all, card('within-ten'), 'yes');
    expect(result).toEqual(all);
  });
});

describe('applyClue — 完美平方', () => {
  it('yes → keep perfect squares in range (6 numbers)', () => {
    const result = applyClue(all, card('perfect-square'), 'yes');
    expect(result).toHaveLength(6);
    expect(result).toEqual([16, 25, 36, 49, 64, 81]);
  });

  it('no → keep non-perfect-squares (84 numbers)', () => {
    const result = applyClue(all, card('perfect-square'), 'no');
    expect(result).toHaveLength(84);
    expect(result).not.toContain(49);
    expect(result).toContain(48);
    expect(result).toContain(50);
  });
});

describe('applyClue — 幸運之星', () => {
  it('yes → keep numbers containing digit 7 (18 numbers)', () => {
    const result = applyClue(all, card('lucky-seven'), 'yes');
    expect(result).toHaveLength(18);
    expect(result.every(n => n.toString().includes('7'))).toBe(true);
    expect(result).toContain(17);
    expect(result).toContain(70);
    expect(result).toContain(77);
  });

  it('no → keep numbers without digit 7 (72 numbers)', () => {
    const result = applyClue(all, card('lucky-seven'), 'no');
    expect(result).toHaveLength(72);
    expect(result).not.toContain(17);
    expect(result).not.toContain(70);
    expect(result).not.toContain(77);
  });
});

describe('applyClue — 多條線索交集', () => {
  it('odd-even(yes) + half(yes) → odd AND >50 (25 numbers)', () => {
    const afterOdd = applyClue(all, card('odd-even'), 'yes');
    const result = applyClue(afterOdd, card('half'), 'yes');
    expect(result).toHaveLength(25);
    expect(result.every(n => n % 2 !== 0 && n > 50)).toBe(true);
  });

  it('triple(yes) + last-digit-gt5(no) → multiple of 3 AND ones <=5 (18 numbers)', () => {
    const afterTriple = applyClue(all, card('triple'), 'yes');
    const result = applyClue(afterTriple, card('last-digit-gt5'), 'no');
    expect(result).toHaveLength(18);
    expect(result.every(n => n % 3 === 0 && n % 10 <= 5)).toBe(true);
  });
});

describe('drawCards', () => {
  it('always returns exactly 3 cards', () => {
    expect(drawCards([], false, false, true)).toHaveLength(3);
    expect(drawCards([], true, true, false)).toHaveLength(3);
  });

  it('peekUsed=true → no peek card in 200 draws', () => {
    for (let i = 0; i < 200; i++) {
      expect(drawCards([], true, false, false).every(c => c.id !== 'peek')).toBe(true);
    }
  });

  it('peekUsed=false → peek can appear in 500 draws', () => {
    let peekFound = false;
    for (let i = 0; i < 500; i++) {
      if (drawCards([], false, false, false).some(c => c.id === 'peek')) {
        peekFound = true;
        break;
      }
    }
    expect(peekFound).toBe(true);
  });

  it('redrawUsed=true → no redraw card in 200 draws', () => {
    for (let i = 0; i < 200; i++) {
      expect(drawCards([], false, true, false).every(c => c.id !== 'redraw')).toBe(true);
    }
  });

  it('redrawUsed=false → redraw can appear in 500 draws', () => {
    let found = false;
    for (let i = 0; i < 500; i++) {
      if (drawCards([], false, false, false).some(c => c.id === 'redraw')) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('isFirstRound=true → dynamic cards never appear in 200 draws', () => {
    for (let i = 0; i < 200; i++) {
      const drawn = drawCards([], true, true, true);
      expect(drawn.every(c => c.id !== 'higher-than-last' && c.id !== 'within-ten')).toBe(true);
    }
  });

  it('isFirstRound=false → dynamic cards can appear in 500 draws', () => {
    let found = false;
    for (let i = 0; i < 500; i++) {
      if (
        drawCards([], true, true, false).some(
          c => c.id === 'higher-than-last' || c.id === 'within-ten',
        )
      ) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('usedIds excludes those cards from pool in 200 draws', () => {
    const usedIds = ['odd-even', 'half', 'triple', 'repeat', 'multiple-5'] as const;
    for (let i = 0; i < 200; i++) {
      const drawn = drawCards([...usedIds], true, true, false);
      drawn.forEach(c => {
        expect(usedIds).not.toContain(c.id);
      });
    }
  });

  it('no duplicate cards within a single hand in 500 draws', () => {
    for (let i = 0; i < 500; i++) {
      const drawn = drawCards([], false, false, false);
      const ids = drawn.map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('fallback: all line cards used → resets pool to full line cards', () => {
    const allIds = LINE_CLUE_CARDS.map(c => c.id);
    for (let i = 0; i < 50; i++) {
      const drawn = drawCards(allIds, true, true, false);
      expect(drawn).toHaveLength(3);
      drawn.forEach(c => {
        expect(c.id).not.toBe('peek');
        expect(c.id).not.toBe('redraw');
      });
    }
  });

  it('cards come from the known pool', () => {
    const validIds = ALL_CARDS.map(c => c.id);
    const drawn = drawCards([], false, false, false);
    expect(drawn.every(c => validIds.includes(c.id))).toBe(true);
  });
});

describe('calcClueResult', () => {
  it('half: >50 → yes, <=50 → no (boundary 50)', () => {
    expect(calcClueResult(51, card('half'))).toBe('yes');
    expect(calcClueResult(50, card('half'))).toBe('no');
  });

  it('odd-even: odd answer → yes', () => {
    expect(calcClueResult(51, card('odd-even'))).toBe('yes');
    expect(calcClueResult(50, card('odd-even'))).toBe('no');
  });

  it('triple: multiple of 3 → yes', () => {
    expect(calcClueResult(33, card('triple'))).toBe('yes');
    expect(calcClueResult(34, card('triple'))).toBe('no');
  });

  it('multiple-5: multiple of 5 → yes', () => {
    expect(calcClueResult(25, card('multiple-5'))).toBe('yes');
    expect(calcClueResult(26, card('multiple-5'))).toBe('no');
  });

  it('multiple-7: multiple of 7 → yes', () => {
    expect(calcClueResult(14, card('multiple-7'))).toBe('yes');
    expect(calcClueResult(49, card('multiple-7'))).toBe('yes'); // 7×7
    expect(calcClueResult(15, card('multiple-7'))).toBe('no');
  });

  it('prime: prime → yes; 49 and 91 are NOT prime', () => {
    expect(calcClueResult(11, card('prime'))).toBe('yes');
    expect(calcClueResult(97, card('prime'))).toBe('yes');
    expect(calcClueResult(49, card('prime'))).toBe('no'); // 7×7
    expect(calcClueResult(91, card('prime'))).toBe('no'); // 7×13
    expect(calcClueResult(10, card('prime'))).toBe('no');
  });

  it('repeat: same digits → yes', () => {
    expect(calcClueResult(44, card('repeat'))).toBe('yes');
    expect(calcClueResult(45, card('repeat'))).toBe('no');
  });

  it('ones-gt-tens: ones > tens → yes, equal → no', () => {
    expect(calcClueResult(19, card('ones-gt-tens'))).toBe('yes');
    expect(calcClueResult(91, card('ones-gt-tens'))).toBe('no');
    expect(calcClueResult(33, card('ones-gt-tens'))).toBe('no'); // equal
  });

  it('digit-sum-odd: odd digit sum → yes', () => {
    expect(calcClueResult(10, card('digit-sum-odd'))).toBe('yes'); // 1+0=1
    expect(calcClueResult(29, card('digit-sum-odd'))).toBe('yes'); // 2+9=11
    expect(calcClueResult(19, card('digit-sum-odd'))).toBe('no'); // 1+9=10
    expect(calcClueResult(11, card('digit-sum-odd'))).toBe('no'); // 1+1=2
  });

  it('last-digit-gt5: ones digit >5 → yes, <=5 → no (boundary 0)', () => {
    expect(calcClueResult(36, card('last-digit-gt5'))).toBe('yes');
    expect(calcClueResult(30, card('last-digit-gt5'))).toBe('no');
    expect(calcClueResult(35, card('last-digit-gt5'))).toBe('no');
  });

  it('tens-gt5: tens digit >5 → yes (>=60)', () => {
    expect(calcClueResult(60, card('tens-gt5'))).toBe('yes');
    expect(calcClueResult(59, card('tens-gt5'))).toBe('no');
    expect(calcClueResult(99, card('tens-gt5'))).toBe('yes');
  });

  it('digit-product-gt20: tens×ones >20 → yes, boundary 20 → no', () => {
    expect(calcClueResult(46, card('digit-product-gt20'))).toBe('yes'); // 4×6=24
    expect(calcClueResult(45, card('digit-product-gt20'))).toBe('no'); // 4×5=20
    expect(calcClueResult(10, card('digit-product-gt20'))).toBe('no'); // 1×0=0
  });

  it('higher-than-last: answer > lastGuess → yes', () => {
    expect(calcClueResult(60, card('higher-than-last'), { lastGuess: 50 })).toBe('yes');
    expect(calcClueResult(50, card('higher-than-last'), { lastGuess: 50 })).toBe('no');
    expect(calcClueResult(40, card('higher-than-last'), { lastGuess: 50 })).toBe('no');
  });

  it('within-ten: |answer - lastGuess| <=10 → yes (boundary inclusive)', () => {
    expect(calcClueResult(60, card('within-ten'), { lastGuess: 50 })).toBe('yes');
    expect(calcClueResult(40, card('within-ten'), { lastGuess: 50 })).toBe('yes');
    expect(calcClueResult(61, card('within-ten'), { lastGuess: 50 })).toBe('no');
    expect(calcClueResult(39, card('within-ten'), { lastGuess: 50 })).toBe('no');
  });

  it('perfect-square: perfect square → yes', () => {
    expect(calcClueResult(49, card('perfect-square'))).toBe('yes');
    expect(calcClueResult(16, card('perfect-square'))).toBe('yes');
    expect(calcClueResult(50, card('perfect-square'))).toBe('no');
    expect(calcClueResult(48, card('perfect-square'))).toBe('no');
  });

  it('lucky-seven: contains digit 7 → yes', () => {
    expect(calcClueResult(17, card('lucky-seven'))).toBe('yes');
    expect(calcClueResult(70, card('lucky-seven'))).toBe('yes');
    expect(calcClueResult(77, card('lucky-seven'))).toBe('yes');
    expect(calcClueResult(18, card('lucky-seven'))).toBe('no');
    expect(calcClueResult(80, card('lucky-seven'))).toBe('no');
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
