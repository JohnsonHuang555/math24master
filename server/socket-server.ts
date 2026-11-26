import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { containsProfanity } from '../lib/profanity';
import { ErrorCode } from '../models/ErrorCode';
import { GameMode } from '../models/GameMode';
import { GameStatus } from '../models/GameStatus';
import { Message, SystemMessageCode } from '../models/Message';
import { DEFAULT_BUZZER_SETTINGS, QUICK_MATCH, Room } from '../models/Room';
import { SocketEvent } from '../models/SocketEvent';
import {
  applyRoundTimeout,
  openBuzzerRound,
  processBuzzIn,
  processBuzzerAnswer,
  processBuzzerAnswerTimeout,
  processNoSolutionVote,
  startBuzzerRound,
  unlockPlayer,
} from './buzzer';
import { BuzzerBotHooks, triggerBuzzerBot } from './buzzer-bot';
import {
  type TurnResult,
  addBotToRoom,
  applyBuzzerRoomUpdate,
  backCard,
  canStartGame,
  checkCanJoinRoom,
  createQuickMatchRoom,
  discardCard,
  drawCard,
  editRoom,
  editRoomSettings,
  endBuzzerGame,
  findQuickMatchRoom,
  finishQuickMatch,
  getCurrentRoom,
  getCurrentRoomId,
  getCurrentRooms,
  getPlayerName,
  handleTurnTimeout,
  isRoomMember,
  joinRoom,
  leaveRoom,
  markPlayerDisconnected,
  peekReconnectToken,
  playCard,
  readyGame,
  reconnectPlayer,
  removePlayer,
  reselectCard,
  selectCard,
  skipHand,
  startGame,
  updateScore,
} from './game';
import {
  emitBuzzerGameOver,
  emitGameOver,
  emitJoinRoomSuccess,
  emitJoinRoomSuccessTo,
  emitPlayerReconnectSuccess,
  emitRoomList,
  emitRoomUpdate,
  setSocketPlayer,
} from './room-emitter';

/** 各種等待時間；正式環境用預設值，測試可以縮短 */
export type GameServerOptions = {
  /** 房主按開始後的倒數秒數 */
  startCountdownSeconds: number;
  /** 搶答：開局到第一題的延遲 */
  buzzerStartDelayMs: number;
  /** 搶答：每題亮牌後到開放搶答的倒數秒數 */
  buzzerCountdownSeconds: number;
  /** 搶答：答對、投票通過後換下一題的延遲 */
  buzzerNextRoundDelayMs: number;
  /** 搶答：回合超時後換下一題的延遲 */
  buzzerTimeoutNextRoundDelayMs: number;
  /** 搶答：答錯或超時後恢復回合計時的延遲 */
  buzzerResumeDelayMs: number;
  /** 搶答：分出勝負後回到等待狀態的延遲 */
  buzzerGameOverResetMs: number;
  /** 斷線寬限期：遊戲進行中（行動裝置切到背景需要較長時間回來） */
  disconnectGracePlayingMs: number;
  /** 斷線寬限期：等待中（重新整理幾秒內就會回來，太長會讓空位卡住無法開局） */
  disconnectGraceIdleMs: number;
  /** 快速配對等真人的秒數；時間到由電腦補位開局 */
  quickMatchWaitSeconds: number;
};

export const DEFAULT_GAME_SERVER_OPTIONS: GameServerOptions = {
  startCountdownSeconds: 5,
  buzzerStartDelayMs: 600,
  buzzerCountdownSeconds: 3,
  buzzerNextRoundDelayMs: 1500,
  buzzerTimeoutNextRoundDelayMs: 2000,
  buzzerResumeDelayMs: 1500,
  buzzerGameOverResetMs: 3000,
  disconnectGracePlayingMs: 300_000,
  disconnectGraceIdleMs: 30_000,
  quickMatchWaitSeconds: QUICK_MATCH.waitSeconds,
};

type BuzzerRoundTimer = {
  timer: NodeJS.Timeout | null;
  elapsed: number; // 已過秒數
  total: number; // 總秒數（roundSeconds）
};

const INTENTIONAL_DISCONNECT_REASONS = new Set([
  'client namespace disconnect',
  'server namespace disconnect',
]);

/**
 * 掛上所有遊戲事件。玩家的身分以「玩家 id」為準：
 * 第一次加入房間時等於當下的 socket.id，之後斷線重連換了 socket，玩家 id 不變，
 * 回合順序、搶答狀態與各種計時器都不受影響。所有操作都用這個 id 向 game.ts 驗證身分與權限，
 * 前端送來的 playerId 一律不採信（踢人時的目標除外）
 */
