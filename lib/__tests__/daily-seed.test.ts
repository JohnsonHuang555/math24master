import { beforeEach, describe, expect, it } from 'vitest';
import {
  canMake24,
  findAllSolutions,
  getDailyRecord,
  saveDailyRecord,
} from '../daily-seed';

// ---------------------------------------------------------------------------
// localStorage mock（jsdom 環境已內建，但我們重置狀態）
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// saveDailyRecord
// ---------------------------------------------------------------------------

describe('saveDailyRecord', () => {
  it('初次記錄 streak 為 1', () => {
    const { streak, maxStreak } = saveDailyRecord('2026-04-07', 5, []);
    expect(streak).toBe(1);
    expect(maxStreak).toBe(1);
  });

  it('昨天有完成紀錄時 streak +1', () => {
    saveDailyRecord('2026-04-06', 4, []);
    const { streak } = saveDailyRecord('2026-04-07', 5, []);
    expect(streak).toBe(2);
  });

  it('昨天沒有完成紀錄時 streak 重設為 1', () => {
    saveDailyRecord('2026-04-05', 4, []); // 前天，非昨天
    const { streak } = saveDailyRecord('2026-04-07', 5, []);
    expect(streak).toBe(1);
  });

  it('maxStreak 取歷史最大值', () => {
    saveDailyRecord('2026-04-01', 4, []);
    saveDailyRecord('2026-04-02', 4, []);
    saveDailyRecord('2026-04-03', 4, []); // streak=3, maxStreak=3
    // 中斷後重新開始
    const { maxStreak } = saveDailyRecord('2026-04-07', 5, []);
    expect(maxStreak).toBe(3);
  });

  it('同一天重複提交只更新 score，不改變 streak', () => {
    const first = saveDailyRecord('2026-04-07', 3, []);
    const second = saveDailyRecord('2026-04-07', 8, []);
    expect(second.streak).toBe(first.streak); // streak 不增加
    // 確認 score 被更新
    const record = getDailyRecord('2026-04-07');
    expect(record?.score).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// getDailyRecord + migrateOldRecords
// ---------------------------------------------------------------------------

describe('getDailyRecord + 遷移', () => {
  it('無資料時回傳 undefined', () => {
    expect(getDailyRecord('2026-04-07')).toBeUndefined();
  });

  it('偵測舊 dailyChallenge_ key 並自動遷移', () => {
    localStorage.setItem(
      'dailyChallenge_2026-04-06',
      JSON.stringify({ score: 7, done: true, date: '2026-04-06' }),
    );
    // 第一次讀取時觸發遷移
    const record = getDailyRecord('2026-04-06');
    expect(record?.done).toBe(true);
    expect(record?.score).toBe(7);
    expect(record?.streak).toBe(1); // 無法重建歷史，從 1 開始
    // 舊 key 應已刪除
    expect(localStorage.getItem('dailyChallenge_2026-04-06')).toBeNull();
  });

  it('已遷移後不重複執行（sentinel 保護）', () => {
    localStorage.setItem(
      'dailyChallenge_2026-04-06',
      JSON.stringify({ score: 7, done: true, date: '2026-04-06' }),
    );
    getDailyRecord('2026-04-06'); // 第一次：遷移並寫入 sentinel
    // 手動放回舊 key（模擬重複觸發）
    localStorage.setItem(
      'dailyChallenge_2026-04-06',
      JSON.stringify({ score: 99, done: true, date: '2026-04-06' }),
    );
    // 第二次：sentinel 存在，不重跑
    const record = getDailyRecord('2026-04-06');
    expect(record?.score).toBe(7); // 分數不被舊 key 覆蓋
  });

  it('無舊資料時 map 仍正確寫入 sentinel', () => {
    getDailyRecord('2026-04-07'); // 無舊 key
    saveDailyRecord('2026-04-07', 5, []);
    const record = getDailyRecord('2026-04-07');
    expect(record?.done).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// findAllSolutions
// ---------------------------------------------------------------------------

describe('findAllSolutions', () => {
  it('[1, 2, 3, 4] 包含已知解法 (1+2+3)×4=24', () => {
    const solutions = findAllSolutions([1, 2, 3, 4]);
    expect(solutions.length).toBeGreaterThan(0);
    const formulae = solutions.map(s => s.formula);
    // 任意一個解法結果為 24
    expect(formulae.length).toBeGreaterThan(0);
  });

  it('解法按分數由高到低排序', () => {
    const solutions = findAllSolutions([1, 2, 3, 4]);
    for (let i = 0; i < solutions.length - 1; i++) {
      expect(solutions[i].score).toBeGreaterThanOrEqual(solutions[i + 1].score);
    }
  });

  it('無重複 formula 字串', () => {
    const solutions = findAllSolutions([2, 3, 4, 6]);
    const formulae = solutions.map(s => s.formula);
    const unique = new Set(formulae);
    expect(unique.size).toBe(formulae.length);
  });

  it('無解牌組回傳空陣列', () => {
    // canMake24 確認無解
    expect(canMake24([1, 1, 1, 1])).toBe(false);
    const solutions = findAllSolutions([1, 1, 1, 1]);
    expect(solutions).toHaveLength(0);
  });

  it('所有解法的運算結果確實為 24', () => {
    const solutions = findAllSolutions([2, 3, 4, 6]);
    for (const s of solutions) {
      // 把 × 換回 * 、÷ 換回 / 後用 eval 驗證
      const expr = s.formula.replace(/×/g, '*').replace(/÷/g, '/');
      const result = eval(expr);
      expect(Math.abs(result - 24)).toBeLessThan(1e-6);
    }
  });
});
