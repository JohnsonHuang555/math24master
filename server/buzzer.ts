import { evaluate } from 'mathjs';
import { v4 as uuidv4 } from 'uuid';
import { canMake24 } from '../lib/daily-seed';
import {
  BuzzerPlayerState,
  BuzzerSettings,
  BuzzerState,
  DEFAULT_BUZZER_SETTINGS,
  Room,
} from '../models/Room';
import { NumberCard, Player } from '../models/Player';
import { SelectedCard } from '../models/SelectedCard';
import { Symbol } from '../models/Symbol';

// ─── 型別 ───────────────────────────────────────────────────────────────────

export type BuzzInResult =
  | { success: true; room: Room }
  | { success: false; reason: 'already_answering' | 'player_locked' | 'not_open' | 'not_found' };

export type BuzzerAnswerResult =
  | { success: true; room: Room; scoreDelta: number; streak: number; streakBonus: number; winner?: Player }
  | { success: false; error: string };

export type NoSolutionVoteResult =
  | { passed: false; votes: string[] }
  | { passed: true; room: Room };

export type RoundTimeoutResult =
  | { success: true; room: Room }
  | { success: false; error: string };

// ─── 牌組產生 ────────────────────────────────────────────────────────────────

/** 從 1~maxValue 隨機產生 4 張可湊出 24 的公共牌 */
export function generateSolvableCards(maxValue: 10 | 13): NumberCard[] {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const values = Array.from({ length: 4 }, () =>
      Math.floor(Math.random() * maxValue) + 1,
    );
    if (canMake24(values)) {
      return values.map(value => ({ id: uuidv4(), value }));
    }
  }
  // 萬一 1000 次都失敗，回傳保底可解牌組
  return [{ id: uuidv4(), value: 1 }, { id: uuidv4(), value: 2 }, { id: uuidv4(), value: 3 }, { id: uuidv4(), value: 4 }];
}

// ─── 回合管理 ────────────────────────────────────────────────────────────────

/** 初始化新回合的 BuzzerState，掛到 room 上並回傳 */
export function startBuzzerRound(room: Room): Room {
  const settings = room.settings.buzzerSettings ?? DEFAULT_BUZZER_SETTINGS;
  const cards = generateSolvableCards(settings.cardMaxValue);

  const prevStates = room.buzzerState?.playerStates ?? {};
  const playerStates: { [id: string]: BuzzerPlayerState } = {};

  for (const p of room.players) {
    const prev = prevStates[p.id];
    const isLocked = settings.clearLockOnNewRound ? false : (prev?.isLocked ?? false);
    const lockUntil = settings.clearLockOnNewRound ? null : (prev?.lockUntil ?? null);
    playerStates[p.id] = {
      isLocked,
      lockUntil,
      streak: prev?.streak ?? 0,
    };
  }

  const newState: BuzzerState = {
    roundNumber: (room.buzzerState?.roundNumber ?? 0) + 1,
    publicCards: cards,
    roundTimerElapsed: 0,
    roundTimerPaused: false,
    currentAnswerPlayerId: null,
    answerStartAt: null,
    noSolutionVotes: [],
    playerStates,
  };

  return { ...room, buzzerState: newState };
}

// ─── 搶答 ────────────────────────────────────────────────────────────────────

export function processBuzzIn(
  room: Room,
  playerId: string,
): BuzzInResult {
  const state = room.buzzerState;
  if (!state) return { success: false, reason: 'not_found' };
  if (state.currentAnswerPlayerId !== null) return { success: false, reason: 'already_answering' };

  const ps = state.playerStates[playerId];
  if (!ps) return { success: false, reason: 'not_found' };
  if (ps.isLocked) return { success: false, reason: 'player_locked' };

  const newState: BuzzerState = {
    ...state,
    currentAnswerPlayerId: playerId,
    answerStartAt: Date.now(),
    roundTimerPaused: true,
  };

  return { success: true, room: { ...room, buzzerState: newState } };
}

// ─── 計分 ────────────────────────────────────────────────────────────────────

