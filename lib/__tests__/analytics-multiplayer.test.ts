import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  trackMultiplayerGameCompleted,
  trackMultiplayerGameStarted,
  trackMultiplayerLobbyView,
  trackQuickMatchCancelled,
  trackQuickMatchRequested,
  trackQuickMatchStarted,
  trackRematchClicked,
  trackRematchStarted,
} from '../analytics';

describe('多人模式漏斗事件', () => {
  afterEach(() => {
    delete window.gtag;
  });

  const record = () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    return gtag;
  };
  const counts = { humanPlayerCount: 2, botPlayerCount: 1 };

  it('大廳曝光、快速開始、配對完成、取消：沿用 quick_match_start，並帶等待秒數與人數', () => {
    const gtag = record();
    trackMultiplayerLobbyView();
    trackQuickMatchRequested('lobby');
    trackQuickMatchStarted({ ...counts, matchWaitSeconds: 7.6 });
    trackQuickMatchCancelled({
      humanPlayerCount: 1,
      botPlayerCount: 0,
      matchWaitSeconds: -3,
    });
    expect(gtag.mock.calls).toEqual([
      ['event', 'multiplayer_lobby_view', undefined],
      ['event', 'quick_match_requested', { source: 'lobby' }],
      [
        'event',
        'quick_match_start',
        {
          humans: 2,
          bots: 1,
          outcome: 'matched',
          game_type: 'buzzer',
          human_player_count: 2,
          bot_player_count: 1,
          match_wait_seconds: 8,
        },
      ],
      [
        'event',
        'quick_match_cancelled',
        { human_player_count: 1, bot_player_count: 0, match_wait_seconds: 0 },
      ],
    ]);
  });

  it('開局與完成沿用 game_start / game_complete（mode: multiplayer）；中斷另外記錄，不算完成', () => {
    const gtag = record();
    trackMultiplayerGameStarted({ gameType: 'buzzer', ...counts });
    trackMultiplayerGameCompleted({
      gameType: 'buzzer',
      completionStatus: 'won',
      ...counts,
    });
    trackMultiplayerGameCompleted({
      gameType: 'classic',
      completionStatus: 'aborted',
      ...counts,
    });
    expect(gtag.mock.calls.map(c => [c[1], c[2]])).toEqual([
      [
        'game_start',
        {
          mode: 'multiplayer',
          variant: 'buzzer',
          game_type: 'buzzer',
          human_player_count: 2,
          bot_player_count: 1,
        },
      ],
      [
        'game_complete',
        {
          mode: 'multiplayer',
          variant: 'buzzer',
          game_type: 'buzzer',
          completion_status: 'won',
          human_player_count: 2,
          bot_player_count: 1,
        },
      ],
      [
        'multiplayer_game_aborted',
        {
          game_type: 'classic',
          completion_status: 'aborted',
          human_player_count: 2,
          bot_player_count: 1,
        },
      ],
    ]);
  });

  it('再玩一場：按下與真的開局各一個事件；再戰的開局也帶 rematch_source', () => {
    const gtag = record();
    trackRematchClicked({ gameType: 'buzzer', rematchSource: 'quick_match' });
    trackMultiplayerGameStarted({
      gameType: 'buzzer',
      rematchSource: 'quick_match',
      ...counts,
    });
    trackRematchStarted({
      gameType: 'buzzer',
      rematchSource: 'quick_match',
      ...counts,
    });
    expect(gtag.mock.calls.map(c => c[1])).toEqual([
      'multiplayer_rematch_clicked',
      'game_start',
      'multiplayer_rematch_started',
    ]);
    expect(gtag.mock.calls[1][2]).toMatchObject({
      rematch_source: 'quick_match',
    });
  });

  it('所有參數只有統計值，沒有字串型的個人資料欄位', () => {
    const gtag = record();
    trackQuickMatchStarted({ ...counts, matchWaitSeconds: 3 });
    trackMultiplayerGameCompleted({
      gameType: 'buzzer',
      completionStatus: 'lost',
      ...counts,
    });
    trackRematchStarted({
      gameType: 'buzzer',
      rematchSource: 'private_room',
      ...counts,
    });
    const keys = gtag.mock.calls.flatMap(c => Object.keys(c[2] ?? {}));
    for (const forbidden of [
      'name',
      'player_name',
      'room_id',
      'room_name',
      'token',
      'password',
    ]) {
      expect(keys).not.toContain(forbidden);
    }
  });
});
