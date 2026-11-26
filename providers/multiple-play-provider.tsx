'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslations } from 'next-intl';
import { Socket, io } from 'socket.io-client';
import { toast } from 'sonner';
import { useGameActions } from '@/hooks/useGameActions';
import { usePlayerName } from '@/hooks/usePlayerName';
import { useServerErrorText } from '@/i18n/server-messages';
import {
  MultiplayerGameType,
  PlayerCounts,
  RematchSource,
  trackMultiplayerGameCompleted,
  trackMultiplayerGameStarted,
  trackQuickMatchRequested,
  trackQuickMatchStarted,
  trackRematchClicked,
  trackRematchStarted,
} from '@/lib/analytics';
import { createSocketListeners } from '@/lib/socket-listeners';
import { playSound } from '@/lib/sound-manager';
import { GameMode } from '@/models/GameMode';
import { GameStatus } from '@/models/GameStatus';
import { Message } from '@/models/Message';
import { NumberCard } from '@/models/Player';
import { BuzzerSettings, GameType, RoomSettings } from '@/models/Room';
import {
  BuzzerGameOverPayload,
  GameOverPayload,
  PublicPlayerState,
  RankedPlayer,
  RoomView,
} from '@/models/RoomView';
import { SelectedCard } from '@/models/SelectedCard';
import { SocketEvent } from '@/models/SocketEvent';
import { Symbol } from '@/models/Symbol';

// Socket.IO 服務獨立部署，未設定時連至本機開發用的 socket server
const socket = io(
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001',
);

/**
 * 1. 建立 Context
 */
// 定義 Context 中 value 的型別
type GameOverData = {
  /** 勝利者 id（判斷自己有沒有贏；殘局結算等沒有時用排序第一位） */
  winnerId?: string;
  name: string;
  score: number;
  players: RankedPlayer[];
  isPenaltyGameOver?: boolean;
};

/** 自己：公開的玩家資料加上只有自己拿得到的手牌 */
export type SelfPlayer = PublicPlayerState & { handCard: NumberCard[] };

type GameAbortedData = {
  playerName: string;
};

type MultiplePlayContextData = {
  searchRooms: (payload?: { roomName: string; showEmpty: boolean }) => void;
  joinRoom: (
    playerName: string,
    roomId: string,
    roomName?: string,
    maxPlayers?: number,
    password?: string,
    gameType?: GameType,
    remainSeconds?: number | null,
    buzzerSettings?: BuzzerSettings,
  ) => void;
  socket: Socket;
  roomInfo?: RoomView;
  /** 輪到自己時是正在組的算式；別人正在計分時是已公開的那一手 */
  selectedCards: SelectedCard[];
  playerId?: string;
  onReadyGame: () => void;
  onStartGame: () => void;
  messages: Message[];
  editRoom: (roomName: string, password?: string) => void;
  editRoomSettings: (
    settings: Partial<RoomSettings> & { maxPlayers?: number },
  ) => void;
  removePlayer: (playerId: string) => void;
  checkAnswerCorrect: boolean | null;
  isSymbolScoreAnimationFinished: boolean;
  selectedCardSymbols: SelectedCard[];
  selectedCardNumbers: SelectedCard[];
  onFinishedSymbolScoreAnimation: () => void;
  onUpdateScore: () => void;
  onSelectCardOrSymbol: ({
    number,
    symbol,
  }: {
    number?: NumberCard;
    symbol?: Symbol;
  }) => void;
  onDiscardCard: (cardId: string) => void;
  onPlayCard: () => void;
  onReselect: () => void;
  onDrawCard: () => void;
  currentPlayer?: SelfPlayer;
  isYourTurn: boolean;
  onBack: () => void;
  isLastRound: boolean;
  countdown?: number;
  sendMessage: (message: string) => void;
  gameOverData: GameOverData | null;
  onCloseGameOver: () => void;
  gameAbortedData: GameAbortedData | null;
  clearGameAbortedData: () => void;
  addBot: (difficulty: 'easy' | 'normal' | 'hard') => void;
  /** 快速開始：找正在配對的房間加入，沒有就開一間新的 */
  quickMatch: (playerName: string) => void;
  /**
   * 結算畫面的「再玩一場」：快速配對的房間重新配對（換到新房間），
   * 私人房間留在原房間並自動準備，等房主開局
   */
  requestRematch: () => void;
  /** 再玩一場配到的新房間 id；房間頁導過去後呼叫 clearRematchRoomId */
  rematchRoomId: string | null;
  clearRematchRoomId: () => void;
  /** 已按再玩一場、在私人房間等下一局（等待房主開局） */
  isRematchPending: boolean;
  /** 配對已等待的秒數（取消配對的分析用） */
  quickMatchWaitSeconds: () => number;
  /** 不等了，讓電腦補位立即開局 */
  startQuickMatchNow: () => void;
  /** 配對倒數剩餘秒數；不在配對中時為 null */
  quickMatchSecondsLeft: number | null;
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
};
const MultiplePlayContext = createContext<MultiplePlayContextData | undefined>(
  undefined,
);