export function calculateBuzzerScore(
  selectedCards: SelectedCard[],
  streak: number,
  streakBonus: BuzzerSettings['streakBonus'],
): { base: number; streakBonus: number; total: number } {
  let base = 0;

  const plusMinusCount = selectedCards.filter(
    c => c.symbol && [Symbol.Plus, Symbol.Minus].includes(c.symbol),
  ).length;
  const timesCount = selectedCards.filter(c => c.symbol === Symbol.Times).length;
  const divideCount = selectedCards.filter(c => c.symbol === Symbol.Divide).length;

  base += plusMinusCount;
  base += timesCount * 2;
  base += divideCount * 3;
  if (timesCount >= 2) base += 1;
  if (divideCount >= 2) base += 1;

  let bonus = 0;
  if (streakBonus === 'n1') bonus = streak;
  else if (streakBonus === 'n2') bonus = streak * 2;

  return { base, streakBonus: bonus, total: base + bonus };
}

function _applyScoreFloor(score: number, floor: BuzzerSettings['scoreFloor']): number {
  if (floor === null) return score;
  return Math.max(score, floor);
}

// ─── 作答處理 ────────────────────────────────────────────────────────────────

export function processBuzzerAnswer(
  room: Room,
  playerId: string,
  selectedCards: SelectedCard[],
): BuzzerAnswerResult {
  const state = room.buzzerState;
  if (!state) return { success: false, error: 'buzzer state 不存在' };
  if (state.currentAnswerPlayerId !== playerId) return { success: false, error: '你目前沒有搶答資格' };

  const settings = room.settings.buzzerSettings ?? DEFAULT_BUZZER_SETTINGS;
  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return { success: false, error: '玩家不存在' };

  // 驗證數字牌必須全部來自公共牌，且每張最多用一次
  const usedCardIds = selectedCards.filter(c => c.number).map(c => c.number!.id);
  const publicIds = state.publicCards.map(c => c.id);

  if (usedCardIds.length !== 4) {
    return _handleAnswerFail(room, playerId, playerIndex, settings, '必須使用全部 4 張公共牌');
  }
  const allFromPublic = usedCardIds.every(id => publicIds.includes(id));
  const noDuplicate = new Set(usedCardIds).size === 4;
  if (!allFromPublic || !noDuplicate) {
    return _handleAnswerFail(room, playerId, playerIndex, settings, '牌組不合法');
  }

  // 驗算結果
  let result: number;
  try {
    const expr = selectedCards.map(c => c.number ? c.number.value : c.symbol).join('');
    result = evaluate(expr);
  } catch {
    return _handleAnswerFail(room, playerId, playerIndex, settings, '算式有誤');
  }

  if (Math.abs(result - 24) > 1e-6) {
    return _handleAnswerFail(room, playerId, playerIndex, settings, `答案為 ${result}，不等於 24`);
  }

  // 答對：計算分數
  const ps = state.playerStates[playerId];
  const newStreak = ps.streak + 1;
  // ps.streak 是「之前」的連勝數：第 1 次答對時 ps.streak=0（bonus=0），
  // 第 2 次連續答對時 ps.streak=1（bonus=1），符合「連續答對才算連勝」定義
  const { base, streakBonus: bonus, total } = calculateBuzzerScore(selectedCards, ps.streak, settings.streakBonus);

  const newPlayers = [...room.players];
  const rawScore = newPlayers[playerIndex].score + total;
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    score: _applyScoreFloor(rawScore, settings.scoreFloor),
  };

  const newPlayerStates = {
    ...state.playerStates,
    [playerId]: { isLocked: false, lockUntil: null, streak: newStreak },
  };

  const newState: BuzzerState = {
    ...state,
    currentAnswerPlayerId: null,
    answerStartAt: null,
    roundTimerPaused: false,
    playerStates: newPlayerStates,
  };

  const newRoom = { ...room, players: newPlayers, buzzerState: newState };

  // 勝利判定
  const winner = newPlayers[playerIndex].score >= settings.winScore
    ? newPlayers[playerIndex]
    : undefined;

  return { success: true, room: newRoom, scoreDelta: total, streak: newStreak, streakBonus: bonus, winner };
}

function _handleAnswerFail(
  room: Room,
  playerId: string,
  playerIndex: number,
  settings: BuzzerSettings,
  error: string,
): BuzzerAnswerResult {
  const state = room.buzzerState!;
  const newPlayers = [...room.players];
  const rawScore = newPlayers[playerIndex].score - settings.penaltyPoints;
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    score: _applyScoreFloor(rawScore, settings.scoreFloor),
  };

  const lockUntil = settings.penaltyPoints > 0 || settings.lockSeconds > 0
    ? Date.now() + settings.lockSeconds * 1000
    : null;

  const newPlayerStates = {
    ...state.playerStates,
    [playerId]: {
      isLocked: lockUntil !== null,
      lockUntil,
      streak: 0, // 失敗重置 streak
    },
  };

  const newState: BuzzerState = {
    ...state,
    currentAnswerPlayerId: null,
    answerStartAt: null,
    roundTimerPaused: false,
    playerStates: newPlayerStates,
  };

  const failedRoom = { ...room, players: newPlayers, buzzerState: newState };
  return { success: false, error, room: failedRoom, scoreDelta: -settings.penaltyPoints } as BuzzerAnswerFailed as unknown as BuzzerAnswerResult;
}

