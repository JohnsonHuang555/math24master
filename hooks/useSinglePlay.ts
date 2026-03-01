import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { useGameActions } from '@/hooks/useGameActions';
import { unlockAchievement } from '@/lib/achievement-manager';
import { playSound } from '@/lib/sound-manager';
import { GameMode } from '@/models/GameMode';
import { NumberCard } from '@/models/Player';
import { Difficulty, Room } from '@/models/Room';
import { SocketEvent } from '@/models/SocketEvent';
import { Symbol } from '@/models/Symbol';
import { useAchievementStore } from '@/stores/achievement-store';
import { useStatsStore } from '@/stores/stats-store';

const socket = io();

const useSinglePlay = (difficulty: Difficulty | null) => {
  // 答案是否正確
  const [checkAnswerCorrect, setCheckAnswerCorrect] = useState<boolean | null>(
    null,
  );

  const [roomInfo, setRoomInfo] = useState<Room>();
  const hasStartedRef = useRef(false);

  const {
    selectedCardSymbols,
    selectedCardNumbers,
    isSymbolScoreAnimationFinished,
    onFinishedSymbolScoreAnimation,
    resetAnimations,
    handlePlayCardResponse,
    markTurnStart,
  } = useGameActions(roomInfo, checkAnswerCorrect, setCheckAnswerCorrect);

  const isLastRound = useMemo(
    () => roomInfo?.deck.length === 0,
    [roomInfo?.deck.length],
  );

  const isGameOver = useMemo(
    () => !!roomInfo?.isGameOver,
    [roomInfo?.isGameOver],
  );

  useEffect(() => {
    // 等待難度選定後才啟動
    if (!difficulty || hasStartedRef.current) return;
    hasStartedRef.current = true;

    const roomId = uuidv4();

    socket.emit(SocketEvent.JoinRoom, {
      roomId,
      maxPlayers: 1,
      playerName: 'single',
      mode: GameMode.Single,
      difficulty,
    });

    socket.on(SocketEvent.JoinRoomSuccess, () => {
      // 遊戲開始
      socket.emit(SocketEvent.StartGame, { roomId });
    });

    socket.on(SocketEvent.ErrorMessage, message => {
      toast.error(message);
    });

    // 房間更新
    socket.on(
      SocketEvent.RoomUpdate,
      ({
        room,
        extra,
      }: {
        room: Room;
        extra?: { event: SocketEvent; data: boolean };
      }) => {
        setRoomInfo(room);
        if (extra?.event === SocketEvent.PlayCardResponse) {
          handlePlayCardResponse(extra.data);
        }
      },
    );

    // socket.on('disconnect', () => {
    //   toast.error('連線已中斷，請重新整理頁面');
    // });

    return () => {
      socket.disconnect();
    };
  }, [difficulty]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isLastRound) {
      toast.warning('最後一回合囉');
    }
  }, [isLastRound]);

  useEffect(() => {
    if (isGameOver) {
      playSound('gameOverEnd');
      useStatsStore.getState().incrementSinglePlays();
      // 成就：精準（本局未跳過）
      const skipCount = useAchievementStore.getState().singleSkipCount;
      if (skipCount === 0) {
        unlockAchievement('no_skip');
      }
      useAchievementStore.getState().resetSingleSession();
    }
  }, [isGameOver]);

  const onSelectCardOrSymbol = ({
    number,
    symbol,
  }: {
    number?: NumberCard;
    symbol?: Symbol;
  }) => {
    if (isGameOver) return;

    playSound('select');
    if (socket) {
      socket.emit(SocketEvent.SelectCard, {
        roomId: roomInfo?.roomId,
        number,
        symbol,
      });
    }
  };

  // 重選
  const onReselect = () => {
    if (isGameOver) return;

    if (socket) {
      socket.emit(SocketEvent.ReselectCard, {
        roomId: roomInfo?.roomId,
      });
    }
  };

  // 抽牌
  const onDrawCard = () => {
    if (isGameOver || checkAnswerCorrect !== null) return;

    if (socket) {
      // 沒出過牌抽 1 張，反之抽出過牌的數量
      socket.emit(SocketEvent.DrawCard, {
        roomId: roomInfo?.roomId,
      });
    }
  };

  // 跳過（換 4 張新牌）
  const onSkipHand = () => {
    if (isGameOver) return;

    playSound('skip');
    useAchievementStore.getState().incrementSkip();
    useStatsStore.getState().incrementSkips();
    if (socket) {
      socket.emit(SocketEvent.SkipHand, {
        roomId: roomInfo?.roomId,
      });
    }
  };

  // 出牌
  const onPlayCard = () => {
    if (isGameOver) return;

    if (roomInfo?.selectedCards.length === 0) {
      toast.warning('請組合算式');
      return;
    }

    if (socket) {
      socket.emit(SocketEvent.PlayCard, {
        roomId: roomInfo?.roomId,
      });
    }
  };

  // 更新分數並抽牌
  const onUpdateScore = () => {
    if (isGameOver) return;

    if (socket) {
      // 重置狀態
      setCheckAnswerCorrect(null);
      resetAnimations();

      socket.emit(SocketEvent.UpdateScore, {
        roomId: roomInfo?.roomId,
      });
    }
  };

  const onBack = () => {
    if (isGameOver) return;

    if (socket && roomInfo?.selectedCards.length) {
      socket.emit(SocketEvent.BackCard, {
        roomId: roomInfo?.roomId,
      });
    }
  };

  return {
    roomInfo,
    onPlayCard,
    onDrawCard,
    onSkipHand,
    onSelectCardOrSymbol,
    onReselect,
    checkAnswerCorrect,
    isSymbolScoreAnimationFinished,
    selectedCardSymbols,
    selectedCardNumbers,
    onUpdateScore,
    isGameOver,
    onFinishedSymbolScoreAnimation,
    onBack,
    isLastRound,
  };
};

export default useSinglePlay;
