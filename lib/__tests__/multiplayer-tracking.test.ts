import {
  type Mock,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { GameStatus } from '@/models/GameStatus';
import { RoomView } from '@/models/RoomView';
import {
  TrackerStorage,
  createMultiplayerTracker,
} from '../multiplayer-tracking';

/** 模擬同一個分頁的 sessionStorage（重新整理後還在） */
function fakeStorage(): TrackerStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: k => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: k => void data.delete(k),
  };
}

const view = (over: Partial<RoomView> = {}): RoomView =>
  ({
    roomId: 'room-1',
    hasPassword: false,
    maxPlayers: 4,
    currentOrder: 0,
    deckCount: 0,
    players: [
      {
        id: 'player-7f3a',
        name: 'Alice',
        score: 0,
        isMaster: true,
        isLastRoundPlayer: false,
        isReady: true,
        handCardCount: 0,
      },
      {
        id: 'bot-1',
        name: 'bot:normal:1',
        score: 0,
        isMaster: false,
        isLastRoundPlayer: false,
        isReady: true,
        isBot: true,
        handCardCount: 0,
      },
    ],
    isGameOver: false,
    status: GameStatus.Idle,
    settings: {
      deckType: 'standard',
      remainSeconds: null,
      difficulty: 'normal',
      gameType: 'buzzer',
    },
    playedCards: [],
    self: { playerId: 'player-7f3a', handCard: [], selectedCards: [] },
    ...over,
  }) as RoomView;

const pending = () =>
  view({
    isQuickMatch: true,
    quickMatchPending: true,
    players: [view().players[0]],
  });
const playing = (matchId: string, over: Partial<RoomView> = {}) =>
  view({
    isQuickMatch: true,
    quickMatchPending: false,
    status: GameStatus.Playing,
    matchId,
    ...over,
  });

