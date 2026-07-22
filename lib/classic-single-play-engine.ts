import { v4 as uuidv4 } from 'uuid';
import { canMake24, findAllSolutions } from '@/lib/daily-seed';
import { createDeckByStandardMode, draw, shuffleArray } from '@/lib/deck';
import { calculateAnswer } from '@/lib/utils';
import { GameStatus } from '@/models/GameStatus';
import { HandResult, NumberCard, Player } from '@/models/Player';
import { DeckType, Difficulty, HAND_CARD_COUNT, Room } from '@/models/Room';
import { Symbol } from '@/models/Symbol';

// 單人經典模式：拿滿該手理論最高分的額外獎勵
const PERFECT_HAND_BONUS = 1;

type EngineResult =
  | { success: true; room: Room }
  | { success: false; error: string };

type PlayCardResult =
  | { success: true; room: Room; isCorrect: boolean }
  | { success: false; error: string };

type UpdateScoreResult =
  | { success: true; room: Room; handResult?: HandResult }
  | { success: false; error: string };

function _maxValueFor(difficulty: Difficulty): number {
  if (difficulty === Difficulty.Easy) return 6;
  if (difficulty === Difficulty.Hard) return 13;
  return 10;
}

/** 抽出有解的手牌，若多次嘗試仍無解則直接返回（兜底） */
function _drawSolvableHand(
  deck: NumberCard[],
  n: number,
  maxAttempts = 20,
): { drawn: NumberCard[]; deck: NumberCard[] } {
  let currentDeck = deck;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (currentDeck.length < n) break;
    const { drawn, remaining } = draw(currentDeck, n);
    if (canMake24(drawn.map(c => c.value))) {
      return { drawn, deck: remaining };
    }
    currentDeck = shuffleArray([...remaining, ...drawn]);
  }
  // 兜底：無解時回傳預設有解牌值 [1,2,3,4]（仍消耗牌庫以維持牌庫計數）
  const DEFAULT_SOLVABLE_VALUES = [1, 2, 3, 4];
  if (currentDeck.length >= n) {
    const { drawn: removed, remaining } = draw(currentDeck, n);
    const drawn = removed.map((card, i) => ({
      ...card,
      value: DEFAULT_SOLVABLE_VALUES[i % DEFAULT_SOLVABLE_VALUES.length],
    }));
    return { drawn, deck: remaining };
  }
  // 牌堆不足 n 張：取全部
  return { drawn: currentDeck, deck: [] };
}

/** 輪到最後一位玩家結束回合，才真正結算遊戲（與伺服器端 _checkGameOver 相同的兩階段判斷） */
function _checkGameOver(room: Room): Room | null {
  const player = room.players[0];
  if (player.isLastRoundPlayer) {
    return {
      ...room,
      isGameOver: true,
      status: GameStatus.Idle,
    };
  }
  return null;
}

/** 建立單人經典模式初始房間（發牌、洗牌），對應 joinRoom + startGame */
export function createInitialRoom(difficulty: Difficulty): Room {
  const maxValue = _maxValueFor(difficulty);
  let tempDeck = createDeckByStandardMode(2, maxValue);

  // 若牌庫大小不是 4 的倍數，隨機移除多餘的牌，確保不會有孤牌剩餘
  const remainder = tempDeck.length % 4;
  if (remainder !== 0) {
    tempDeck = shuffleArray(tempDeck).slice(remainder);
  }

  const shuffledDeck: NumberCard[] = shuffleArray(tempDeck).map(d => ({
    id: uuidv4(),
    value: d,
  }));

  const { drawn, remaining } = draw(shuffledDeck, HAND_CARD_COUNT);

  const player: Player = {
    id: 'single',
    name: 'single',
    handCard: drawn,
    score: 0,
    perfectHands: 0,
    theoreticalMax: 0,
    playerOrder: 1,
    isMaster: true,
    isLastRoundPlayer: false,
    isReady: true,
    hasMelded: false,
  };

  return {
    roomId: uuidv4(),
    maxPlayers: 1,
    currentOrder: 1,
    deck: remaining,
    players: [player],
    isGameOver: false,
    selectedCards: [],
    status: GameStatus.Playing,
    settings: {
      deckType: DeckType.Standard,
      remainSeconds: null,
      difficulty,
      gameType: 'classic',
    },
    board: [],
  };
}

