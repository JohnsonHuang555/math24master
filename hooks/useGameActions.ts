import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Room } from '@/models/Room';
import { SelectedCard } from '@/models/SelectedCard';
import { Symbol } from '@/models/Symbol';

/** 提取兩個遊戲模式共用的動畫狀態與選牌計算邏輯 */
export function useGameActions(
  roomInfo: Room | undefined,
  checkAnswerCorrect: boolean | null,
  setCheckAnswerCorrect: (value: boolean | null) => void,
) {
  const [finishedAnimations, setFinishedAnimations] = useState<number>(0);

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
    } else {
      toast.error('答案不等於 24');
    }
    setCheckAnswerCorrect(isCorrect);
  };

  return {
    selectedCardSymbols,
    selectedCardNumbers,
    isSymbolScoreAnimationFinished,
    onFinishedSymbolScoreAnimation,
    resetAnimations,
    handlePlayCardResponse,
  };
}
