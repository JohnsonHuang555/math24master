import { v4 as uuidv4 } from 'uuid';
import { checkAnswer } from '../lib/answer-check';
import { canMake24 } from '../lib/daily-seed';
import { ErrorCode } from '../models/ErrorCode';
import { NumberCard, Player } from '../models/Player';
import {
  BuzzerPlayerState,
  BuzzerSettings,
  BuzzerState,
  DEFAULT_BUZZER_SETTINGS,
  Room,
} from '../models/Room';
import { SelectedCard } from '../models/SelectedCard';
import { Symbol } from '../models/Symbol';

// ─── 型別 ───────────────────────────────────────────────────────────────────

export type BuzzInResult =
  | { success: true; room: Room }
  | {
      success: false;
      reason: 'already_answering' | 'player_locked' | 'not_open' | 'not_found';
    };

/**
 * 作答結果：
 * - correct：答對，room 已加分並關閉這一題
 * - wrong：作答者答錯（扣分、鎖定），room 已更新
 * - rejected：不是作答者、題目不存在等，房間狀態完全不變（不能拿 room 去更新）
 */
export type BuzzerAnswerResult =
  | {
      kind: 'correct';
      room: Room;
      scoreDelta: number;
      streak: number;
      streakBonus: number;
      winner?: Player;
    }
  | { kind: 'wrong'; room: Room; error: ErrorCode; scoreDelta: number }
  | { kind: 'rejected'; error: ErrorCode };

export type NoSolutionVoteResult =
  | { status: 'rejected' }
  | { status: 'counted'; room: Room; votes: string[] }
  | { status: 'passed'; room: Room };

export type RoundTimeoutResult =
  { success: true; room: Room } | { success: false; error: ErrorCode };

// ─── 牌組產生 ────────────────────────────────────────────────────────────────

/** 從 1~maxValue 隨機產生 4 張可湊出 24 的公共牌 */
export function generateSolvableCards(maxValue: 10 | 13): NumberCard[] {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const values = Array.from(
      { length: 4 },
      () => Math.floor(Math.random() * maxValue) + 1,
    );
    if (canMake24(values)) {
      return values.map(value => ({ id: uuidv4(), value }));
    }
  }
  // 萬一 1000 次都失敗，回傳保底可解牌組
  return [
    { id: uuidv4(), value: 1 },
    { id: uuidv4(), value: 2 },
    { id: uuidv4(), value: 3 },
    { id: uuidv4(), value: 4 },
  ];
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
    const isLocked = settings.clearLockOnNewRound
      ? false
      : (prev?.isLocked ?? false);
    const lockUntil = settings.clearLockOnNewRound
      ? null
      : (prev?.lockUntil ?? null);
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
    // 先倒數，倒數結束（openBuzzerRound）才開放搶答
    roundOpen: false,
  };

  return { ...room, buzzerState: newState };
}

/** 倒數結束、開放搶答 */
export function openBuzzerRound(room: Room): Room {
  if (!room.buzzerState) return room;
  return { ...room, buzzerState: { ...room.buzzerState, roundOpen: true } };
}

// ─── 搶答 ────────────────────────────────────────────────────────────────────

