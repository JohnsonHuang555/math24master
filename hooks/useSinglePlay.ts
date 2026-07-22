import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useGameActions } from '@/hooks/useGameActions';
import { unlockAchievement } from '@/lib/achievement-manager';
import {
  backCard,
  createInitialRoom,
  playCard,
  reselectCard,
  selectCard,
  skipHand,
  updateScore,
} from '@/lib/classic-single-play-engine';
import { playSound } from '@/lib/sound-manager';
import { HandResult, NumberCard } from '@/models/Player';
import { Difficulty, Room } from '@/models/Room';
import { Symbol } from '@/models/Symbol';
import { useAchievementStore } from '@/stores/achievement-store';
import { useStatsStore } from '@/stores/stats-store';

const useSinglePlay = (difficulty: Difficulty | null) => {
  // 答案是否正確
  const [checkAnswerCorrect, setCheckAnswerCorrect] = useState<boolean | null>(
    null,
  );

  const [roomInfo, setRoomInfo] = useState<Room>();
  // 上一手結算回饋（本手最高分、是否完美手）
  const [lastHandResult, setLastHandResult] = useState<HandResult | null>(null);
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

    setRoomInfo(createInitialRoom(difficulty));
  }, [difficulty]);

  useEffect(() => {
    if (isLastRound) {
      toast.warning('最後一回合囉');
    }
  }, [isLastRound]);

  useEffect(() => {
    if (isGameOver) {
      playSound('gameOverEnd');
      useStatsStore.getState().incrementClassicPlays();
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
    if (isGameOver || !roomInfo) return;

    playSound('select');
    const result = selectCard(roomInfo, number, symbol);
    if (result.success) {
      setRoomInfo(result.room);
    } else {
      toast.error(result.error);
    }
  };

  // 重選
  const onReselect = () => {
    if (isGameOver || !roomInfo) return;

    const result = reselectCard(roomInfo);
    if (result.success) {
      setRoomInfo(result.room);
    }
  };

  // 抽牌（目前經典模式 UI 未使用，保留介面相容）
  const onDrawCard = () => {
    if (isGameOver || checkAnswerCorrect !== null || !roomInfo) return;
  };

  // 跳過（換 4 張新牌）
  const onSkipHand = () => {
    if (isGameOver || !roomInfo) return;

    playSound('skip');
    useAchievementStore.getState().incrementSkip();
    useStatsStore.getState().incrementClassicSkips();

    const result = skipHand(roomInfo);
    if (result.success) {
      setRoomInfo(result.room);
    } else {
      toast.error(result.error);
    }
  };

  // 出牌
  const onPlayCard = () => {
    if (isGameOver || !roomInfo) return;

    if (roomInfo.selectedCards.length === 0) {
      toast.warning('請組合算式');
      return;
    }

    const result = playCard(roomInfo);
    if (result.success) {
      setRoomInfo(result.room);
      handlePlayCardResponse(result.isCorrect);
    } else {
      toast.error(result.error);
    }
  };

  // 更新分數並抽牌
  const onUpdateScore = () => {
    if (isGameOver || !roomInfo) return;

    // 重置狀態
    setCheckAnswerCorrect(null);
    resetAnimations();

    const result = updateScore(roomInfo);
    if (result.success) {
      setRoomInfo(result.room);
      if (result.handResult) {
        setLastHandResult(result.handResult);
      }
    } else {
      toast.error(result.error);
    }
  };

  const onBack = () => {
    if (isGameOver || !roomInfo?.selectedCards.length) return;

    const result = backCard(roomInfo);
    if (result.success) {
      setRoomInfo(result.room);
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
    lastHandResult,
  };
};

export default useSinglePlay;
