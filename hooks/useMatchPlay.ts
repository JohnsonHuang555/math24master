import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useServerErrorText } from '@/i18n/server-messages';
import { trackGameComplete, trackGameStart } from '@/lib/analytics';
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
  const tToast = useTranslations('GameUI.toast');
  // 引擎回傳錯誤代碼，在這裡翻成玩家的語言（見 docs/adr/0009）
  const errorText = useServerErrorText();
  const [board, setBoard] = useState<MatchBoardState>();
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    setBoard(createInitialBoard());
    trackGameStart('match');
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
      toast.error(errorText(result.error, result.params));
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
      toast.warning(tToast('buildEquation'));
      return;
    }

    const result = submitSelection(board);
    if (!result.success) {
      toast.error(errorText(result.error, result.params));
      return;
    }
    if (!result.isCorrect) {
      toast.error(errorText('ANSWER_NOT_24'));
      playSound('wrong');
      return;
    }

    if (result.cleared) {
      playSound('gameOverWin');
      trackGameComplete('match', { result: 'cleared' });
    } else if (result.board.status === 'stuck') {
      playSound('gameOverEnd');
      trackGameComplete('match', { result: 'stuck' });
    } else {
      playSound('correct');
    }
    setBoard(result.board);
  };

  /** 隨時可呼叫，不限次數；UI 層會先跳確認彈窗才呼叫這個 */
  const onRestart = () => {
    setBoard(createInitialBoard());
    trackGameStart('match');
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