export function processBuzzIn(room: Room, playerId: string): BuzzInResult {
  const state = room.buzzerState;
  if (!state) return { success: false, reason: 'not_found' };
  // 倒數中、已經有人答對、投票通過或回合超時：這一題不開放
  if (room.status !== 'playing' || !state.roundOpen)
    return { success: false, reason: 'not_open' };
  if (state.currentAnswerPlayerId !== null)
    return { success: false, reason: 'already_answering' };

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
  const timesCount = selectedCards.filter(
    c => c.symbol === Symbol.Times,
  ).length;
  const divideCount = selectedCards.filter(
    c => c.symbol === Symbol.Divide,
  ).length;

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

function _applyScoreFloor(
  score: number,
  floor: BuzzerSettings['scoreFloor'],
): number {
  if (floor === null) return score;
  return Math.max(score, floor);
}

// ─── 作答處理 ────────────────────────────────────────────────────────────────

const VALID_SYMBOLS = new Set<string>(Object.values(Symbol));

/**
 * 把前端送來的算式換成伺服器版本：數字牌只認 id，數值一律取公共牌；
 * 符號必須是合法的運算符號或括號。格式不對回傳 null
 */
function _normalizeTokens(
  input: unknown,
  publicCards: NumberCard[],
): SelectedCard[] | null {
  if (!Array.isArray(input) || input.length > 32) return null;
  const tokens: SelectedCard[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') return null;
    const token = raw as SelectedCard;
    if (token.number) {
      const card = publicCards.find(c => c.id === token.number?.id);
      // 不是這題的牌：保留 id 讓後面判定為 InvalidCards，數值不採用
      tokens.push({
        number: card
          ? { ...card }
          : { id: String(token.number.id), value: NaN },
      });
    } else if (
      typeof token.symbol === 'string' &&
      VALID_SYMBOLS.has(token.symbol)
    ) {
      tokens.push({ symbol: token.symbol });
    } else {
      return null;
    }
  }
  return tokens;
}

export function processBuzzerAnswer(
  room: Room,
  playerId: string,
  selectedCards: unknown,
): BuzzerAnswerResult {
  const state = room.buzzerState;
  if (!state) return { kind: 'rejected', error: ErrorCode.BuzzerNotStarted };
  if (state.currentAnswerPlayerId !== playerId)
    return { kind: 'rejected', error: ErrorCode.NotAnsweringPlayer };

  const settings = room.settings.buzzerSettings ?? DEFAULT_BUZZER_SETTINGS;
  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1)
    return { kind: 'rejected', error: ErrorCode.PlayerNotFound };

  const fail = (error: ErrorCode) =>
    _handleAnswerFail(room, playerId, playerIndex, settings, error);

  const tokens = _normalizeTokens(selectedCards, state.publicCards);
  if (!tokens) return fail(ErrorCode.InvalidEquation);

  // 驗證數字牌必須全部來自公共牌，且每張最多用一次
  const usedCardIds = tokens.filter(c => c.number).map(c => c.number!.id);
  const publicIds = state.publicCards.map(c => c.id);
  if (usedCardIds.length !== 4) return fail(ErrorCode.MustUseAllCards);
  const allFromPublic = usedCardIds.every(id => publicIds.includes(id));
  const noDuplicate = new Set(usedCardIds).size === 4;
  if (!allFromPublic || !noDuplicate) return fail(ErrorCode.InvalidCards);

  // 以伺服器的牌值驗算：數字與符號交替、括號平衡、等於 24
  const check = checkAnswer(publicIds, tokens);
  if (!check.ok) {
    return fail(
      check.error === 'NOT_24'
        ? ErrorCode.AnswerNot24
        : ErrorCode.InvalidEquation,
    );
  }

  // 答對：計算分數
  const ps = state.playerStates[playerId] ?? {
    isLocked: false,
    lockUntil: null,
    streak: 0,
  };
  const newStreak = ps.streak + 1;
  // ps.streak 是「之前」的連勝數：第 1 次答對時 ps.streak=0（bonus=0），
  // 第 2 次連續答對時 ps.streak=1（bonus=1），符合「連續答對才算連勝」定義
  const { streakBonus: bonus, total } = calculateBuzzerScore(
    tokens,
    ps.streak,
    settings.streakBonus,
  );

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
    // 這一題已經有人答對，換下一題前不再開放搶答
    roundOpen: false,
  };

  const newRoom = { ...room, players: newPlayers, buzzerState: newState };

  // 勝利判定
  const winner =
    newPlayers[playerIndex].score >= settings.winScore
      ? newPlayers[playerIndex]
      : undefined;

  return {
    kind: 'correct',
    room: newRoom,
    scoreDelta: total,
    streak: newStreak,
    streakBonus: bonus,
    winner,
  };
}

function _handleAnswerFail(
  room: Room,
  playerId: string,
  playerIndex: number,
  settings: BuzzerSettings,
  error: ErrorCode,
): BuzzerAnswerResult {
  const state = room.buzzerState!;
  const newPlayers = [...room.players];
  const rawScore = newPlayers[playerIndex].score - settings.penaltyPoints;
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    score: _applyScoreFloor(rawScore, settings.scoreFloor),
  };

  const lockUntil =
    settings.penaltyPoints > 0 || settings.lockSeconds > 0
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
  return {
    kind: 'wrong',
    error,
    room: failedRoom,
    scoreDelta: -settings.penaltyPoints,
  };
}

/** 作答超時的結果：room 一定可以套用 */
export type BuzzerAnswerFailed = {
  error: ErrorCode;
  room: Room;
  scoreDelta: number;
};