export function attachGameServer(
  io: Server,
  overrides: Partial<GameServerOptions> = {},
) {
  const options = { ...DEFAULT_GAME_SERVER_OPTIONS, ...overrides };

  // ── 連線與玩家的對應 ────────────────────────────────────────────────────────
  const playerOfSocket = new Map<string, string>();
  const socketOfPlayer = new Map<string, string>();

  const playerIdOf = (socket: Socket) =>
    playerOfSocket.get(socket.id) ?? socket.id;

  /**
   * 舊連線被同一位玩家的新連線取代（另一個分頁、重新整理時舊連線還沒斷）：
   * 退出房間頻道、改成一個全新的空身分，之後它送的操作不會再算在原本的玩家身上
   * （第一位玩家的 id 等於他最初的 socket.id，不換掉的話舊分頁仍會被當成本人）
   */
  const _retireSocket = (socketId: string, playerId: string) => {
    playerOfSocket.set(socketId, uuidv4());
    const previous = io.sockets.sockets.get(socketId);
    if (!previous) return;
    // 不再代表任何房內玩家：之後收到的房間資料不含任何人的私人資料
    setSocketPlayer(previous, undefined);
    const roomId = getCurrentRoomId(playerId);
    if (roomId) previous.leave(roomId);
    previous.emit(SocketEvent.SessionReplaced);
  };

  /**
   * 把 socket 綁到玩家。一個 socket 已經代表另一位還在房間裡的玩家時拒絕，
   * 要先走完離房流程才能換人，否則原本的玩家會變成沒有連線、也不會被清掉的幽靈玩家
   */
  const bindSocket = (socket: Socket, playerId: string): boolean => {
    const current = playerOfSocket.get(socket.id);
    if (current && current !== playerId && getCurrentRoomId(current)) {
      return false;
    }
    const previousSocketId = socketOfPlayer.get(playerId);
    if (previousSocketId && previousSocketId !== socket.id) {
      _retireSocket(previousSocketId, playerId);
    }
    if (current && current !== playerId) {
      if (socketOfPlayer.get(current) === socket.id) {
        socketOfPlayer.delete(current);
      }
    }
    playerOfSocket.set(socket.id, playerId);
    socketOfPlayer.set(playerId, socket.id);
    setSocketPlayer(socket, playerId);
    return true;
  };

  const unbindSocket = (socketId: string) => {
    const playerId = playerOfSocket.get(socketId);
    playerOfSocket.delete(socketId);
    if (playerId && socketOfPlayer.get(playerId) === socketId) {
      socketOfPlayer.delete(playerId);
    }
  };

  // ── 計時器（全部以房間為單位，房間刪除時一起清掉） ─────────────────────────
  const turnTimerMap = new Map<
    string,
    { timer: NodeJS.Timeout; countdownTime: number }
  >();
  const disconnectGraceTimerMap = new Map<string, NodeJS.Timeout>(); // key = playerId
  const buzzerRoundTimerMap = new Map<string, BuzzerRoundTimer>();
  const buzzerAnswerTimerMap = new Map<string, NodeJS.Timeout>(); // key = roomId
  const buzzerLockTimerMap = new Map<string, NodeJS.Timeout>(); // key = roomId:playerId
  const buzzerCountdownMap = new Map<string, NodeJS.Timeout>(); // 亮牌後的倒數
  const buzzerScheduleMap = new Map<string, NodeJS.Timeout>(); // 下一題 / 結束重設
  const buzzerResumeMap = new Map<string, NodeJS.Timeout>();
  const startCountdownMap = new Map<string, ReturnType<typeof setTimeout>[]>();
  const quickMatchTimerMap = new Map<
    string,
    {
      timer: ReturnType<typeof setInterval> | null;
      secondsLeft: number;
    }
  >();

  const _clearTurnTimer = (roomId: string) => {
    const entry = turnTimerMap.get(roomId);
    if (entry) clearInterval(entry.timer);
    turnTimerMap.delete(roomId);
  };

  const _clearBuzzerAnswerTimer = (roomId: string) => {
    const t = buzzerAnswerTimerMap.get(roomId);
    if (t) clearTimeout(t);
    buzzerAnswerTimerMap.delete(roomId);
  };

  const _clearBuzzerRoundTimer = (roomId: string) => {
    const entry = buzzerRoundTimerMap.get(roomId);
    if (entry?.timer) clearInterval(entry.timer);
    buzzerRoundTimerMap.delete(roomId);
  };

  const _clearBuzzerTimers = (roomId: string) => {
    _clearBuzzerAnswerTimer(roomId);
    _clearBuzzerRoundTimer(roomId);
    for (const map of [
      buzzerCountdownMap,
      buzzerScheduleMap,
      buzzerResumeMap,
    ]) {
      const t = map.get(roomId);
      if (t) {
        clearTimeout(t);
        clearInterval(t);
      }
      map.delete(roomId);
    }
    for (const [key, t] of buzzerLockTimerMap) {
      if (key.startsWith(`${roomId}:`)) {
        clearTimeout(t);
        buzzerLockTimerMap.delete(key);
      }
    }
  };

  const _clearQuickMatchTimer = (roomId: string) => {
    const entry = quickMatchTimerMap.get(roomId);
    if (!entry) return;
    if (entry.timer) clearInterval(entry.timer);
    quickMatchTimerMap.delete(roomId);
  };

  /** 房間被刪除或回到等待中：停掉這間房所有遊戲計時器 */
  const _clearRoomTimers = (roomId: string) => {
    _clearTurnTimer(roomId);
    _clearBuzzerTimers(roomId);
    const countdown = startCountdownMap.get(roomId);
    countdown?.forEach(clearTimeout);
    startCountdownMap.delete(roomId);
  };

  // ── 搶答模式 ───────────────────────────────────────────────────────────────

  const _scheduleBuzzer = (roomId: string, delay: number, fn: () => void) => {
    const existing = buzzerScheduleMap.get(roomId);
    if (existing) clearTimeout(existing);
    buzzerScheduleMap.set(
      roomId,
      setTimeout(() => {
        buzzerScheduleMap.delete(roomId);
        fn();
      }, delay),
    );
  };

  /** 換下一題：只保留最後一次排程，答對與超時同時發生也只會開一題 */
  const _scheduleNextBuzzerRound = (roomId: string, delay: number) => {
    _clearBuzzerRoundTimer(roomId);
    _clearBuzzerAnswerTimer(roomId);
    _scheduleBuzzer(roomId, delay, () =>
      _startBuzzerRoundWithCountdown(roomId),
    );
  };

  const _pauseBuzzerRoundTimer = (roomId: string) => {
    const entry = buzzerRoundTimerMap.get(roomId);
    if (!entry || !entry.timer) return;
    clearInterval(entry.timer);
    entry.timer = null;
    io.to(roomId).emit(SocketEvent.BuzzerRoundTimerPaused, {
      elapsedSeconds: entry.elapsed,
    });
  };

  const _resumeBuzzerRoundTimer = (roomId: string) => {
    const entry = buzzerRoundTimerMap.get(roomId);
    if (!entry || entry.timer) return;
    const room = getCurrentRoom(roomId);
    // 有人正在作答（例如答錯後 1.5 秒內又有人搶到）就不要恢復
    if (!room || room.buzzerState?.currentAnswerPlayerId) return;
    const remaining = entry.total - entry.elapsed;
    io.to(roomId).emit(SocketEvent.BuzzerRoundTimerResumed, {
      remainingSeconds: remaining,
    });
    entry.timer = setInterval(() => {
      entry.elapsed += 1;
      if (entry.elapsed < entry.total) return;
      _clearBuzzerRoundTimer(roomId);
      const current = getCurrentRoom(roomId);
      if (
        !current ||
        current.status !== GameStatus.Playing ||
        current.isGameOver
      )
        return;
      const result = applyRoundTimeout(current);
      if (!result.success) return;
      const updated = applyBuzzerRoomUpdate(result.room);
      if (!updated) return;
      // 分數變化由接著的 RoomUpdate（公開玩家資料）帶出，這裡不送內部的 players
      io.to(roomId).emit(SocketEvent.BuzzerRoundTimeout, {
        penaltyPoints:
          updated.settings.buzzerSettings?.roundTimeoutPenalty ?? 1,
      });
      emitRoomUpdate(io, updated);
      _scheduleNextBuzzerRound(roomId, options.buzzerTimeoutNextRoundDelayMs);
    }, 1000);
  };

  const _scheduleResume = (roomId: string) => {
    const existing = buzzerResumeMap.get(roomId);
    if (existing) clearTimeout(existing);
    buzzerResumeMap.set(
      roomId,
      setTimeout(() => {
        buzzerResumeMap.delete(roomId);
        const room = getCurrentRoom(roomId);
        const settings =
          room?.settings.buzzerSettings ?? DEFAULT_BUZZER_SETTINGS;
        if (settings.roundSeconds !== null) _resumeBuzzerRoundTimer(roomId);
      }, options.buzzerResumeDelayMs),
    );
  };

  /** 電腦的搶答動作走和真人相同的計時器流程 */
  const botHooks: BuzzerBotHooks = {
    onBuzzIn: rid => _pauseBuzzerRoundTimer(rid),
    onWrongAnswer: rid => _scheduleResume(rid),
    onCorrectAnswer: rid =>
      _scheduleNextBuzzerRound(rid, options.buzzerNextRoundDelayMs),
    onWin: (rid, room, winner) => _finishBuzzerGame(rid, room, winner),
  };

  const _startBuzzerRoundWithCountdown = (roomId: string) => {
    const room = getCurrentRoom(roomId);
    // 已經分出勝負：等重設為等待中，不再開新題
    if (!room || room.status !== GameStatus.Playing || room.isGameOver) return;

    _clearBuzzerAnswerTimer(roomId);
    _clearBuzzerRoundTimer(roomId);
    const previousCountdown = buzzerCountdownMap.get(roomId);
    if (previousCountdown) clearInterval(previousCountdown);

    const updated = applyBuzzerRoomUpdate(startBuzzerRound(room));
    if (!updated || !updated.buzzerState) return;
    const roundNumber = updated.buzzerState.roundNumber;
    const settings = updated.settings.buzzerSettings ?? DEFAULT_BUZZER_SETTINGS;

    io.to(roomId).emit(SocketEvent.BuzzerRoundStart, {
      publicCards: updated.buzzerState.publicCards,
      roundNumber,
      roundSeconds: settings.roundSeconds,
    });

    const open = () => {
      buzzerCountdownMap.delete(roomId);
      const current = getCurrentRoom(roomId);
      if (
        !current ||
        current.status !== GameStatus.Playing ||
        current.buzzerState?.roundNumber !== roundNumber
      ) {
        return;
      }
      applyBuzzerRoomUpdate(openBuzzerRound(current));
      io.to(roomId).emit(SocketEvent.BuzzerOpen);
      triggerBuzzerBot(roomId, io, botHooks);
      if (settings.roundSeconds !== null) {
        buzzerRoundTimerMap.set(roomId, {
          timer: null,
          elapsed: 0,
          total: settings.roundSeconds,
        });
        _resumeBuzzerRoundTimer(roomId);
      }
    };

    // 亮牌後倒數，倒數結束才開放搶答（伺服器以 roundOpen 把關，前端提早送也無效）
    let count = options.buzzerCountdownSeconds;
    if (count <= 0) {
      open();
      return;
    }
    const countdown = setInterval(() => {
      io.to(roomId).emit(SocketEvent.BuzzerCountdown, { countdown: count });
      count--;
      if (count < 0) {
        clearInterval(countdown);
        open();
      }
    }, 1000);
    buzzerCountdownMap.set(roomId, countdown);
  };

  const _startAnswerTimer = (
    roomId: string,
    playerId: string,
    answerSeconds: number,
  ) => {
    _clearBuzzerAnswerTimer(roomId);
    const t = setTimeout(() => {
      buzzerAnswerTimerMap.delete(roomId);
      const room = getCurrentRoom(roomId);
      if (!room || room.buzzerState?.currentAnswerPlayerId !== playerId) return;

      const result = processBuzzerAnswerTimeout(room, playerId);
      const updated = applyBuzzerRoomUpdate(result.room);
      if (!updated) return;

      io.to(roomId).emit(SocketEvent.BuzzerAnswerResult, {
        isCorrect: false,
        playerId,
        scoreDelta: result.scoreDelta,
        newScore: updated.players.find(p => p.id === playerId)?.score ?? 0,
        streak: 0,
        streakBonus: 0,
      });
      emitRoomUpdate(io, updated);
      _announceLock(roomId, updated, playerId);
      _scheduleResume(roomId);
    }, answerSeconds * 1000);
    buzzerAnswerTimerMap.set(roomId, t);
  };

  const _announceLock = (roomId: string, room: Room, playerId: string) => {
    const ps = room.buzzerState?.playerStates[playerId];
    if (!ps?.isLocked || !ps.lockUntil) return;
    const lockSeconds = room.settings.buzzerSettings?.lockSeconds ?? 15;
    io.to(roomId).emit(SocketEvent.BuzzerPlayerLocked, {
      playerId,
      lockSeconds,
      lockUntil: ps.lockUntil,
    });
    const key = `${roomId}:${playerId}`;
    const existing = buzzerLockTimerMap.get(key);
    if (existing) clearTimeout(existing);
    buzzerLockTimerMap.set(
      key,
      setTimeout(() => {
        buzzerLockTimerMap.delete(key);
        const current = getCurrentRoom(roomId);
        if (!current) return;
        const updated = applyBuzzerRoomUpdate(unlockPlayer(current, playerId));
        if (updated)
          io.to(roomId).emit(SocketEvent.BuzzerPlayerUnlocked, { playerId });
      }, lockSeconds * 1000),
    );
  };

  /**
   * 斷線玩家的寬限期：期限內用 token 回來就保留位置，沒回來就當作離開。
   * 同一位玩家重排時取代原本的計時（例如遊戲結束回到等待中，改用等待中的寬限期）
   */
  const _scheduleGraceLeave = (playerId: string, ms: number) => {
    const existing = disconnectGraceTimerMap.get(playerId);
    if (existing) clearTimeout(existing);
    disconnectGraceTimerMap.set(
      playerId,
      setTimeout(() => {
        disconnectGraceTimerMap.delete(playerId);
        // 寬限期內已經重連（有新的 socket）就不處理
        if (socketOfPlayer.has(playerId)) return;
        _handleLeave(playerId);
      }, ms),
    );
  };

  /**
   * 回到等待中：還在斷線寬限期的真人改用等待中的寬限期（較短）。
   * 例如勝負剛確定時斷線，不會因為斷線當下還在遊戲中，就在房裡佔位 5 分鐘
   */
  const _shortenGraceForIdleRoom = (room: Room) => {
    for (const p of room.players) {
      if (p.isDisconnected && disconnectGraceTimerMap.has(p.id)) {
        _scheduleGraceLeave(p.id, options.disconnectGraceIdleMs);
      }
    }
  };

  const _finishBuzzerGame = (
    roomId: string,
    room: Room,
    winner: { id: string; name: string; score: number },
  ) => {
    _clearBuzzerTimers(roomId);
    emitBuzzerGameOver(io, room, winner);
    // 稍後將房間重設為 Idle，讓玩家可以回大廳等待下一局
    _scheduleBuzzer(roomId, options.buzzerGameOverResetMs, () => {
      const idleRoom = endBuzzerGame(roomId);
      if (!idleRoom) return;
      emitRoomUpdate(io, idleRoom);
      _shortenGraceForIdleRoom(idleRoom);
    });
  };

  // ── 傳統對戰：回合計時由伺服器主導 ──────────────────────────────────────────

  /** 重新開始這一回合的倒數；時間到由伺服器直接替目前玩家換人（不再等前端送抽牌） */
  const _startTurnTimer = (roomId: string) => {
    _clearTurnTimer(roomId);
    const room = getCurrentRoom(roomId);
    if (!room || room.status !== GameStatus.Playing) return;
    const seconds = room.settings.remainSeconds;
    if (seconds === null || seconds === undefined) {
      io.to(roomId).emit(SocketEvent.CountdownTimeResponse, undefined);
      return;
    }
    const needDrawPlayerId = room.players.find(
      p => p.playerOrder === room.currentOrder,
    )?.id;
    const entry = {
      countdownTime: seconds,
      timer: setInterval(() => {
        entry.countdownTime -= 1;
        if (entry.countdownTime >= 0) {
          io.to(roomId).emit(SocketEvent.CountdownTimeResponse, {
            countdown: entry.countdownTime,
            needDrawPlayerId,
          });
        }
        if (entry.countdownTime <= 0) {
          _clearTurnTimer(roomId);
          _afterTurn(roomId, handleTurnTimeout(roomId));
        }
      }, 1000),
    };
    turnTimerMap.set(roomId, entry);
    io.to(roomId).emit(SocketEvent.CountdownTimeResponse, {
      countdown: seconds,
      needDrawPlayerId,
    });
  };

  /** 換人之後的共同流程：廣播、重設回合計時、判斷整局結束 */
  const _afterTurn = (roomId: string, result: TurnResult, socket?: Socket) => {
    if (!result.success) {
      if (socket && result.error !== ErrorCode.NotYourTurn) {
        socket.emit(SocketEvent.ErrorMessage, result.error);
      }
      return;
    }
    const { room, winner, handResult, scored } = result;
    emitRoomUpdate(
      io,
      room,
      scored ? { event: SocketEvent.UpdateScore, data: handResult } : undefined,
    );
    if (winner) {
      _clearTurnTimer(roomId);
      emitGameOver(io, room, winner);
      _shortenGraceForIdleRoom(room);
      return;
    }
    _startTurnTimer(roomId);
  };

  // ── 開局 ──────────────────────────────────────────────────────────────────

  const _actuallyStartGame = (roomId: string) => {
    const result = startGame(roomId);
    if (!result.success) {
      io.to(roomId).emit(SocketEvent.ErrorMessage, result.error);
      return;
    }
    const { room } = result;
    emitRoomUpdate(io, room);
    if (room.settings.gameType === 'buzzer') {
      _scheduleBuzzer(roomId, options.buzzerStartDelayMs, () =>
        _startBuzzerRoundWithCountdown(roomId),
      );
      return;
    }
    _startTurnTimer(roomId);
  };

  const _cancelGameCountdown = (roomId: string) => {
    const timers = startCountdownMap.get(roomId);
    if (!timers) return;
    timers.forEach(clearTimeout);
    startCountdownMap.delete(roomId);
    io.to(roomId).emit(SocketEvent.GetMessage, {
      isSystem: true,
      code: SystemMessageCode.CountdownCancelled,
    } satisfies Message);
  };

  const _startGameCountdown = (roomId: string) => {
    if (startCountdownMap.has(roomId)) return;
    const seconds = options.startCountdownSeconds;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < seconds; i++) {
      timers.push(
        setTimeout(() => {
          io.to(roomId).emit(SocketEvent.GetMessage, {
            isSystem: true,
            code: SystemMessageCode.GameStartsIn,
            params: { seconds: seconds - i },
          } satisfies Message);
        }, i * 1000),
      );
    }
    timers.push(
      setTimeout(() => {
        startCountdownMap.delete(roomId);
        // 倒數期間有人加入或取消準備：重新檢查，避免把沒準備好的人發進牌局
        const room = getCurrentRoom(roomId);
        if (
          !room ||
          room.status !== GameStatus.Idle ||
          !room.players.every(p => p.isReady)
        ) {
          return;
        }
        _actuallyStartGame(roomId);
      }, seconds * 1000),
    );
    startCountdownMap.set(roomId, timers);
  };

  // ── 離開房間（主動、SPA 導頁、被踢、寬限期到期共用） ───────────────────────

  const _handleLeave = (playerId: string) => {
    const prevRoomId = getCurrentRoomId(playerId);
    const result = leaveRoom(playerId);
    const socketId = socketOfPlayer.get(playerId);
    if (prevRoomId && socketId) {
      io.sockets.sockets.get(socketId)?.leave(prevRoomId);
    }
    const grace = disconnectGraceTimerMap.get(playerId);
    if (grace) clearTimeout(grace);
    disconnectGraceTimerMap.delete(playerId);
    if (!result) return;

    if ('roomDeleted' in result) {
      _clearRoomTimers(result.roomId);
      _clearQuickMatchTimer(result.roomId);
      return;
    }

    const { room, playerName, wasPlaying, remainingCount, wasAnswering } =
      result;
    const roomId = room.roomId;
    if (!wasPlaying) _cancelGameCountdown(roomId);
    emitRoomUpdate(io, room);

    if (wasPlaying && remainingCount <= 1) {
      io.to(roomId).emit(SocketEvent.GameAborted, playerName);
      _clearRoomTimers(roomId);
      return;
    }
    io.to(roomId).emit(SocketEvent.PlayerLeaveRoom, playerName);
    if (room.status !== GameStatus.Playing) {
      _clearRoomTimers(roomId);
      return;
    }
    if (room.settings.gameType === 'buzzer') {
      if (wasAnswering) {
        _clearBuzzerAnswerTimer(roomId);
        _scheduleResume(roomId);
      }
      return;
    }
    // 傳統對戰：離開的人可能是目前玩家，回合已換人，重新計時
    if (turnTimerMap.has(roomId)) _startTurnTimer(roomId);
  };

  /** 玩家已在另一個房間時，先自動離開舊房間（防止幽靈玩家/幽靈房間） */
  const _leavePreviousRoom = (playerId: string, nextRoomId?: string) => {
    const prevRoomId = getCurrentRoomId(playerId);
    if (prevRoomId && prevRoomId !== nextRoomId) _handleLeave(playerId);
  };

  // ── 快速配對 ──────────────────────────────────────────────────────────────

  /** 配對結束：電腦補位後直接開局；倒數結束與「不等了」同時發生也只會開一次 */
  const _startQuickMatch = (roomId: string) => {
    _clearQuickMatchTimer(roomId);
    const room = finishQuickMatch(roomId);
    if (!room) return;
    emitRoomUpdate(io, room);
    _actuallyStartGame(roomId);
  };

  /** 配對房裡還有連線中的真人 */
  const _hasConnectedHuman = (room: Room) =>
    room.players.some(p => !p.isBot && !p.isDisconnected);

  /**
   * 倒數到 0 時開局；但如果真人全都斷線了（例如唯一的真人關掉分頁），
   * 不要讓電腦對著空房開局：停在 0 等。有人在寬限期內回來就立即開局，
   * 沒回來的話寬限期到會把他移除，最後一位真人離開時房間連同計時器一起刪掉
   */
  const _quickMatchTimeUp = (roomId: string) => {
    const room = getCurrentRoom(roomId);
    const entry = quickMatchTimerMap.get(roomId);
    if (!room || !entry) return;
    if (_hasConnectedHuman(room)) {
      _startQuickMatch(roomId);
      return;
    }
    if (entry.timer) clearInterval(entry.timer);
    entry.timer = null;
  };

  const _startQuickMatchCountdown = (roomId: string) => {
    if (quickMatchTimerMap.has(roomId)) return;
    const entry: {
      timer: ReturnType<typeof setInterval> | null;
      secondsLeft: number;
    } = {
      secondsLeft: options.quickMatchWaitSeconds,
      timer: null,
    };
    entry.timer = setInterval(() => {
      // 房間在倒數中被刪掉（真人都離開了）就停止
      if (!getCurrentRoom(roomId)) {
        _clearQuickMatchTimer(roomId);
        return;
      }
      entry.secondsLeft = Math.max(0, entry.secondsLeft - 1);
      io.to(roomId).emit(SocketEvent.QuickMatchCountdown, {
        secondsLeft: entry.secondsLeft,
      });
      if (entry.secondsLeft <= 0) _quickMatchTimeUp(roomId);
    }, 1000);
    quickMatchTimerMap.set(roomId, entry);
  };

  /**
   * 剛進入配對中房間的連線（加入、重新整理、重連）：立即補送剩餘秒數，不用等下一秒；
   * 停在 0 等真人回來的房間，有人回來就開局；從邀請連結加入讓真人滿房也立即開局
   */
  const _syncQuickMatch = (socket: Socket, roomId: string) => {
    const room = getCurrentRoom(roomId);
    if (!room?.quickMatchPending) return;
    const entry = quickMatchTimerMap.get(roomId);
    socket.emit(SocketEvent.QuickMatchCountdown, {
      secondsLeft: entry?.secondsLeft ?? options.quickMatchWaitSeconds,
    });
    const humans = room.players.filter(p => !p.isBot).length;
    if (humans >= room.maxPlayers) {
      _startQuickMatch(roomId);
      return;
    }
    if (entry && !entry.timer && entry.secondsLeft <= 0) {
      _quickMatchTimeUp(roomId);
    }
  };

  // ── 事件 ──────────────────────────────────────────────────────────────────

  /**
   * 重新整理或重連後補送目前這一題的搶答狀態。前端狀態是靠事件累積的，
   * 重新載入頁面會全部歸零，所以沿用既有事件依序重播：亮牌、開放搶答、作答中、計時、無解票數
   */
  function _syncBuzzerRound(socket: Socket, room: Room) {
    const state = room.buzzerState;
    if (
      room.status !== GameStatus.Playing ||
      room.settings.gameType !== 'buzzer' ||
      !state ||
      state.roundNumber === 0
    ) {
      return;
    }
    const settings = room.settings.buzzerSettings ?? DEFAULT_BUZZER_SETTINGS;
    socket.emit(SocketEvent.BuzzerRoundStart, {
      publicCards: state.publicCards,
      roundNumber: state.roundNumber,
      roundSeconds: settings.roundSeconds,
    });
    if (!state.roundOpen) return;
    socket.emit(SocketEvent.BuzzerOpen);
    const roundTimer = buzzerRoundTimerMap.get(room.roomId);
    if (state.currentAnswerPlayerId) {
      const used = state.answerStartAt
        ? Math.floor((Date.now() - state.answerStartAt) / 1000)
        : 0;
      socket.emit(SocketEvent.BuzzerBuzzInSuccess, {
        playerId: state.currentAnswerPlayerId,
        answerSeconds: Math.max(1, settings.answerSeconds - used),
      });
      if (roundTimer) {
        socket.emit(SocketEvent.BuzzerRoundTimerPaused, {
          elapsedSeconds: roundTimer.elapsed,
        });
      }
    } else if (roundTimer) {
      socket.emit(SocketEvent.BuzzerRoundTimerResumed, {
        remainingSeconds: Math.max(0, roundTimer.total - roundTimer.elapsed),
      });
    }
    if (state.noSolutionVotes.length > 0) {
      socket.emit(SocketEvent.BuzzerNoSolutionVoteUpdate, {
        votes: state.noSolutionVotes,
      });
    }
  }

  io.on('connection', socket => {
    const me = () => playerIdOf(socket);
    const fail = (error: ErrorCode) =>
      socket.emit(SocketEvent.ErrorMessage, error);
    /** 包一層：玩家送的資料格式不對（例如沒有 payload）也不能讓伺服器拋例外 */
    const on = <T>(event: string, handler: (payload: T) => void) => {
      socket.on(event, (payload: T) => {
        try {
          handler((payload ?? {}) as T);
        } catch (e) {
          console.error(`[socket] ${event} failed`, e);
          fail(ErrorCode.Unexpected);
        }
      });
    };

    on<{
      roomId: string;
      maxPlayers: number;
      playerName: string;
      roomName?: string;
      password?: string;
      mode: GameMode;
      difficulty?: never;
      gameType?: never;
      remainSeconds?: number | null;
    }>(SocketEvent.JoinRoom, payload => {
      const { roomId, playerName, mode } = payload;
      if (
        typeof roomId !== 'string' ||
        !roomId ||
        typeof playerName !== 'string'
      ) {
        fail(ErrorCode.RoomFullOrNotFound);
        return;
      }
      // 暱稱還沒載入就送出會建立沒有名字的玩家
      if (!playerName.trim()) {
        fail(ErrorCode.PlayerNameRequired);
        return;
      }
      // 前端已經擋過，這裡再檢查一次，避免直接送 socket 事件繞過
      if (containsProfanity(playerName)) {
        fail(ErrorCode.InappropriateName);
        return;
      }
      const playerId = me();
      _leavePreviousRoom(playerId, roomId);

      if (!checkCanJoinRoom(roomId, playerId, mode)) {
        const existing = getCurrentRoom(roomId);
        fail(
          existing && existing.status !== GameStatus.Idle
            ? ErrorCode.GameInProgress
            : ErrorCode.RoomFullOrNotFound,
        );
        return;
      }
      const result = joinRoom(
        {
          roomId,
          maxPlayers: payload.maxPlayers,
          roomName: payload.roomName,
          password: payload.password,
          difficulty: payload.difficulty,
          gameType: payload.gameType,
          remainSeconds: payload.remainSeconds,
        },
        playerId,
        playerName,
        mode,
      );
      if (result.success) {
        bindSocket(socket, playerId);
        socket.join(roomId);
        emitJoinRoomSuccess(io, result.room);
        socket.emit(SocketEvent.GetPlayerId, playerId);
        socket.emit(SocketEvent.GetReconnectToken, result.reconnectToken);
        _syncQuickMatch(socket, roomId);
      } else if ('needPassword' in result) {
        socket.emit(SocketEvent.NeedRoomPassword);
      } else {
        fail(result.error);
      }
    });

    // 快速開始：有正在配對的房間就加入，沒有就開一間並開始倒數；真人滿房立即開局
    on<{ playerName: string }>(SocketEvent.QuickMatch, ({ playerName }) => {
      // 不能默默略過：大廳的快速開始按鈕要靠錯誤訊息才能恢復
      if (typeof playerName !== 'string' || !playerName.trim()) {
        fail(ErrorCode.PlayerNameRequired);
        return;
      }
      if (containsProfanity(playerName)) {
        fail(ErrorCode.InappropriateName);
        return;
      }
      const playerId = me();
      // 連點兩次「快速開始」或「再玩一場」：已經在配對中的房間裡就沿用，不重複加入或換房
      const currentRoom = getCurrentRoom(getCurrentRoomId(playerId) ?? '');
      if (currentRoom?.quickMatchPending) {
        emitJoinRoomSuccessTo(socket, currentRoom);
        _syncQuickMatch(socket, currentRoom.roomId);
        return;
      }
      const existing = findQuickMatchRoom();
      _leavePreviousRoom(playerId, existing?.roomId);

      const roomId = existing?.roomId ?? uuidv4();
      const result = existing
        ? joinRoom(
            { roomId, maxPlayers: existing.maxPlayers },
            playerId,
            playerName,
            GameMode.Multiple,
          )
        : createQuickMatchRoom(roomId, playerId, playerName);
      if (!result.success) {
        fail('error' in result ? result.error : ErrorCode.Unexpected);
        return;
      }

      bindSocket(socket, playerId);
      socket.join(roomId);
      // token 先送，前端導頁到房間頁時才不會再重複加入
      socket.emit(SocketEvent.GetPlayerId, playerId);
      socket.emit(SocketEvent.GetReconnectToken, result.reconnectToken);
      emitJoinRoomSuccess(io, result.room);

      if (!existing) _startQuickMatchCountdown(roomId);
      _syncQuickMatch(socket, roomId);
    });

    // 不等了：房間裡任何一位真人都可以讓電腦補位、立即開局
    on<{ roomId: string }>(SocketEvent.QuickMatchStartNow, ({ roomId }) => {
      const room = getCurrentRoom(roomId);
      if (!room?.quickMatchPending || !isRoomMember(roomId, me())) return;
      _startQuickMatch(roomId);
    });

    on<{ roomId: string }>(SocketEvent.StartGame, ({ roomId }) => {
      const check = canStartGame(roomId, me());
      if (!check.ok) {
        fail(check.error);
        return;
      }
      if (check.room.maxPlayers === 1) _actuallyStartGame(roomId);
      else _startGameCountdown(roomId);
    });

    on<{ roomId: string }>(SocketEvent.DrawCard, ({ roomId }) => {
      _afterTurn(roomId, drawCard(roomId, me()), socket);
    });

    on<{ roomId: string; cardId: string }>(
      SocketEvent.DiscardCard,
      ({ roomId, cardId }) => {
        const result = discardCard(roomId, me(), cardId);
        if (result.success) {
          emitRoomUpdate(io, result.room);
        } else fail(result.error);
      },
    );

    on<{ roomId: string; number?: { id: string }; symbol?: never }>(
      SocketEvent.SelectCard,
      ({ roomId, number, symbol }) => {
        const result = selectCard(roomId, me(), number, symbol);
        if (result.success) {
          emitRoomUpdate(io, result.room);
        } else if (result.error !== ErrorCode.NotYourTurn) {
          fail(result.error);
        }
      },
    );

    on<{ roomId: string }>(SocketEvent.ReselectCard, ({ roomId }) => {
      const result = reselectCard(roomId, me());
      if (result.success) {
        emitRoomUpdate(io, result.room);
      } else if (result.error !== ErrorCode.NotYourTurn) {
        fail(result.error);
      }
    });

    on<{ roomId: string }>(SocketEvent.PlayCard, ({ roomId }) => {
      const result = playCard(roomId, me());
      if (!result.success) {
        if (result.error !== ErrorCode.NotYourTurn) fail(result.error);
        return;
      }
      emitRoomUpdate(io, result.room, {
        event: SocketEvent.PlayCardResponse,
        data: result.isCorrect,
      });
    });

    on<{ roomId: string }>(SocketEvent.SkipHand, ({ roomId }) => {
      _afterTurn(roomId, skipHand(roomId, me()), socket);
    });

    on<{ roomId: string }>(SocketEvent.BackCard, ({ roomId }) => {
      const result = backCard(roomId, me());
      if (result.success) {
        emitRoomUpdate(io, result.room);
      } else if (result.error !== ErrorCode.NotYourTurn) {
        fail(result.error);
      }
    });

    // 前端播完計分動畫後送出；只會把 PlayCard 驗證過的得分入帳一次
    on<{ roomId: string }>(SocketEvent.UpdateScore, ({ roomId }) => {
      const result = updateScore(roomId, me());
      // 重複送出（已入帳換人）不提示錯誤
      if (!result.success && result.error === ErrorCode.InvalidEquation) return;
      _afterTurn(roomId, result, socket);
    });

    on<{ roomId: string; ready?: unknown }>(
      SocketEvent.ReadyGame,
      ({ roomId, ready }) => {
        const playerId = me();
        const result = readyGame(
          roomId,
          playerId,
          typeof ready === 'boolean' ? ready : undefined,
        );
        if (!result.success) {
          fail(result.error);
          return;
        }
        const player = result.room.players.find(p => p.id === playerId);
        if (player && !player.isReady) _cancelGameCountdown(roomId);
        emitRoomUpdate(io, result.room);
      },
    );

    on<{ roomName: string; showEmpty: boolean } | undefined>(
      SocketEvent.SearchRooms,
      payload => {
        emitRoomList(
          socket,
          getCurrentRooms(
            payload && 'roomName' in payload ? payload : undefined,
          ),
        );
      },
    );

    on<{ roomId: string; message: string }>(
      SocketEvent.SendMessage,
      ({ roomId, message }) => {
        if (typeof message !== 'string' || !message.trim()) return;
        const playerName = getPlayerName(roomId, me());
        if (!playerName) return;
        io.to(roomId).emit(SocketEvent.GetMessage, {
          name: playerName,
          message,
        } satisfies Message);
      },
    );

    on<{ roomId: string; roomName: string; password: string }>(
      SocketEvent.EditRoomName,
      ({ roomId, roomName, password }) => {
        const result = editRoom(roomId, me(), roomName, password);
        if (result.success) {
          emitRoomUpdate(io, result.room);
        } else fail(result.error);
      },
    );

    on<{ roomId: string } & Parameters<typeof editRoomSettings>[2]>(
      SocketEvent.EditRoomSettings,
      ({ roomId, ...settings }) => {
        const result = editRoomSettings(roomId, me(), settings);
        if (result.success) {
          emitRoomUpdate(io, result.room);
        } else fail(result.error);
      },
    );

    on<{ roomId: string; playerId: string }>(
      SocketEvent.RemovePlayer,
      ({ roomId, playerId: targetId }) => {
        const result = removePlayer(roomId, me(), targetId);
        if (!result.success) {
          fail(result.error);
          return;
        }
        emitRoomUpdate(io, result.room);
        io.to(roomId).emit(SocketEvent.RemovePlayerResponse, targetId);
        // 被踢的人退出 socket 房間，之後不會再收到這間房的廣播
        const targetSocketId = socketOfPlayer.get(targetId);
        if (targetSocketId) {
          io.sockets.sockets.get(targetSocketId)?.leave(roomId);
        }
        const grace = disconnectGraceTimerMap.get(targetId);
        if (grace) clearTimeout(grace);
        disconnectGraceTimerMap.delete(targetId);
      },
    );

    on<{ roomId: string; difficulty: 'easy' | 'normal' | 'hard' }>(
      SocketEvent.AddBotToRoom,
      ({ roomId, difficulty }) => {
        const result = addBotToRoom(roomId, me(), difficulty);
        if (result.success) {
          emitRoomUpdate(io, result.room);
        } else fail(result.error);
      },
    );

    // ── 搶答模式 ───────────────────────────────────────────────────────────

    on<{ roomId: string }>(SocketEvent.BuzzerBuzzIn, ({ roomId }) => {
      const playerId = me();
      const room = getCurrentRoom(roomId);
      if (!room || !isRoomMember(roomId, playerId)) return;
      const settings = room.settings.buzzerSettings ?? DEFAULT_BUZZER_SETTINGS;

      const result = processBuzzIn(room, playerId);
      if (!result.success) {
        // 已有人作答、被鎖定、尚未開放 → 僅通知本人
        socket.emit(SocketEvent.BuzzerBuzzInFailed, { reason: result.reason });
        return;
      }
      const updated = applyBuzzerRoomUpdate(result.room);
      if (!updated) return;

      _pauseBuzzerRoundTimer(roomId);
      io.to(roomId).emit(SocketEvent.BuzzerBuzzInSuccess, {
        playerId,
        playerName: updated.players.find(p => p.id === playerId)?.name ?? '',
        answerSeconds: settings.answerSeconds,
      });
      _startAnswerTimer(roomId, playerId, settings.answerSeconds);
    });

    on<{ roomId: string; selectedCards: unknown }>(
      SocketEvent.BuzzerSubmitAnswer,
      ({ roomId, selectedCards }) => {
        const playerId = me();
        const room = getCurrentRoom(roomId);
        if (!room || !isRoomMember(roomId, playerId)) return;

        const result = processBuzzerAnswer(room, playerId, selectedCards);
        // 不是作答者（重複送出、搶答失敗的人送答案）：房間狀態不變，只回錯誤給本人
        if (result.kind === 'rejected') {
          fail(result.error);
          return;
        }

        _clearBuzzerAnswerTimer(roomId);
        const updated = applyBuzzerRoomUpdate(result.room);
        if (!updated) return;

        if (result.kind === 'correct') {
          io.to(roomId).emit(SocketEvent.BuzzerAnswerResult, {
            isCorrect: true,
            playerId,
            scoreDelta: result.scoreDelta,
            newScore: updated.players.find(p => p.id === playerId)?.score ?? 0,
            streak: result.streak,
            streakBonus: result.streakBonus,
          });
          emitRoomUpdate(io, updated);
          if (result.winner) {
            _finishBuzzerGame(roomId, updated, result.winner);
            return;
          }
          // 答題成功：清除舊回合計時，稍後換新題
          _scheduleNextBuzzerRound(roomId, options.buzzerNextRoundDelayMs);
          return;
        }

        io.to(roomId).emit(SocketEvent.BuzzerAnswerResult, {
          isCorrect: false,
          playerId,
          scoreDelta: result.scoreDelta,
          newScore: updated.players.find(p => p.id === playerId)?.score ?? 0,
          streak: 0,
          streakBonus: 0,
        });
        emitRoomUpdate(io, updated);
        _announceLock(roomId, updated, playerId);
        _scheduleResume(roomId);
      },
    );

    on<{ roomId: string }>(SocketEvent.BuzzerVoteNoSolution, ({ roomId }) => {
      const playerId = me();
      const room = getCurrentRoom(roomId);
      if (!room || !isRoomMember(roomId, playerId)) return;

      const result = processNoSolutionVote(room, playerId);
      if (result.status === 'rejected') return;
      applyBuzzerRoomUpdate(result.room);

      if (result.status === 'passed') {
        io.to(roomId).emit(SocketEvent.BuzzerNoSolutionPassed);
        _scheduleNextBuzzerRound(roomId, options.buzzerNextRoundDelayMs);
      } else {
        io.to(roomId).emit(SocketEvent.BuzzerNoSolutionVoteUpdate, {
          votes: result.votes,
          total: room.players.length,
        });
      }
    });

    // 搶答畫面掛上後補送目前這一題；只回給房內成員自己
    on<{ roomId: string }>(SocketEvent.BuzzerSync, ({ roomId }) => {
      const playerId = me();
      if (!playerId || !isRoomMember(roomId, playerId)) return;
      const room = getCurrentRoom(roomId);
      if (room) _syncBuzzerRound(socket, room);
    });

    // 搶答選牌進度廣播：只轉送目前作答者的進度給同房其他人
    on<{ roomId: string; selectedCards: unknown }>(
      SocketEvent.BuzzerSelectionUpdate,
      ({ roomId, selectedCards }) => {
        const room = getCurrentRoom(roomId);
        if (room?.buzzerState?.currentAnswerPlayerId !== me()) return;
        socket
          .to(roomId)
          .emit(SocketEvent.BuzzerSelectionUpdate, { selectedCards });
      },
    );

    // ── 離開與斷線 ─────────────────────────────────────────────────────────

    // 玩家主動離開（離開按鈕、SPA 導頁）：立即移除，不留幽靈玩家
    // 有帶 roomId 時只在玩家目前就在那間房才離開：頁面延後送出的離開，不會誤把已經進到別間房的玩家拉出來
    on<{ roomId?: unknown } | undefined>(SocketEvent.LeaveRoom, payload => {
      const playerId = me();
      const roomId = payload?.roomId;
      if (typeof roomId === 'string' && getCurrentRoomId(playerId) !== roomId) {
        return;
      }
      _handleLeave(playerId);
    });

    socket.on('disconnect', reason => {
      const playerId = playerOfSocket.get(socket.id);
      // 這個 socket 沒有代表任何玩家，或玩家已經用新的 socket 重連
      if (!playerId || socketOfPlayer.get(playerId) !== socket.id) {
        unbindSocket(socket.id);
        return;
      }
      unbindSocket(socket.id);

      // 前端呼叫 socket.disconnect()、或伺服器踢除 → 視為主動離開
      if (INTENTIONAL_DISCONNECT_REASONS.has(reason)) {
        _handleLeave(playerId);
        return;
      }

      // 網路中斷、重新整理、關閉分頁（伺服器分不出來）→ 標記暫時斷線，寬限期內可以用 token 回來。
      // 傳統對戰輪到他時，回合計時照常由伺服器推進
      const marked = markPlayerDisconnected(playerId);
      if (!marked) return;
      emitRoomUpdate(io, marked.room);

      _scheduleGraceLeave(
        playerId,
        marked.room.status === GameStatus.Playing
          ? options.disconnectGracePlayingMs
          : options.disconnectGraceIdleMs,
      );
    });

    on<{ reconnectToken: string }>(
      SocketEvent.PlayerReconnect,
      ({ reconnectToken }) => {
        // 這個連線已經代表另一位還在房間裡的玩家：不能直接換成 token 的主人
        const target = peekReconnectToken(reconnectToken);
        const current = playerOfSocket.get(socket.id);
        if (
          target &&
          current &&
          current !== target.playerId &&
          getCurrentRoomId(current)
        ) {
          socket.emit(SocketEvent.PlayerReconnectFailed, {
            error: ErrorCode.PlayerAlreadyBound,
          });
          return;
        }
        const result = reconnectPlayer(reconnectToken);
        if (!result.success) {
          socket.emit(SocketEvent.PlayerReconnectFailed, {
            error: result.error,
          });
          return;
        }
        const { room, playerId } = result;
        const grace = disconnectGraceTimerMap.get(playerId);
        if (grace) clearTimeout(grace);
        disconnectGraceTimerMap.delete(playerId);

        bindSocket(socket, playerId);
        socket.join(room.roomId);
        socket.emit(SocketEvent.GetPlayerId, playerId);
        emitPlayerReconnectSuccess(socket, room);
        emitRoomUpdate(io, room);
        _syncQuickMatch(socket, room.roomId);
        // 回到遊戲中的傳統對戰：補送目前剩餘秒數
        const turn = turnTimerMap.get(room.roomId);
        if (turn) {
          socket.emit(SocketEvent.CountdownTimeResponse, {
            countdown: turn.countdownTime,
            needDrawPlayerId: room.players.find(
              p => p.playerOrder === room.currentOrder,
            )?.id,
          });
        }
      },
    );
  });

  return {
    options,
    /** 測試用：這間房還有哪些計時器在跑（用來確認離開、結束、刪房後沒有殘留） */
    activeTimers(roomId: string): string[] {
      const named: [string, Map<string, unknown>][] = [
        ['turn', turnTimerMap],
        ['buzzerAnswer', buzzerAnswerTimerMap],
        ['buzzerRound', buzzerRoundTimerMap],
        ['buzzerCountdown', buzzerCountdownMap],
        ['buzzerSchedule', buzzerScheduleMap],
        ['buzzerResume', buzzerResumeMap],
        ['startCountdown', startCountdownMap],
        ['quickMatch', quickMatchTimerMap],
      ];
      const active = named.filter(([, map]) => map.has(roomId)).map(([n]) => n);
      for (const key of buzzerLockTimerMap.keys()) {
        if (key.startsWith(`${roomId}:`)) active.push('buzzerLock');
      }
      return active;
    },
    /** 測試用：有哪些玩家還在斷線寬限期 */
    graceTimers(): string[] {
      return [...disconnectGraceTimerMap.keys()];
    },
    /** 測試用：停掉所有計時器 */
    close() {
      for (const map of [
        disconnectGraceTimerMap,
        buzzerAnswerTimerMap,
        buzzerLockTimerMap,
        buzzerScheduleMap,
        buzzerResumeMap,
      ]) {
        for (const t of map.values()) clearTimeout(t);
        map.clear();
      }
      for (const t of buzzerCountdownMap.values()) clearInterval(t);
      buzzerCountdownMap.clear();
      for (const roomId of [...turnTimerMap.keys()]) _clearTurnTimer(roomId);
      for (const roomId of [...buzzerRoundTimerMap.keys()])
        _clearBuzzerRoundTimer(roomId);
      for (const timers of startCountdownMap.values())
        timers.forEach(clearTimeout);
      startCountdownMap.clear();
      for (const roomId of [...quickMatchTimerMap.keys()])
        _clearQuickMatchTimer(roomId);
    },
  };
}