export function selectCard(
  room: Room,
  number: NumberCard | undefined,
  symbol: Symbol | undefined,
): EngineResult {
  try {
    const selectedCards = [...room.selectedCards];

    if (selectedCards.length === 0 && symbol && symbol !== Symbol.LeftBracket) {
      return { success: false, error: '第一個只能用左括號或數字' };
    }

    if (number) {
      const currentSelect = selectedCards[selectedCards.length - 1];

      // 如果前一個是數字則不能選
      if (currentSelect?.number && currentSelect?.number.id !== number.id) {
        return { success: false, error: '數字牌不能連續使用' };
      }

      if (currentSelect?.symbol === Symbol.RightBracket) {
        selectedCards.push({ symbol: Symbol.Times });
      }

      const isExistIndex = selectedCards.findIndex(
        s => s.number?.id === number.id,
      );
      if (isExistIndex !== -1) {
        selectedCards.splice(isExistIndex, 1);
      } else {
        selectedCards.push({ number });
      }
    }
    if (symbol) {
      const lastCard = selectedCards[selectedCards.length - 1];
      if (lastCard?.symbol === Symbol.Minus && symbol === Symbol.Minus) {
        return { success: false, error: '減號不能連續用' };
      }

      if (lastCard?.symbol === Symbol.Plus && symbol === Symbol.Plus) {
        return { success: false, error: '加號不能連續用' };
      }

      if (lastCard?.symbol === Symbol.Times && symbol === Symbol.Times) {
        return { success: false, error: '乘號不能連續用' };
      }

      if (lastCard?.symbol === Symbol.Divide && symbol === Symbol.Divide) {
        return { success: false, error: '除號不能連續用' };
      }

      if (
        lastCard?.symbol === Symbol.LeftBracket &&
        [Symbol.Plus, Symbol.Minus].includes(symbol)
      ) {
        return { success: false, error: '左括號後面無法使用減號或加號' };
      }

      if (symbol === Symbol.LeftBracket && lastCard?.number) {
        selectedCards.push({ symbol: Symbol.Times });
      }
      selectedCards.push({ symbol });
    }

    return { success: true, room: { ...room, selectedCards } };
  } catch (e) {
    return { success: false, error: '發生錯誤，請稍後再試 (select card)' };
  }
}

export function reselectCard(room: Room): EngineResult {
  return { success: true, room: { ...room, selectedCards: [] } };
}

export function backCard(room: Room): EngineResult {
  return {
    success: true,
    room: { ...room, selectedCards: room.selectedCards.slice(0, -1) },
  };
}

export function playCard(room: Room): PlayCardResult {
  try {
    const player = room.players[0];
    const selectedCards = room.selectedCards;
    const answer = calculateAnswer(selectedCards);

    // 使用的數字牌
    const numberCardIds = selectedCards
      .filter(c => c.number)
      .map(c => c.number?.id);

    // 經典模式：必須用完所有手牌
    const handCardCount = player.handCard.length;
    if (answer === 24 && numberCardIds.length === handCardCount) {
      const newHandCard = player.handCard.filter(
        c => !numberCardIds.includes(c.id),
      );
      return {
        success: true,
        room: { ...room, players: [{ ...player, handCard: newHandCard }] },
        isCorrect: true,
      };
    }
    return { success: true, room, isCorrect: false };
  } catch (e) {
    return { success: false, error: '算式有誤 (play card)' };
  }
}

