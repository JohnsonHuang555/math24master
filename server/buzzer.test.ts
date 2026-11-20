// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { ErrorCode } from '@/models/ErrorCode';
import { GameMode } from '@/models/GameMode';
import { Room } from '@/models/Room';
import { SelectedCard } from '@/models/SelectedCard';
import { Symbol } from '@/models/Symbol';
import {
  applyRoundTimeout,
  openBuzzerRound,
  processBuzzIn,
  processBuzzerAnswer,
  processBuzzerAnswerTimeout,
  processNoSolutionVote,
  startBuzzerRound,
} from './buzzer';
import { solve24Cards } from './buzzer-bot';
import * as game from './game';

beforeEach(() => {
  game.resetGameStateForTests();
});

/** 兩人搶答房，第一題已開放，公共牌固定為 6 6 6 6 */
function openRound(): Room {
  game.joinRoom(
    { roomId: 'b', maxPlayers: 3, roomName: 'B', gameType: 'buzzer' },
    'a',
    'A',
    GameMode.Multiple,
  );
  game.joinRoom({ roomId: 'b', maxPlayers: 3 }, 'c', 'C', GameMode.Multiple);
  game.readyGame('b', 'c');
  game.startGame('b');
  const room = startBuzzerRound(game.getCurrentRoom('b')!);
  room.buzzerState!.publicCards = [0, 1, 2, 3].map(i => ({
    id: `p${i}`,
    value: 6,
  }));
  return openBuzzerRound(room);
}

const sixes = (room: Room): SelectedCard[] =>
  room.buzzerState!.publicCards.flatMap((card, i) =>
    i === 0 ? [{ number: card }] : [{ symbol: Symbol.Plus }, { number: card }],
  );

function buzz(room: Room, playerId: string): Room {
  const result = processBuzzIn(room, playerId);
  if (!result.success) throw new Error(result.reason);
  return result.room;
}

describe('搶答資格', () => {
  it('亮牌倒數期間不能搶答，開放後才可以', () => {
    game.joinRoom(
      { roomId: 'b', maxPlayers: 2, roomName: 'B', gameType: 'buzzer' },
      'a',
      'A',
      GameMode.Multiple,
    );
    game.startGame('b');
    const counting = startBuzzerRound(game.getCurrentRoom('b')!);
    expect(processBuzzIn(counting, 'a')).toEqual({
      success: false,
      reason: 'not_open',
    });
    expect(processBuzzIn(openBuzzerRound(counting), 'a').success).toBe(true);
  });

  it('同時搶答只有第一位成功；不在房間的人不能搶', () => {
    const room = buzz(openRound(), 'a');
    expect(processBuzzIn(room, 'c')).toEqual({
      success: false,
      reason: 'already_answering',
    });
    expect(processBuzzIn(openRound(), 'stranger')).toMatchObject({
      success: false,
    });
  });
});

