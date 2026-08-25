import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  backCard,
  createInitialBoard,
  reselectCard,
  selectCard,
  submitSelection,
} from '@/lib/match-single-play-engine';
import { playSound } from '@/lib/sound-manager';
import { MATCH_BOARD_SIZE, MatchBoardState } from '@/models/MatchBoard';
import { NumberCard } from '@/models/Player';
import { Symbol } from '@/models/Symbol';

const OPERATOR_SYMBOLS = [
  Symbol.Plus,
  Symbol.Minus,
  Symbol.Times,
  Symbol.Divide,
];

const useMatchPlay = () => {
  const [board, setBoard] = useState<MatchBoardState>();
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    setBoard(createInitialBoard());
  }, []);

  const selectedCardNumbers = useMemo(
    () => board?.selectedCards.filter(c => c.number) ?? [],
    [board?.selectedCards],
  );
  const selectedCardSymbols = useMemo(
    () =>
      board?.selectedCards.filter(
        c => c.symbol && OPERATOR_SYMBOLS.includes(c.symbol),
      ) ?? [],
    [board?.selectedCards],
  );

  const isPlaying = board?.status === 'playing';

  const onSelectCardOrSymbol = ({
    number,
    symbol,
  }: {
    number?: NumberCard;
    symbol?: Symbol;
  }) => {
    if (!board || !isPlaying) return;

    playSound('select');
    const result = selectCard(board, number, symbol);
    if (result.success) {
      setBoard(result.board);
    } else {
      toast.error(result.error);
    }
  };

  const onReselect = () => {
    if (!board || !isPlaying) return;
    const result = reselectCard(board);
    if (result.success) setBoard(result.board);
  };

  const onBack = () => {
    if (!board || !isPlaying || board.selectedCards.length === 0) return;
    const result = backCard(board);
    if (result.success) setBoard(result.board);
  };

  const onSubmit = () => {
    if (!board || !isPlaying) return;

    if (board.selectedCards.length === 0) {
      toast.warning('請組合算式');
      return;
    }

    const result = submitSelection(board);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    if (!result.isCorrect) {
      toast.error('答案不等於 24');
      playSound('wrong');
      return;
    }

    if (result.cleared) {
      playSound('gameOverWin');
    } else if (result.board.status === 'stuck') {
      playSound('gameOverEnd');
    } else {
      playSound('correct');
    }
    setBoard(result.board);
  };

  /** 隨時可呼叫，不限次數；UI 層會先跳確認彈窗才呼叫這個 */
  const onRestart = () => {
    setBoard(createInitialBoard());
  };

  const remainingCount =
    board?.cells.filter(c => c.card).length ?? MATCH_BOARD_SIZE;

  return {
    cells: board?.cells ?? [],
    selectedCards: board?.selectedCards ?? [],
    score: board?.score ?? 0,
    remainingCount,
    status: board?.status ?? 'playing',
    isGameOver: board?.status === 'cleared' || board?.status === 'stuck',
    selectedCardNumbers,
    selectedCardSymbols,
    onSelectCardOrSymbol,
    onReselect,
    onBack,
    onSubmit,
    onRestart,
  };
};

export default useMatchPlay;