/** 抽牌補滿手牌，對應伺服器端 drawCard（單人模式無需處理回合切換） */
function drawCard(room: Room, count: number): EngineResult {
  try {
    const gameOverRoom = _checkGameOver(room);
    if (gameOverRoom) {
      return { success: true, room: gameOverRoom };
    }

    const player = room.players[0];
    let newDeck = room.deck;
    let newHandCard = player.handCard;
    let newIsLastRoundPlayer = player.isLastRoundPlayer;

    if (room.deck.length <= count) {
      newHandCard = [...player.handCard, ...room.deck];
      newDeck = [];
      newIsLastRoundPlayer = true;
    } else {
      const result = _drawSolvableHand(room.deck, count);
      newHandCard = [...player.handCard, ...result.drawn];
      newDeck = result.deck;
    }

    return {
      success: true,
      room: {
        ...room,
        deck: newDeck,
        players: [
          {
            ...player,
            handCard: newHandCard,
            isLastRoundPlayer: newIsLastRoundPlayer,
          },
        ],
      },
    };
  } catch (e) {
    return { success: false, error: '發生錯誤，請稍後再試 (draw card)' };
  }
}

export function updateScore(room: Room): UpdateScoreResult {
  try {
    const selectedCards = room.selectedCards;
    const numberCardIds = selectedCards
      .filter(c => c.number)
      .map(c => c.number?.id);

    // 計算分數
    let score = 0;
    const plusAndMinusCount = selectedCards.filter(
      c => c.symbol && [Symbol.Plus, Symbol.Minus].includes(c.symbol),
    ).length;
    score += plusAndMinusCount;

    const timesCount = selectedCards.filter(
      c => c.symbol === Symbol.Times,
    ).length;
    const divideCount = selectedCards.filter(
      c => c.symbol === Symbol.Divide,
    ).length;
    score += timesCount * 2;
    score += divideCount * 3;
    if (timesCount >= 2) score += 1;
    if (divideCount >= 2) score += 1;

    // 單人經典模式：計算本手理論最高分，拿滿給完美手 bonus
    const values = selectedCards
      .filter(c => c.number)
      .map(c => c.number!.value);
    const solutions = findAllSolutions(values);
    const maxScore = solutions.length > 0 ? solutions[0].score : score;
    const isPerfect = score >= maxScore;
    const handResult: HandResult = { roundScore: score, maxScore, isPerfect };
    if (isPerfect) {
      score += PERFECT_HAND_BONUS;
    }

    const player = room.players[0];
    const roomAfterScore: Room = {
      ...room,
      selectedCards: [],
      players: [
        {
          ...player,
          score: player.score + score,
          perfectHands: (player.perfectHands ?? 0) + (isPerfect ? 1 : 0),
          theoreticalMax:
            (player.theoreticalMax ?? 0) + maxScore + PERFECT_HAND_BONUS,
        },
      ],
    };

    const drawResult = drawCard(roomAfterScore, numberCardIds.length);
    if (!drawResult.success) {
      return { success: false, error: drawResult.error };
    }
    return { success: true, room: drawResult.room, handResult };
  } catch (e) {
    return { success: false, error: '發生錯誤，請稍後再試 (update score)' };
  }
}

export function skipHand(room: Room): EngineResult {
  try {
    const gameOverRoom = _checkGameOver(room);
    if (gameOverRoom) {
      return { success: true, room: gameOverRoom };
    }

    const player = room.players[0];
    const deckCount = room.deck.length;
    let newHandCard: NumberCard[];
    let newDeck: NumberCard[];
    let newIsLastRoundPlayer = player.isLastRoundPlayer;

    if (deckCount <= HAND_CARD_COUNT) {
      newHandCard = room.deck;
      newDeck = [];
      newIsLastRoundPlayer = true;
    } else {
      const result = _drawSolvableHand(room.deck, HAND_CARD_COUNT);
      newHandCard = result.drawn;
      newDeck = result.deck;
    }

    return {
      success: true,
      room: {
        ...room,
        deck: newDeck,
        selectedCards: [],
        players: [
          {
            ...player,
            handCard: newHandCard,
            isLastRoundPlayer: newIsLastRoundPlayer,
          },
        ],
      },
    };
  } catch (e) {
    return { success: false, error: '發生錯誤，請稍後再試 (skip hand)' };
  }
}