describe('多人分析事件的去重', () => {
  let gtag: Mock<NonNullable<Window['gtag']>>;
  let clock: number;
  const now = () => clock;
  const events = () => gtag.mock.calls.map(c => c[1] as string);
  const paramsOf = (name: string) =>
    gtag.mock.calls.filter(c => c[1] === name).map(c => c[2]);

  beforeEach(() => {
    gtag = vi.fn<NonNullable<Window['gtag']>>();
    window.gtag = gtag;
    clock = 1_000_000;
  });
  afterEach(() => {
    delete window.gtag;
  });

  it('漏斗 A：大廳 → 快速開始 → 進配對房 → 配對完成 → 開局，各一次，等待秒數正確', () => {
    const t = createMultiplayerTracker(fakeStorage(), now);
    t.lobbyView();
    t.quickMatchRequested('lobby');
    t.roomView(pending());
    clock += 7_400;
    t.roomView(view({ isQuickMatch: true, quickMatchPending: false }));
    t.roomView(playing('m1'));
    expect(events()).toEqual([
      'multiplayer_lobby_view',
      'quick_match_requested',
      'quick_match_joined',
      'quick_match_start',
      'game_start',
    ]);
    expect(paramsOf('quick_match_start')[0]).toMatchObject({
      match_wait_seconds: 7,
      human_player_count: 1,
      bot_player_count: 1,
    });
    expect(paramsOf('game_start')[0]).toMatchObject({
      mode: 'multiplayer',
      match_id: 'm1',
    });
  });

  it('同一份房間資料收到多次（Strict Mode 重跑、RoomUpdate 重送）只算一次', () => {
    const t = createMultiplayerTracker(fakeStorage(), now);
    for (let i = 0; i < 3; i++) t.roomView(pending());
    for (let i = 0; i < 3; i++) t.roomView(playing('m1'));
    expect(events().filter(e => e === 'quick_match_joined')).toHaveLength(1);
    expect(events().filter(e => e === 'game_start')).toHaveLength(1);
  });

  it('遊戲中重新整理（新的 tracker、同一個 sessionStorage）不會重複記錄開局或配對完成', () => {
    const storage = fakeStorage();
    const before = createMultiplayerTracker(storage, now);
    before.quickMatchRequested('lobby');
    before.roomView(pending());
    before.roomView(playing('m1'));
    // 重新整理：模組重新載入，重連後拿到同一局
    const after = createMultiplayerTracker(storage, now);
    after.roomView(playing('m1'));
    expect(events().filter(e => e === 'game_start')).toHaveLength(1);
    expect(events().filter(e => e === 'quick_match_start')).toHaveLength(1);
  });

  it('斷線重連（同一個 tracker，房間資料重新送來）不算新的一局', () => {
    const t = createMultiplayerTracker(fakeStorage(), now);
    t.roomView(playing('m1'));
    t.roomView(
      playing('m1', {
        players: view().players.map(p => ({ ...p, isDisconnected: true })),
      }),
    );
    t.roomView(playing('m1'));
    expect(events()).toEqual(['game_start']);
  });

  it('正常結算只算一次（收到兩次結算、重新整理後再收到也一樣）', () => {
    const storage = fakeStorage();
    const t = createMultiplayerTracker(storage, now);
    const over = {
      gameType: 'buzzer' as const,
      matchId: 'm1',
      won: true,
      players: view().players,
    };
    t.gameOver(over);
    t.gameOver(over);
    createMultiplayerTracker(storage, now).gameOver(over);
    expect(paramsOf('game_complete')).toHaveLength(1);
    expect(paramsOf('game_complete')[0]).toMatchObject({
      completion_status: 'won',
      match_id: 'm1',
      human_player_count: 1,
      bot_player_count: 1,
    });
  });

  it('中斷不算正常完成；同一局中斷後再收到結算也不會再算一次完成', () => {
    const t = createMultiplayerTracker(fakeStorage(), now);
    t.aborted(playing('m1'));
    t.gameOver({ gameType: 'buzzer', matchId: 'm1', won: false, players: [] });
    expect(events()).toEqual(['multiplayer_game_aborted']);
    expect(paramsOf('multiplayer_game_aborted')[0]).toMatchObject({
      completion_status: 'aborted',
    });
  });

  it('快速配對取消不算配對完成；取消和離開房間各記錄方式，同一間房只算一次', () => {
    const t = createMultiplayerTracker(fakeStorage(), now);
    t.quickMatchRequested('lobby');
    t.roomView(pending());
    clock += 4_000;
    t.quickMatchCancelled(pending(), 'leave_button');
    t.quickMatchCancelled(pending(), 'cancel_button');
    expect(events()).not.toContain('quick_match_start');
    expect(paramsOf('quick_match_cancelled')).toEqual([
      {
        human_player_count: 1,
        bot_player_count: 0,
        match_wait_seconds: 4,
        cancel_method: 'leave_button',
      },
    ]);
    // 已經開局的房間離開不是取消配對
    t.quickMatchCancelled(playing('m2'), 'leave_button');
    expect(paramsOf('quick_match_cancelled')).toHaveLength(1);
  });

  it('再戰：下一局的開局帶 rematch_source，並和原本的場次區分（from_match_id）；連點只算一次', () => {
    const storage = fakeStorage();
    const t = createMultiplayerTracker(storage, now);
    t.roomView(playing('m1'));
    t.gameOver({
      gameType: 'buzzer',
      matchId: 'm1',
      won: true,
      players: view().players,
    });
    t.rematchClicked(playing('m1'));
    t.rematchClicked(playing('m1'));
    // 再戰配對中重新整理：意圖還在
    const after = createMultiplayerTracker(storage, now);
    after.roomView({ ...pending(), roomId: 'room-2' });
    after.roomView(playing('m2', { roomId: 'room-2' }));
    expect(
      events().filter(e => e === 'multiplayer_rematch_clicked'),
    ).toHaveLength(1);
    expect(paramsOf('quick_match_requested')).toEqual([{ source: 'rematch' }]);
    expect(paramsOf('quick_match_joined')).toEqual([{ source: 'rematch' }]);
    const starts = paramsOf('game_start');
    expect(starts[0]).not.toHaveProperty('rematch_source');
    expect(starts[1]).toMatchObject({
      match_id: 'm2',
      rematch_source: 'quick_match',
    });
    expect(paramsOf('multiplayer_rematch_started')).toEqual([
      expect.objectContaining({ match_id: 'm2', from_match_id: 'm1' }),
    ]);
    // 第三局（沒有按再戰）不會再算成再戰
    after.roomView(playing('m3', { roomId: 'room-2' }));
    expect(paramsOf('game_start')[2]).not.toHaveProperty('rematch_source');
  });

  it('按了再玩一場卻回到大廳：之後從大廳開的局不算再戰；意圖過期也不算', () => {
    const t = createMultiplayerTracker(fakeStorage(), now);
    t.rematchClicked(playing('m1'));
    t.lobbyView();
    t.roomView(playing('m2', { roomId: 'room-2' }));
    expect(events()).not.toContain('multiplayer_rematch_started');

    const t2 = createMultiplayerTracker(fakeStorage(), now);
    t2.rematchClicked(view({ status: GameStatus.Playing, matchId: 'm5' }));
    clock += 16 * 60 * 1000;
    t2.roomView(playing('m6'));
    expect(events()).not.toContain('multiplayer_rematch_started');
  });

  it('參與作答每局只算一次；不在遊戲中不算', () => {
    const t = createMultiplayerTracker(fakeStorage(), now);
    t.participated(view({ matchId: 'm1' }));
    t.participated(playing('m1'));
    t.participated(playing('m1'));
    t.participated(playing('m2'));
    expect(paramsOf('multiplayer_participated')).toEqual([
      { game_type: 'buzzer', match_id: 'm1' },
      { game_type: 'buzzer', match_id: 'm2' },
    ]);
  });

  it('舊版伺服器沒有 matchId：不送開局（無法去重），結算照常送一次', () => {
    const t = createMultiplayerTracker(fakeStorage(), now);
    t.roomView(view({ status: GameStatus.Playing }));
    t.gameOver({ gameType: 'buzzer', won: false, players: [] });
    expect(events()).toEqual(['game_complete']);
  });

  it('事件參數不含暱稱、房間 id、密碼或 token', () => {
    const t = createMultiplayerTracker(fakeStorage(), now);
    const room = playing('m1', {
      hasPassword: true,
      self: {
        playerId: 'player-7f3a',
        handCard: [],
        selectedCards: [],
        roomPassword: 'secret-pw',
      },
    });
    t.lobbyView();
    t.quickMatchRequested('lobby');
    t.roomView({ ...pending(), roomId: 'room-1' });
    t.roomView(room);
    t.participated(room);
    t.gameOver({
      gameType: 'buzzer',
      matchId: 'm1',
      won: true,
      players: room.players,
    });
    t.rematchClicked(room);
    t.quickMatchCancelled({ ...pending(), roomId: 'room-9' }, 'cancel_button');
    const sent = JSON.stringify(gtag.mock.calls);
    for (const secret of [
      'Alice',
      'room-1',
      'room-9',
      'secret-pw',
      'player-7f3a',
      'bot:normal',
    ]) {
      expect(sent).not.toContain(secret);
    }
    expect(sent).not.toMatch(/token|password|player_name|room_id/);
  });

  it('GA4 沒載入、或 sessionStorage 不能用時不會丟錯，遊戲照常', () => {
    delete window.gtag;
    const broken: TrackerStorage = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    };
    const t = createMultiplayerTracker(broken, now);
    expect(() => {
      t.lobbyView();
      t.quickMatchRequested('lobby');
      t.roomView(pending());
      t.roomView(playing('m1'));
      t.gameOver({ gameType: 'buzzer', matchId: 'm1', won: true, players: [] });
      t.rematchClicked(playing('m1'));
      t.quickMatchWaitSeconds();
    }).not.toThrow();
    // 記憶體去重仍然有效
    window.gtag = gtag;
    t.roomView(playing('m1'));
    expect(events()).not.toContain('game_start');
  });
});
