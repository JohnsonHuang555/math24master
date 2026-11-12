import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameMode } from '@/models/GameMode';
import { QUICK_MATCH } from '@/models/Room';

// game.ts 的房間存在模組層級的變數裡，每個測試重新載入一份乾淨的模組
let game: typeof import('./game');

beforeEach(async () => {
  vi.resetModules();
  game = await import('./game');
});

describe('快速配對', () => {
  it('沒有配對中的房間時開一間新房，開房的人是房主且已準備', () => {
    expect(game.findQuickMatchRoom()).toBeUndefined();

    const result = game.createQuickMatchRoom('r1', 'p1', '小明');

    expect(result.success).toBe(true);
    const room = game.getCurrentRoom('r1')!;
    expect(room).toMatchObject({
      isQuickMatch: true,
      quickMatchPending: true,
      maxPlayers: QUICK_MATCH.maxPlayers,
      settings: { gameType: 'buzzer' },
    });
    expect(room.players[0]).toMatchObject({ isMaster: true, isReady: true });
  });

  it('第二個人會被配進同一間房，而且不用按準備', () => {
    game.createQuickMatchRoom('r1', 'p1', '小明');
    const found = game.findQuickMatchRoom();
    expect(found?.roomId).toBe('r1');

    game.joinRoom(
      { roomId: 'r1', maxPlayers: QUICK_MATCH.maxPlayers },
      'p2',
      '小華',
      GameMode.Multiple,
    );

    const room = game.getCurrentRoom('r1')!;
    expect(room.players).toHaveLength(2);
    expect(room.players[1]).toMatchObject({ isMaster: false, isReady: true });
  });

  it('房間列表不顯示快速配對的房間', () => {
    game.createQuickMatchRoom('r1', 'p1', '小明');
    expect(game.getCurrentRooms()).toEqual([]);
  });

  it('配對結束時用普通電腦補到 3 人，名稱不重複，房間轉成一般房間', () => {
    game.createQuickMatchRoom('r1', 'p1', '小明');

    const room = game.finishQuickMatch('r1')!;

    expect(room.players).toHaveLength(QUICK_MATCH.fillTo);
    const bots = room.players.filter(p => p.isBot);
    expect(bots).toHaveLength(2);
    expect(bots.every(b => b.botDifficulty === 'normal')).toBe(true);
    expect(bots.map(b => b.name)).toEqual(['bot:normal:1', 'bot:normal:2']);
    expect(room.quickMatchPending).toBe(false);
    expect(room.players.every(p => p.isReady)).toBe(true);
    // 已經開局過的房間不會再被配對到
    expect(game.findQuickMatchRoom()).toBeUndefined();
  });

  it('真人已經夠多時不補電腦', () => {
    game.createQuickMatchRoom('r1', 'p1', 'A');
    for (const id of ['p2', 'p3']) {
      game.joinRoom({ roomId: 'r1', maxPlayers: 4 }, id, id, GameMode.Multiple);
    }

    const room = game.finishQuickMatch('r1')!;

    expect(room.players.filter(p => p.isBot)).toHaveLength(0);
  });

  it('同一間房只會結束配對一次', () => {
    game.createQuickMatchRoom('r1', 'p1', '小明');
    expect(game.finishQuickMatch('r1')).not.toBeNull();
    expect(game.finishQuickMatch('r1')).toBeNull();
  });

  it('真人滿房後不再被配對', () => {
    game.createQuickMatchRoom('r1', 'p1', 'A');
    for (const id of ['p2', 'p3', 'p4']) {
      game.joinRoom({ roomId: 'r1', maxPlayers: 4 }, id, id, GameMode.Multiple);
    }
    expect(game.findQuickMatchRoom()).toBeUndefined();
  });

  it('房主離開時由真人接手房主，不會交給電腦', () => {
    game.createQuickMatchRoom('r1', 'p1', 'A');
    game.finishQuickMatch('r1');
    game.joinRoom(
      { roomId: 'r1', maxPlayers: 4 },
      'p2',
      'B',
      GameMode.Multiple,
    );

    game.leaveRoom('p1');

    const room = game.getCurrentRoom('r1')!;
    const master = room.players.find(p => p.isMaster);
    expect(master?.id).toBe('p2');
  });

  it('真人都離開後房間會被刪除', () => {
    game.createQuickMatchRoom('r1', 'p1', 'A');
    game.finishQuickMatch('r1');

    game.leaveRoom('p1');

    expect(game.getCurrentRoom('r1')).toBeUndefined();
  });
});

describe('電腦玩家的名稱', () => {
  it('名稱是代碼，所有電腦依序編號，移除後補回最小的空號', () => {
    game.createQuickMatchRoom('r1', 'p1', '小明');
    const add = (difficulty: 'easy' | 'normal' | 'hard') => {
      const result = game.addBotToRoom('r1', difficulty);
      return result.success ? result.room!.players.at(-1)! : null;
    };

    const first = add('normal')!;
    const second = add('normal')!;
    expect([first.name, second.name]).toEqual(['bot:normal:1', 'bot:normal:2']);
    expect(add('hard')!.name).toBe('bot:hard:3');

    game.removePlayer('r1', first.id);
    expect(
      game.getCurrentRoom('r1')!.players.some(p => p.id === first.id),
    ).toBe(false);
    // 房間上限 4 人：小明、電腦 2、電腦 3，再加一個補回 1 號
    expect(add('easy')!.name).toBe('bot:easy:1');
  });
});