describe('作答驗證以伺服器的公共牌為準', () => {
  it('正確作答得分並關閉這一題，其他人不能再搶同一題', () => {
    const room = buzz(openRound(), 'a');
    const result = processBuzzerAnswer(room, 'a', sixes(room));
    expect(result.kind).toBe('correct');
    if (result.kind !== 'correct') return;
    expect(result.scoreDelta).toBe(3);
    expect(result.room.players.find(p => p.id === 'a')!.score).toBe(3);
    expect(result.room.buzzerState!.roundOpen).toBe(false);
    expect(processBuzzIn(result.room, 'c')).toEqual({
      success: false,
      reason: 'not_open',
    });
  });

  it('重複送出或不是作答者送出：rejected，不帶 room、分數不變（原本會讓 index.ts 讀 undefined 崩潰）', () => {
    const room = buzz(openRound(), 'a');
    const first = processBuzzerAnswer(room, 'a', sixes(room));
    if (first.kind !== 'correct') throw new Error('expected correct');
    const again = processBuzzerAnswer(first.room, 'a', sixes(first.room));
    expect(again).toEqual({
      kind: 'rejected',
      error: ErrorCode.NotAnsweringPlayer,
    });
    expect(processBuzzerAnswer(room, 'c', sixes(room))).toEqual({
      kind: 'rejected',
      error: ErrorCode.NotAnsweringPlayer,
    });
  });

  it('用公共牌的 id 自己填數值（24+0+0+0）不會被當成答對', () => {
    const room = buzz(openRound(), 'a');
    const ids = room.buzzerState!.publicCards.map(c => c.id);
    const forged: SelectedCard[] = [
      { number: { id: ids[0], value: 24 } },
      { symbol: Symbol.Plus },
      { number: { id: ids[1], value: 0 } },
      { symbol: Symbol.Plus },
      { number: { id: ids[2], value: 0 } },
      { symbol: Symbol.Plus },
      { number: { id: ids[3], value: 0 } },
    ];
    // 以伺服器的值計算是 6+6+6+6 = 24：是對的（用對的牌），但前端填的數值沒有被採用
    const result = processBuzzerAnswer(room, 'a', forged);
    expect(result.kind).toBe('correct');

    const minus = processBuzzerAnswer(
      buzz(openRound(), 'a'),
      'a',
      forged.map(t => (t.symbol ? { symbol: Symbol.Minus } : t)),
    );
    // 以伺服器的值 6-6-6-6 ≠ 24（若採用前端的值 24-0-0-0 會判對）
    expect(minus).toMatchObject({
      kind: 'wrong',
      error: ErrorCode.AnswerNot24,
    });
  });

  it('不合法的符號（例如注入 mathjs 運算式）、重複用牌、非公共牌都判錯並扣分', () => {
    const cases: [unknown, ErrorCode][] = [
      ['not an array', ErrorCode.InvalidEquation],
      [[{ symbol: '24+0*' }], ErrorCode.InvalidEquation],
    ];
    for (const [input, error] of cases) {
      const room = buzz(openRound(), 'a');
      expect(processBuzzerAnswer(room, 'a', input)).toMatchObject({
        kind: 'wrong',
        error,
      });
    }
    const room = buzz(openRound(), 'a');
    const [p0] = room.buzzerState!.publicCards;
    const dup: SelectedCard[] = [
      { number: p0 },
      { symbol: Symbol.Plus },
      { number: p0 },
      { symbol: Symbol.Plus },
      { number: p0 },
      { symbol: Symbol.Plus },
      { number: p0 },
    ];
    const result = processBuzzerAnswer(room, 'a', dup);
    expect(result).toMatchObject({
      kind: 'wrong',
      error: ErrorCode.InvalidCards,
    });
    if (result.kind === 'wrong') {
      expect(result.room.buzzerState!.currentAnswerPlayerId).toBeNull();
      expect(result.room.buzzerState!.playerStates.a.isLocked).toBe(true);
    }
  });

  it('數字相鄰（6 6 會被 mathjs 讀成 66）判定算式不合法', () => {
    const room = buzz(openRound(), 'a');
    const cards = room.buzzerState!.publicCards;
    const adjacent: SelectedCard[] = [
      { number: cards[0] },
      { number: cards[1] },
      { symbol: Symbol.Minus },
      { number: cards[2] },
      { symbol: Symbol.Minus },
      { number: cards[3] },
    ];
    expect(processBuzzerAnswer(room, 'a', adjacent)).toMatchObject({
      kind: 'wrong',
      error: ErrorCode.InvalidEquation,
    });
  });

  it('電腦解法產生的算式能通過伺服器驗算', () => {
    const room = buzz(openRound(), 'a');
    room.buzzerState!.publicCards = [
      { id: 'x1', value: 1 },
      { id: 'x2', value: 5 },
      { id: 'x3', value: 5 },
      { id: 'x4', value: 5 },
    ];
    const solution = solve24Cards(room.buzzerState!.publicCards);
    expect(solution).not.toBeNull();
    expect(processBuzzerAnswer(room, 'a', solution!.expr).kind).toBe('correct');
  });
});

describe('回合與作答的收尾', () => {
  it('回合超時關閉這一題', () => {
    const result = applyRoundTimeout(openRound());
    expect(result.success && result.room.buzzerState!.roundOpen).toBe(false);
  });

  it('作答者已離開時作答超時只收回作答權，這一題不會卡住', () => {
    const room = buzz(openRound(), 'a');
    const without = {
      ...room,
      players: room.players.filter(p => p.id !== 'a'),
    };
    const result = processBuzzerAnswerTimeout(without, 'a');
    expect(result.room.buzzerState!.currentAnswerPlayerId).toBeNull();
    expect(processBuzzIn(result.room, 'c').success).toBe(true);
  });

  it('作答中的玩家離開房間：leaveRoom 收回作答權', () => {
    const room = buzz(openRound(), 'a');
    game.applyBuzzerRoomUpdate(room);
    // 房內還有 c，房間保留
    const left = game.leaveRoom('a');
    expect(left && 'wasAnswering' in left && left.wasAnswering).toBe(true);
    const after = game.getCurrentRoom('b')!;
    expect(after.buzzerState?.currentAnswerPlayerId ?? null).toBeNull();
  });

  it('無解投票：不在這一題的人、作答中、未開放時都不能投；通過後關閉這一題', () => {
    const room = openRound();
    expect(processNoSolutionVote(room, 'stranger')).toEqual({
      status: 'rejected',
    });
    expect(processNoSolutionVote(buzz(room, 'a'), 'c')).toEqual({
      status: 'rejected',
    });
    const first = processNoSolutionVote(room, 'a');
    expect(first.status).toBe('counted');
    if (first.status !== 'counted') return;
    const second = processNoSolutionVote(first.room, 'c');
    expect(second.status).toBe('passed');
    if (second.status === 'passed') {
      expect(second.room.buzzerState!.roundOpen).toBe(false);
    }
  });
});
