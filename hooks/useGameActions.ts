import { useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { unlockAchievement } from '@/lib/achievement-manager';
import { calcRoundScore } from '@/lib/scoring';
import { playSound } from '@/lib/sound-manager';
import { Room } from '@/models/Room';
import { SelectedCard } from '@/models/SelectedCard';
import { Symbol } from '@/models/Symbol';
import { useAchievementStore } from '@/stores/achievement-store';
import { useStatsStore } from '@/stores/stats-store';

/** 提取兩個遊戲模式共用的動畫狀態與選牌計算邏輯 */
export function useGameActions(
  roomInfo: Room | undefined,
  checkAnswerCorrect: boolean | null,
  setCheckAnswerCorrect: (value: boolean | null) => void,
) {
  const [finishedAnimations, setFinishedAnimations] = useState<number>(0);
  const turnStartTimeRef = useRef<number>(Date.now());

  // 已選的符號牌（僅計分符號）
  const selectedCardSymbols: SelectedCard[] = useMemo(() => {
    return (
      roomInfo?.selectedCards.filter(
        c =>
          c.symbol &&
          [Symbol.Plus, Symbol.Minus, Symbol.Times, Symbol.Divide].includes(
            c.symbol,
          ),
      ) || []
    );
  }, [roomInfo?.selectedCards]);

  // 已選的數字牌
  const selectedCardNumbers: SelectedCard[] = useMemo(() => {
    return roomInfo?.selectedCards.filter(c => c.number) || [];
  }, [roomInfo?.selectedCards]);

  const isSymbolScoreAnimationFinished =
    checkAnswerCorrect === true &&
    finishedAnimations === selectedCardSymbols.length;

  const onFinishedSymbolScoreAnimation = () => {
    setFinishedAnimations(state => state + 1);
  };

  const resetAnimations = () => {
    setFinishedAnimations(0);
  };

  /** 處理 PlayCardResponse socket 事件 */
  const handlePlayCardResponse = (isCorrect: boolean) => {
    if (isCorrect) {
      toast.success('答案正確');
      playSound('correct');

      const elapsed = Date.now() - turnStartTimeRef.current;

      // 成就：初次出牌
      unlockAchievement('first_win');

      // 成就：累計出牌 10 / 50 次
      const store = useAchievementStore.getState();
      store.incrementPlays();
      const newTotalPlays = store.totalPlays + 1;
      if (newTotalPlays >= 10) unlockAchievement('play_10');
      if (newTotalPlays >= 50) unlockAchievement('play_50');

      // 成就：乘法王（3 個乘號）
      const timesCount = selectedCardSymbols.filter(
        s => s.symbol === Symbol.Times,
      ).length;
      if (timesCount >= 3) unlockAchievement('all_multiply');

      // 成就：神速（10 秒內出牌）
      if (elapsed <= 10000) unlockAchievement('speed_win');

      // 統計：最快出牌
      useStatsStore.getState().updateFastestPlay(elapsed);

      // 成就：score_10（單回合 ≥ 10 分）
      const roundScore = calcRoundScore(selectedCardSymbols);
      if (roundScore >= 10) unlockAchievement('score_10');

      // 成就：連勝達人（連續 3 次成功）
      store.incrementConsecutiveWins();
      if (store.consecutiveWins + 1 >= 3) unlockAchievement('consecutive_3');

      // 成就：得分達人（累計 50 分）
      store.addScore(roundScore);
      if (store.totalScore + roundScore >= 50) unlockAchievement('total_score_50');
    } else {
      toast.error('答案不等於 24');
      playSound('wrong');
      // 連勝中斷
      useAchievementStore.getState().resetConsecutiveWins();
    }
    setCheckAnswerCorrect(isCorrect);
  };

  /** 記錄回合開始時間（在 UpdateScore / 新回合開始時呼叫） */
  const markTurnStart = () => {
    turnStartTimeRef.current = Date.now();
  };

  return {
    selectedCardSymbols,
    selectedCardNumbers,
    isSymbolScoreAnimationFinished,
    onFinishedSymbolScoreAnimation,
    resetAnimations,
    handlePlayCardResponse,
    markTurnStart,
  };
}
