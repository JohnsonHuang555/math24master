import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type ClueCard,
  type LineClueCard,
  type LineClueCardId,
  applyClue,
  calcClueResult,
  drawCards,
  getGuessRating,
  getInitialRemaining,
} from '@/lib/guess-number';

export type HistoryEntry =
  | { type: 'clue'; question: string; result: 'yes' | 'no'; round: number }
  | { type: 'peek'; round: number }
  | { type: 'guess'; number: number; round: number };

interface GuessNumberState {
  answer: number;
  remaining: number[];
  guessedNumbers: number[];
  drawnCards: ClueCard[];
  roundCount: number;
  usedCardIds: LineClueCardId[];
  peekUsed: boolean;
  peekActive: boolean;
  isPeeking: boolean;
  isWin: boolean;
  selectedCard: ClueCard | null;
  clueResult: 'yes' | 'no' | null;
  isRoundGuessed: boolean;
  gameOver: boolean;
  history: HistoryEntry[];
  lastGuess: number | null;
  redrawUsed: boolean;
  redrawnThisRound: boolean;
}

function createInitialState(): GuessNumberState {
  return {
    answer: Math.floor(Math.random() * 90) + 10,
    remaining: getInitialRemaining(),
    guessedNumbers: [],
    drawnCards: drawCards([], false, false, true),
    roundCount: 0,
    usedCardIds: [],
    peekUsed: false,
    peekActive: false,
    isPeeking: false,
    isWin: false,
    selectedCard: null,
    clueResult: null,
    isRoundGuessed: false,
    gameOver: false,
    history: [],
    lastGuess: null,
    redrawUsed: false,
    redrawnThisRound: false,
  };
}

export function useGuessNumber() {
  const [state, setState] = useState<GuessNumberState | null>(null);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    setState(createInitialState());
    return () => clearTimeout(peekTimerRef.current);
  }, []);

  const selectCard = useCallback((card: ClueCard) => {
    if (card.id === 'peek') {
      setState(prev => {
        if (
          prev === null ||
          prev.peekUsed ||
          prev.isRoundGuessed ||
          prev.gameOver ||
          prev.selectedCard !== null
        )
          return prev;
        return {
          ...prev,
          peekUsed: true,
          peekActive: true,
          isPeeking: true,
          history: [
            ...prev.history,
            { type: 'peek', round: prev.roundCount + 1 },
          ],
        };
      });
      clearTimeout(peekTimerRef.current);
      peekTimerRef.current = setTimeout(() => {
        setState(p => (p ? { ...p, isPeeking: false } : p));
      }, 5000);
      return;
    }

    if (card.id === 'redraw') {
      clearTimeout(peekTimerRef.current);
      setState(prev => {
        if (
          prev === null ||
          prev.redrawUsed ||
          prev.redrawnThisRound ||
          prev.isRoundGuessed ||
          prev.gameOver ||
          prev.selectedCard !== null
        )
          return prev;
        return {
          ...prev,
          drawnCards: drawCards(prev.usedCardIds, prev.peekUsed, true, prev.lastGuess === null),
          redrawUsed: true,
          redrawnThisRound: true,
        };
      });
      return;
    }

    setState(prev => {
      if (prev === null || prev.isRoundGuessed || prev.selectedCard !== null)
        return prev;

      const lineCard = card as LineClueCard;
      const context = { lastGuess: prev.lastGuess ?? undefined };
      const result = calcClueResult(prev.answer, lineCard, context);
      return {
        ...prev,
        selectedCard: card,
        clueResult: result,
        remaining: applyClue(prev.remaining, lineCard, result, context),
        usedCardIds: [...prev.usedCardIds, lineCard.id],
        history: [
          ...prev.history,
          {
            type: 'clue',
            question: lineCard.question,
            result,
            round: prev.roundCount + 1,
          },
        ],
      };
    });
  }, []);

  const submitGuess = useCallback((guess: number) => {
    setState(prev => {
      if (prev === null || prev.gameOver || prev.isRoundGuessed) return prev;
      const canGuess =
        (prev.selectedCard !== null && prev.selectedCard.id !== 'peek') ||
        prev.peekActive;
      if (!canGuess) return prev;

      const newGuessedNumbers = [...prev.guessedNumbers, guess];
      const newRoundCount = prev.roundCount + 1;
      const newHistory: HistoryEntry[] = [
        ...prev.history,
        { type: 'guess', number: guess, round: newRoundCount },
      ];

      if (guess === prev.answer) {
        return {
          ...prev,
          guessedNumbers: newGuessedNumbers,
          roundCount: newRoundCount,
          isRoundGuessed: true,
          gameOver: true,
          isWin: true,
          history: newHistory,
        };
      }

      if (newRoundCount >= 10) {
        return {
          ...prev,
          guessedNumbers: newGuessedNumbers,
          roundCount: newRoundCount,
          isRoundGuessed: true,
          gameOver: true,
          isWin: false,
          lastGuess: guess,
          history: newHistory,
        };
      }

      return {
        ...prev,
        guessedNumbers: newGuessedNumbers,
        roundCount: newRoundCount,
        isRoundGuessed: true,
        lastGuess: guess,
        history: newHistory,
      };
    });
  }, []);

  const nextRound = useCallback(() => {
    setState(prev => {
      if (prev === null || !prev.isRoundGuessed || prev.gameOver) return prev;
      clearTimeout(peekTimerRef.current);
      return {
        ...prev,
        drawnCards: drawCards(prev.usedCardIds, prev.peekUsed, prev.redrawUsed, false),
        selectedCard: null,
        clueResult: null,
        isRoundGuessed: false,
        isPeeking: false,
        peekActive: false,
        redrawnThisRound: false,
      };
    });
  }, []);

  const restart = useCallback(() => {
    clearTimeout(peekTimerRef.current);
    setState(createInitialState());
  }, []);

  return {
    ...(state ?? {
      answer: 0,
      remaining: [],
      guessedNumbers: [],
      drawnCards: [],
      roundCount: 0,
      usedCardIds: [],
      peekUsed: false,
      peekActive: false,
      isPeeking: false,
      isWin: false,
      selectedCard: null,
      clueResult: null,
      isRoundGuessed: false,
      gameOver: false,
      history: [] as HistoryEntry[],
      lastGuess: null,
      redrawUsed: false,
      redrawnThisRound: false,
    }),
    isMounted: state !== null,
    selectCard,
    submitGuess,
    nextRound,
    restart,
    rating: state?.gameOver ? getGuessRating(state.roundCount, state.isWin) : null,
  };
}