/**
 * 2. 建立 Provider 元件
 */
// 定義 Provider 元件 Props 的型別
type MultiplePlayProviderProps = {
  defaultCount?: number;
  children: React.ReactNode;
};
/** 分析用：真人與電腦人數（不送名字） */
function countPlayers(players: { isBot?: boolean }[]): PlayerCounts {
  const bots = players.filter(p => p.isBot).length;
  return { humanPlayerCount: players.length - bots, botPlayerCount: bots };
}

export function MultiplePlayProvider({ children }: MultiplePlayProviderProps) {
  const serverErrorText = useServerErrorText();
  const t = useTranslations('Multiplayer.toast');
  const tGameToast = useTranslations('GameUI.toast');
  const playerDisplayName = usePlayerName();

  // 答案是否正確
  const [checkAnswerCorrect, setCheckAnswerCorrect] = useState<boolean | null>(
    null,
  );

  const [roomInfo, setRoomInfo] = useState<RoomView>();
  const [playerId, setPlayerId] = useState<string>();
  const playerIdRef = useRef<string | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [remainRoundTime, setRemainRoundTime] = useState<{
    countdown: number;
    needDrawPlayerId: string;
  }>();
  const [gameOverData, setGameOverData] = useState<GameOverData | null>(null);
  const [quickMatchSecondsLeft, setQuickMatchSecondsLeft] = useState<
    number | null
  >(null);
  const [gameAbortedData, setGameAbortedData] =
    useState<GameAbortedData | null>(null);
  const [rematchRoomId, setRematchRoomId] = useState<string | null>(null);
  const [isRematchPending, setIsRematchPending] = useState(false);
  /** 監聽器裡讀最新的房間（監聽器只在掛載時登記一次） */
  const roomInfoRef = useRef<RoomView | undefined>(undefined);
  useEffect(() => {
    roomInfoRef.current = roomInfo;
  }, [roomInfo]);
  /** 按了再玩一場：下一局開局時送 multiplayer_rematch_started；快速配對時用來辨認新房間 */
  const rematchRef = useRef<{
    source: RematchSource;
    gameType: MultiplayerGameType;
    fromRoomId: string;
  } | null>(null);
  /** 這次配對從什麼時候開始等（算 match_wait_seconds） */
  const quickMatchStartedAtRef = useRef<number | null>(null);
  /** 結算事件是不是目前所在房間的（舊版伺服器沒帶 roomId 時一律接受） */
  const isCurrentRoom = (roomId: string | undefined) =>
    !roomId || !roomInfoRef.current || roomInfoRef.current.roomId === roomId;
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'reconnecting' | 'disconnected'
  >('connected');
  const graceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 用來區分「頁面首次載入」vs「遊戲中斷線重連」：
  // 只有 socket 曾觸發 disconnect 後才會為 true，新 socket instance 預設 false
  const wasReconnectingRef = useRef(false);
  // 自己的回合用自己的選牌（私人資料）；別人答對正在計分時用公開的那一手
  const selectedCards = useMemo<SelectedCard[]>(() => {
    const own = roomInfo?.self?.selectedCards;
    if (own && own.length > 0) return own;
    return roomInfo?.playedCards ?? [];
  }, [roomInfo?.self?.selectedCards, roomInfo?.playedCards]);

  const {
    selectedCardSymbols,
    selectedCardNumbers,
    isSymbolScoreAnimationFinished,
    onFinishedSymbolScoreAnimation,
    resetAnimations,
    handlePlayCardResponse,
    markTurnStart,
  } = useGameActions(selectedCards, checkAnswerCorrect, setCheckAnswerCorrect);

  // 當前玩家
  // 手牌只從自己的私人資料取得，公開資料裡只有張數
  const currentPlayer = useMemo<SelfPlayer | undefined>(() => {
    const self = roomInfo?.self;
    const pub = roomInfo?.players.find(
      p => p.id === (self?.playerId ?? playerId),
    );
    if (!pub) return undefined;
    return { ...pub, handCard: self?.handCard ?? [] };
  }, [playerId, roomInfo?.players, roomInfo?.self]);

  const isLastRound = useMemo(
    () => roomInfo?.status === GameStatus.Playing && roomInfo?.deckCount === 0,
    [roomInfo?.deckCount, roomInfo?.status],
  );

  const isYourTurn = currentPlayer?.playerOrder === roomInfo?.currentOrder;

  const resetState = useCallback(() => {
    setCheckAnswerCorrect(null);
    resetAnimations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    socket.emit(SocketEvent.SearchRooms);
    // Provider 每次掛載（進出 /multiple-play）都會再登記一次；cleanup 只移除這次登記的 handler
    const listeners = createSocketListeners(socket);

    listeners.on(SocketEvent.ErrorMessage, (error: string) => {
      toast.error(serverErrorText(error));
    });

    listeners.on(SocketEvent.JoinRoomSuccess, (room: RoomView) => {
      const rematch = rematchRef.current;
      const previousRoomId = roomInfoRef.current?.roomId;
      setRoomInfo(room);
      if (!room.self) return;
      // 重新整理後用這個房間的 token 重連
      sessionStorage.setItem('reconnectRoomId', room.roomId);
      // 再玩一場配到新的配對房：房間頁會導過去；上一局的聊天、結算不帶過去
      if (
        rematch?.source === 'quick_match' &&
        room.roomId !== rematch.fromRoomId &&
        room.roomId !== previousRoomId
      ) {
        setMessages([]);
        setGameOverData(null);
        setGameAbortedData(null);
        setRematchRoomId(room.roomId);
      }
    });

    listeners.on(
      SocketEvent.QuickMatchCountdown,
      ({ secondsLeft }: { secondsLeft: number }) => {
        setQuickMatchSecondsLeft(secondsLeft);
      },
    );

    listeners.on(SocketEvent.GetMessage, (message: Message) => {
      setMessages(state => [...state, message]);
    });

    listeners.on(SocketEvent.GetPlayerId, (id: string) => {
      setPlayerId(id);
      playerIdRef.current = id;
    });

    listeners.on(SocketEvent.GetReconnectToken, (token: string) => {
      sessionStorage.setItem('reconnectToken', token);
    });

    // 斷線：顯示重連中 UI
    listeners.on('disconnect', () => {
      wasReconnectingRef.current = true;
      setConnectionStatus('reconnecting');
      graceTimerRef.current = setTimeout(() => {
        setConnectionStatus('disconnected');
      }, 300_000); // 5 分鐘，與伺服器 grace period 同步
    });

    // transport 重連或頁面重載後，若有 token 則自動恢復遊戲
    const reconnectWithToken = () => {
      const token = sessionStorage.getItem('reconnectToken');
      if (token) {
        socket.emit(SocketEvent.PlayerReconnect, { reconnectToken: token });
      }
    };
    listeners.on('connect', reconnectWithToken);
    // socket 在模組載入時就開始連線，重新整理後常常在這個 effect 執行前就連上了，
    // 錯過 connect 事件會卡在「連線中」：已連上就立即用 token 恢復
    if (socket.connected) reconnectWithToken();

    listeners.on(
      SocketEvent.PlayerReconnectSuccess,
      ({ room, playerId: id }: { room: RoomView; playerId?: string }) => {
        if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
        wasReconnectingRef.current = false;
        setRoomInfo(room);
        // 玩家 id 重連後不變（新的 socket 代表原本的玩家）；舊版 server 沒帶時才退回 socket.id
        const stableId = id ?? socket.id;
        setPlayerId(stableId);
        playerIdRef.current = stableId;
        setConnectionStatus('connected');
        toast.success(t('reconnected'));
      },
    );

    listeners.on(SocketEvent.PlayerReconnectFailed, () => {
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current);

      if (!wasReconnectingRef.current) {
        // socket 是剛建立的新 instance（玩家離開後重新進入同一房間）
        // → token 已因離開而失效，自動 fallback 到一般 joinRoom
        const playerName = localStorage.getItem('playerName');
        const roomId = sessionStorage.getItem('reconnectRoomId');
        sessionStorage.removeItem('reconnectToken');
        if (playerName && roomId) {
          socket.emit(SocketEvent.JoinRoom, {
            playerName,
            roomId,
            mode: GameMode.Multiple,
          });
          return;
        }
      }

      setConnectionStatus('disconnected');
      sessionStorage.removeItem('reconnectToken');
      sessionStorage.removeItem('reconnectRoomId');
    });

    listeners.on(
      SocketEvent.RoomUpdate,
      ({
        room,
        extra,
      }: {
        room: RoomView;
        extra?: { event: SocketEvent; data: boolean };
      }) => {
        setRoomInfo(room);
        if (room.status === GameStatus.Playing && !room.isGameOver) {
          setGameOverData(null);
        }
        if (extra?.event === SocketEvent.UpdateScore) {
          resetState();
        }
        if (extra?.event === SocketEvent.PlayCardResponse) {
          handlePlayCardResponse(extra.data);
        }
      },
    );

    listeners.on(SocketEvent.PlayerLeaveRoom, (playerName: string) => {
      toast.info(t('playerLeft', { name: playerDisplayName(playerName) }));
    });

    listeners.on(
      SocketEvent.CountdownTimeResponse,
      (res: { countdown: number; needDrawPlayerId: string }) => {
        setRemainRoundTime(res);
      },
    );

    listeners.on(
      SocketEvent.GameOver,
      ({
        roomId,
        winnerId,
        name,
        score,
        players,
        isPenaltyGameOver,
      }: GameOverPayload) => {
        // 已經換到別的房間（再玩一場）：舊房的結算不顯示
        if (!isCurrentRoom(roomId)) return;
        playSound('gameOverWin');
        trackMultiplayerGameCompleted({
          gameType: 'classic',
          completionStatus:
            (winnerId ?? players[0]?.id) === playerIdRef.current
              ? 'won'
              : 'lost',
          ...countPlayers(players),
        });
        setGameOverData({ winnerId, name, score, players, isPenaltyGameOver });
      },
    );

    listeners.on(SocketEvent.GameAborted, (playerName: string) => {
      const room = roomInfoRef.current;
      if (room) {
        trackMultiplayerGameCompleted({
          gameType: room.settings.gameType,
          completionStatus: 'aborted',
          ...countPlayers(room.players),
        });
      }
      setGameAbortedData({ playerName });
    });

    listeners.on(SocketEvent.BuzzerGameOver, (data: BuzzerGameOverPayload) => {
      if (!isCurrentRoom(data.roomId)) return;
      playSound('gameOverWin');
      trackMultiplayerGameCompleted({
        gameType: 'buzzer',
        completionStatus:
          data.winner.id === playerIdRef.current ? 'won' : 'lost',
        ...countPlayers(data.players),
      });
      setGameOverData({
        winnerId: data.winner.id,
        name: data.winner.name,
        score: data.winner.score,
        players: data.players,
      });
    });

    return () => {
      listeners.off();
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    };
  }, [resetState]);

  useEffect(() => {
    if (isLastRound) {
      toast.warning(t('lastRound'));
    }
  }, [isLastRound, t]);

  // 房間從等待進入遊戲中時算一次開局（每位玩家各送一次）；按過再玩一場的話也記一次再戰開局
  const roomStatus = roomInfo?.status;
  useEffect(() => {
    const room = roomInfoRef.current;
    if (roomStatus !== GameStatus.Playing || !room) return;
    const counts = countPlayers(room.players);
    const rematch = rematchRef.current;
    trackMultiplayerGameStarted({
      gameType: room.settings.gameType,
      rematchSource: rematch?.source,
      ...counts,
    });
    if (rematch) {
      trackRematchStarted({
        gameType: room.settings.gameType,
        rematchSource: rematch.source,
        ...counts,
      });
      rematchRef.current = null;
    }
    setIsRematchPending(false);
  }, [roomStatus]);

  const searchRooms = useCallback(
    (payload?: { roomName: string; showEmpty: boolean }) => {
      if (socket) {
        socket.emit(SocketEvent.SearchRooms, payload);
      }
    },
    [],
  );

  const joinRoom = useCallback(
    (
      playerName: string,
      roomId: string,
      roomName?: string,
      maxPlayers?: number,
      password?: string,
      gameType?: GameType,
      remainSeconds?: number | null,
      buzzerSettings?: BuzzerSettings,
    ) => {
      if (socket) {
        sessionStorage.removeItem('reconnectToken');
        sessionStorage.setItem('reconnectRoomId', roomId);
        socket.emit(SocketEvent.JoinRoom, {
          playerName,
          roomId,
          roomName,
          maxPlayers,
          password,
          gameType,
          remainSeconds,
          buzzerSettings,
          mode: GameMode.Multiple,
        });
      }
    },
    [],
  );

  const onReadyGame = useCallback(() => {
    if (socket) {
      socket.emit(SocketEvent.ReadyGame, { roomId: roomInfo?.roomId });
    }
  }, [roomInfo?.roomId]);

  const onStartGame = useCallback(() => {
    if (socket) {
      socket.emit(SocketEvent.StartGame, { roomId: roomInfo?.roomId });
    }
  }, [roomInfo?.roomId]);

  const editRoom = useCallback(
    (roomName: string, password?: string) => {
      if (socket) {
        socket.emit(SocketEvent.EditRoomName, {
          roomId: roomInfo?.roomId,
          roomName,
          password,
        });
      }
    },
    [roomInfo?.roomId],
  );

  const editRoomSettings = useCallback(
    ({
      maxPlayers,
      deckType,
      remainSeconds,
      gameType,
      difficulty,
      buzzerSettings,
    }: Partial<RoomSettings> & { maxPlayers?: number }) => {
      if (socket) {
        socket.emit(SocketEvent.EditRoomSettings, {
          roomId: roomInfo?.roomId,
          maxPlayers,
          deckType,
          remainSeconds,
          gameType,
          difficulty,
          buzzerSettings,
        });
      }
    },
    [roomInfo?.roomId],
  );

  const removePlayer = useCallback(
    (playerId: string) => {
      if (socket) {
        socket.emit(SocketEvent.RemovePlayer, {
          roomId: roomInfo?.roomId,
          playerId,
        });
      }
    },
    [roomInfo?.roomId],
  );

  // 更新分數
  const onUpdateScore = useCallback(() => {
    if (roomInfo?.isGameOver || !isYourTurn) return;

    if (socket) {
      socket.emit(SocketEvent.UpdateScore, {
        roomId: roomInfo?.roomId,
      });
    }
  }, [roomInfo?.isGameOver, isYourTurn, roomInfo?.roomId]);

  // 選擇牌
  const onSelectCardOrSymbol = useCallback(
    ({ number, symbol }: { number?: NumberCard; symbol?: Symbol }) => {
      if (connectionStatus !== 'connected') return;
      if (roomInfo?.isGameOver || !isYourTurn) return;

      playSound('select');
      if (socket) {
        socket.emit(SocketEvent.SelectCard, {
          roomId: roomInfo?.roomId,
          number,
          symbol,
        });
      }
    },
    [connectionStatus, roomInfo?.isGameOver, isYourTurn, roomInfo?.roomId],
  );

  // 棄牌
  const onDiscardCard = useCallback(
    (cardId: string) => {
      if (roomInfo?.isGameOver) return;

      if (socket) {
        socket.emit(SocketEvent.DiscardCard, {
          roomId: roomInfo?.roomId,
          cardId,
        });
      }
    },
    [roomInfo?.isGameOver, roomInfo?.roomId],
  );

  // 出牌
  const onPlayCard = useCallback(() => {
    if (connectionStatus !== 'connected') return;
    if (roomInfo?.isGameOver || !isYourTurn) return;

    if (selectedCards.length === 0) {
      toast.warning(tGameToast('buildEquation'));
      return;
    }

    if (socket) {
      socket.emit(SocketEvent.PlayCard, {
        roomId: roomInfo?.roomId,
      });
    }
  }, [
    connectionStatus,
    roomInfo?.isGameOver,
    isYourTurn,
    roomInfo?.roomId,
    selectedCards,
    tGameToast,
  ]);

  // 重選
  const onReselect = useCallback(() => {
    if (connectionStatus !== 'connected') return;
    if (roomInfo?.isGameOver || !isYourTurn) return;

    if (socket) {
      socket.emit(SocketEvent.ReselectCard, {
        roomId: roomInfo?.roomId,
      });
    }
  }, [connectionStatus, roomInfo?.isGameOver, roomInfo?.roomId, isYourTurn]);

  // 結束回合並抽牌
  const onDrawCard = useCallback(() => {
    if (connectionStatus !== 'connected') return;
    if (roomInfo?.isGameOver || !isYourTurn || checkAnswerCorrect !== null)
      return;

    playSound('skip');
    if (socket) {
      // 沒出過牌抽 1 張
      socket.emit(SocketEvent.DrawCard, {
        roomId: roomInfo?.roomId,
      });
    }
  }, [
    connectionStatus,
    checkAnswerCorrect,
    isYourTurn,
    roomInfo?.isGameOver,
    roomInfo?.roomId,
  ]);

  // 退回鍵
  const onBack = useCallback(() => {
    if (connectionStatus !== 'connected') return;
    if (roomInfo?.isGameOver || !isYourTurn) return;

    if (socket && selectedCards.length) {
      socket.emit(SocketEvent.BackCard, {
        roomId: roomInfo?.roomId,
      });
    }
  }, [
    connectionStatus,
    isYourTurn,
    roomInfo?.isGameOver,
    roomInfo?.roomId,
    selectedCards.length,
  ]);

  const sendMessage = useCallback(
    (message: string) => {
      if (socket) {
        socket.emit(SocketEvent.SendMessage, {
          roomId: roomInfo?.roomId,
          message,
        });
      }
    },
    [roomInfo?.roomId],
  );

  const onCloseGameOver = useCallback(() => {
    setGameOverData(null);
  }, []);

  const clearGameAbortedData = useCallback(() => {
    setGameAbortedData(null);
  }, []);

  const addBot = useCallback(
    (difficulty: 'easy' | 'normal' | 'hard') => {
      if (!roomInfo?.roomId) return;
      socket.emit(SocketEvent.AddBotToRoom, {
        roomId: roomInfo.roomId,
        difficulty,
      });
    },
    [roomInfo?.roomId],
  );

  const quickMatch = useCallback((playerName: string) => {
    sessionStorage.removeItem('reconnectToken');
    quickMatchStartedAtRef.current = Date.now();
    trackQuickMatchRequested('lobby');
    socket.emit(SocketEvent.QuickMatch, { playerName });
  }, []);

  const quickMatchWaitSeconds = useCallback(() => {
    const startedAt = quickMatchStartedAtRef.current;
    return startedAt ? (Date.now() - startedAt) / 1000 : 0;
  }, []);

  const requestRematch = useCallback(() => {
    const room = roomInfoRef.current;
    if (!room) return;
    const gameType = room.settings.gameType;
    const source: RematchSource = room.isQuickMatch
      ? 'quick_match'
      : 'private_room';
    // 連點：同一局只算一次；實際的重複請求由伺服器擋（已在配對中就沿用、準備狀態直接設為 true）
    if (rematchRef.current?.fromRoomId !== room.roomId) {
      trackRematchClicked({ gameType, rematchSource: source });
    }
    rematchRef.current = { source, gameType, fromRoomId: room.roomId };
    setGameOverData(null);
    setCheckAnswerCorrect(null);

    if (source === 'quick_match') {
      // 沿用這一局用的暱稱（伺服器仍會檢查），不用重新設定
      const selfName = room.players.find(
        p => p.id === room.self?.playerId,
      )?.name;
      const playerName = selfName || localStorage.getItem('playerName') || '';
      if (!playerName) return;
      quickMatchStartedAtRef.current = Date.now();
      trackQuickMatchRequested('rematch');
      socket.emit(SocketEvent.QuickMatch, { playerName });
      return;
    }
    setIsRematchPending(true);
  }, []);

  const clearRematchRoomId = useCallback(() => setRematchRoomId(null), []);

  // 私人房間再玩一場：房間回到等待中後才送準備（搶答結算後幾秒才重設），
  // 帶 ready: true，連點或重送都是同一個結果
  useEffect(() => {
    if (!isRematchPending || !roomInfo || roomInfo.status !== GameStatus.Idle)
      return;
    const self = roomInfo.players.find(p => p.id === roomInfo.self?.playerId);
    if (self && !self.isMaster && !self.isReady) {
      socket.emit(SocketEvent.ReadyGame, {
        roomId: roomInfo.roomId,
        ready: true,
      });
    }
    // 只代按一次：之後玩家自己取消準備就尊重他的選擇
    setIsRematchPending(false); // eslint-disable-line react-hooks/set-state-in-effect
  }, [isRematchPending, roomInfo]);

  const startQuickMatchNow = useCallback(() => {
    if (!roomInfo?.roomId) return;
    socket.emit(SocketEvent.QuickMatchStartNow, { roomId: roomInfo.roomId });
  }, [roomInfo?.roomId]);

  // 配對結束（開局）時記錄配到幾個真人，用來觀察配對成效
  const wasQuickMatchPendingRef = useRef(false);
  useEffect(() => {
    const pending = !!roomInfo?.quickMatchPending;
    if (wasQuickMatchPendingRef.current && !pending && roomInfo) {
      trackQuickMatchStarted({
        ...countPlayers(roomInfo.players),
        matchWaitSeconds: quickMatchWaitSeconds(),
      });
      quickMatchStartedAtRef.current = null;
      setQuickMatchSecondsLeft(null);
    }
    wasQuickMatchPendingRef.current = pending;
  }, [roomInfo, quickMatchWaitSeconds]);

  // 回合時間到由伺服器直接換人（玩家斷線也會推進），前端不再代送抽牌事件

  const multiplePlayContextData: MultiplePlayContextData = useMemo(() => {
    return {
      searchRooms,
      joinRoom,
      socket,
      roomInfo,
      selectedCards,
      playerId,
      onReadyGame,
      onStartGame,
      messages,
      editRoom,
      editRoomSettings,
      removePlayer,
      checkAnswerCorrect,
      isSymbolScoreAnimationFinished,
      selectedCardSymbols,
      selectedCardNumbers,
      onFinishedSymbolScoreAnimation,
      onUpdateScore,
      onSelectCardOrSymbol,
      onDiscardCard,
      onPlayCard,
      onReselect,
      onDrawCard,
      currentPlayer,
      isYourTurn,
      onBack,
      isLastRound,
      countdown: remainRoundTime?.countdown,
      sendMessage,
      gameOverData,
      onCloseGameOver,
      gameAbortedData,
      clearGameAbortedData,
      addBot,
      connectionStatus,
      quickMatch,
      requestRematch,
      rematchRoomId,
      clearRematchRoomId,
      isRematchPending,
      quickMatchWaitSeconds,
      startQuickMatchNow,
      quickMatchSecondsLeft: roomInfo?.quickMatchPending
        ? quickMatchSecondsLeft
        : null,
    };
  }, [
    quickMatch,
    requestRematch,
    rematchRoomId,
    clearRematchRoomId,
    isRematchPending,
    quickMatchWaitSeconds,
    startQuickMatchNow,
    quickMatchSecondsLeft,
    checkAnswerCorrect,
    connectionStatus,
    currentPlayer,
    editRoom,
    editRoomSettings,
    gameAbortedData,
    clearGameAbortedData,
    gameOverData,
    isLastRound,
    isSymbolScoreAnimationFinished,
    isYourTurn,
    joinRoom,
    messages,
    onBack,
    onCloseGameOver,
    onDiscardCard,
    onDrawCard,
    onFinishedSymbolScoreAnimation,
    onPlayCard,
    onReadyGame,
    onReselect,
    addBot,
    onSelectCardOrSymbol,
    onStartGame,
    onUpdateScore,
    playerId,
    remainRoundTime?.countdown,
    removePlayer,
    roomInfo,
    selectedCards,
    searchRooms,
    selectedCardNumbers,
    selectedCardSymbols,
    sendMessage,
  ]);

  return (
    <MultiplePlayContext.Provider value={multiplePlayContextData}>
      {/* 這裡用到 component composition 的優化技巧 */}
      {children}
    </MultiplePlayContext.Provider>
  );
}

/**
 * 3. 建立使用 Context 資料的 hook
 */
export function useMultiplePlay() {
  const multiplePlayContextData = useContext(MultiplePlayContext);

  // 確保 counterContext 不會是空的
  if (multiplePlayContextData === undefined) {
    throw new Error(
      'useMultiplePlay must be used within a MultiplePlayProvider',
    );
  }

  return multiplePlayContextData;
}