// ─── 超時處理 ────────────────────────────────────────────────────────────────

/** 作答超時：等同作答失敗（不傳入 selectedCards） */
export function processBuzzerAnswerTimeout(
  room: Room,
  playerId: string,
): BuzzerAnswerFailed {
  const state = room.buzzerState;
  if (!state)
    return {
      error: ErrorCode.BuzzerNotStarted,
      room,
      scoreDelta: 0,
    };

  const settings = room.settings.buzzerSettings ?? DEFAULT_BUZZER_SETTINGS;
  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    // 作答者已經離開：只收回作答權，避免這一題卡住沒人能搶
    return {
      error: ErrorCode.PlayerNotFound,
      room: {
        ...room,
        buzzerState: {
          ...state,
          currentAnswerPlayerId:
            state.currentAnswerPlayerId === playerId
              ? null
              : state.currentAnswerPlayerId,
          answerStartAt: null,
          roundTimerPaused: false,
        },
      },
      scoreDelta: 0,
    };
  }

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
    error: ErrorCode.AnswerTimeout,
    room: { ...room, players: newPlayers, buzzerState: newState },
    scoreDelta: -settings.penaltyPoints,
  };
}

// ─── 無解投票 ────────────────────────────────────────────────────────────────

export function processNoSolutionVote(
  room: Room,
  playerId: string,
): NoSolutionVoteResult {
  const state = room.buzzerState;
  // 只有這一題的參與者、在開放搶答且沒人作答時才能投票
  if (
    !state ||
    room.status !== 'playing' ||
    !state.roundOpen ||
    state.currentAnswerPlayerId !== null ||
    !state.playerStates[playerId]
  ) {
    return { status: 'rejected' };
  }

  if (state.noSolutionVotes.includes(playerId)) {
    return { status: 'counted', room, votes: state.noSolutionVotes };
  }

  const newVotes = [...state.noSolutionVotes, playerId];
  const totalPlayers = room.players.filter(p => !p.isDisconnected).length;
  const passed = newVotes.length > totalPlayers / 2;

  if (passed) {
    const newState: BuzzerState = {
      ...state,
      noSolutionVotes: newVotes,
      roundOpen: false,
    };
    return { status: 'passed', room: { ...room, buzzerState: newState } };
  }

  const newState: BuzzerState = { ...state, noSolutionVotes: newVotes };
  return {
    status: 'counted',
    votes: newVotes,
    room: { ...room, buzzerState: newState },
  };
}

// ─── 回合超時 ────────────────────────────────────────────────────────────────

export function applyRoundTimeout(roomBefore: Room): RoundTimeoutResult {
  // 回合時間到：這一題關閉，換題前不再開放搶答
  const room: Room = roomBefore.buzzerState
    ? {
        ...roomBefore,
        buzzerState: { ...roomBefore.buzzerState, roundOpen: false },
      }
    : roomBefore;
  const settings = room.settings.buzzerSettings ?? DEFAULT_BUZZER_SETTINGS;
  if (settings.roundTimeoutPenalty === 0) return { success: true, room };
  if (settings.roundSeconds === null) return { success: true, room };

  const newPlayers = room.players.map(p => ({
    ...p,
    score: _applyScoreFloor(
      p.score - settings.roundTimeoutPenalty,
      settings.scoreFloor,
    ),
  }));

  // 全體扣分時重置所有玩家的連勝紀錄
  const state = room.buzzerState;
  if (state) {
    const newPlayerStates = Object.fromEntries(
      Object.entries(state.playerStates).map(([id, ps]) => [
        id,
        { ...ps, streak: 0 },
      ]),
    );
    return {
      success: true,
      room: {
        ...room,
        players: newPlayers,
        buzzerState: { ...state, playerStates: newPlayerStates },
      },
    };
  }

  return { success: true, room: { ...room, players: newPlayers } };
}

// ─── 玩家解鎖 ─────────────────────────────────────────────────────────────────

export function unlockPlayer(room: Room, playerId: string): Room {
  const state = room.buzzerState;
  // 玩家已離開（或這一題沒有他）就不要憑空建立狀態
  if (!state || !state.playerStates[playerId]) return room;

  const newPlayerStates = {
    ...state.playerStates,
    [playerId]: {
      ...state.playerStates[playerId],
      isLocked: false,
      lockUntil: null,
    },
  };

  return { ...room, buzzerState: { ...state, playerStates: newPlayerStates } };
}