// 失敗時帶 room 的型別（供 index.ts 取用更新後的 room）
export type BuzzerAnswerFailed = {
  success: false;
  error: string;
  room: Room;
  scoreDelta: number;
};

// ─── 超時處理 ────────────────────────────────────────────────────────────────

/** 作答超時：等同作答失敗（不傳入 selectedCards） */
export function processBuzzerAnswerTimeout(room: Room, playerId: string): BuzzerAnswerFailed {
  const state = room.buzzerState;
  if (!state) return { success: false, error: 'buzzer state 不存在', room, scoreDelta: 0 };

  const settings = room.settings.buzzerSettings ?? DEFAULT_BUZZER_SETTINGS;
  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return { success: false, error: '玩家不存在', room, scoreDelta: 0 };

  const newPlayers = [...room.players];
  const rawScore = newPlayers[playerIndex].score - settings.penaltyPoints;
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    score: _applyScoreFloor(rawScore, settings.scoreFloor),
  };

  const lockUntil = Date.now() + settings.lockSeconds * 1000;

  const newPlayerStates = {
    ...state.playerStates,
    [playerId]: { isLocked: true, lockUntil, streak: 0 },
  };

  const newState: BuzzerState = {
    ...state,
    currentAnswerPlayerId: null,
    answerStartAt: null,
    roundTimerPaused: false,
    playerStates: newPlayerStates,
  };

  return {
    success: false,
    error: '作答超時',
    room: { ...room, players: newPlayers, buzzerState: newState },
    scoreDelta: -settings.penaltyPoints,
  };
}

// ─── 無解投票 ────────────────────────────────────────────────────────────────

export function processNoSolutionVote(room: Room, playerId: string): NoSolutionVoteResult {
  const state = room.buzzerState;
  if (!state) return { passed: false, votes: [] };

  if (state.noSolutionVotes.includes(playerId)) {
    return { passed: false, votes: state.noSolutionVotes };
  }

  const newVotes = [...state.noSolutionVotes, playerId];
  const totalPlayers = room.players.filter(p => !p.isDisconnected).length;
  const passed = newVotes.length > totalPlayers / 2;

  if (passed) {
    const newState: BuzzerState = { ...state, noSolutionVotes: newVotes };
    return { passed: true, room: { ...room, buzzerState: newState } };
  }

  const newState: BuzzerState = { ...state, noSolutionVotes: newVotes };
  return { passed: false, votes: newVotes, room: { ...room, buzzerState: newState } } as NoSolutionVoteResult;
}

// ─── 回合超時 ────────────────────────────────────────────────────────────────

export function applyRoundTimeout(room: Room): RoundTimeoutResult {
  const settings = room.settings.buzzerSettings ?? DEFAULT_BUZZER_SETTINGS;
  if (settings.roundTimeoutPenalty === 0) return { success: true, room };
  if (settings.roundSeconds === null) return { success: true, room };

  const newPlayers = room.players.map(p => ({
    ...p,
    score: _applyScoreFloor(p.score - settings.roundTimeoutPenalty, settings.scoreFloor),
  }));

  // 全體扣分時重置所有玩家的連勝紀錄
  const state = room.buzzerState;
  if (state) {
    const newPlayerStates = Object.fromEntries(
      Object.entries(state.playerStates).map(([id, ps]) => [id, { ...ps, streak: 0 }]),
    );
    return { success: true, room: { ...room, players: newPlayers, buzzerState: { ...state, playerStates: newPlayerStates } } };
  }

  return { success: true, room: { ...room, players: newPlayers } };
}

// ─── 玩家解鎖 ─────────────────────────────────────────────────────────────────

export function unlockPlayer(room: Room, playerId: string): Room {
  const state = room.buzzerState;
  if (!state) return room;

  const newPlayerStates = {
    ...state.playerStates,
    [playerId]: { ...state.playerStates[playerId], isLocked: false, lockUntil: null },
  };

  return { ...room, buzzerState: { ...state, playerStates: newPlayerStates } };
}
