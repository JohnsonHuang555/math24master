import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/components/ui/use-toast';
import { fadeVariants } from '@/lib/animation-variants';
import { NumberCard } from '@/models/Player';
import { Room } from '@/models/Room';
import { MAX_FORMULAS_NUMBER_COUNT } from '@/models/Room';
import { SocketEvent } from '@/models/SocketEvent';
import { Symbol } from '@/models/Symbol';

export type SelectedCard = {
  number?: NumberCard;
  symbol?: Symbol;
};

const useSinglePlay = () => {
  // 選的牌
  const [selectedCards, setSelectedCards] = useState<SelectedCard[]>([]);
  // 答案是否正確
  const [checkAnswerCorrect, setCheckAnswerCorrect] = useState<boolean | null>(
    null,
  );
  // 出過牌的數量
  const [playedCard, setPlayedCard] = useState(0);
  // 動畫完成時
  const [finishedAnimations, setFinishedAnimations] = useState<number>(0);

  const [roomInfo, setRoomInfo] = useState<Room>();
  const [socket, setSocket] = useState<any>();

  const isLastRound = useMemo(
    () => roomInfo?.deck.length === 0,
    [roomInfo?.deck.length],
  );

  const isGameOver = useMemo(
    () => !!roomInfo?.isGameOver,
    [roomInfo?.isGameOver],
  );

  // 已選的符號牌
  const selectedCardSymbols = useMemo(() => {
    return selectedCards.filter(
      c =>
        c.symbol &&
        [Symbol.Plus, Symbol.Minus, Symbol.Times, Symbol.Divide].includes(
          c.symbol,
        ),
    );
  }, [selectedCards]);

  // 已選的數字牌
  const selectedCardNumbers = useMemo(() => {
    return selectedCards.filter(c => c.number);
  }, [selectedCards]);

  useEffect(() => {
    const roomId = uuidv4();
    const socket = io();
    setSocket(socket);

    socket.emit(SocketEvent.JoinRoom, {
      roomId,
      maxPlayers: 1,
      playerName: 'single',
    });

    socket.on(SocketEvent.JoinRoomSuccess, () => {
      // 遊戲開始
      socket.emit(SocketEvent.StartGame, { roomId });
    });

    socket.on(SocketEvent.ErrorMessage, message => {
      toast({ title: message, className: 'bg-red-500' });
    });

    // 遊戲開始回傳
    socket.on(SocketEvent.StartGameSuccess, (roomInfo: Room) => {
      setRoomInfo(roomInfo);
    });

    // 房間更新
    socket.on(SocketEvent.RoomUpdate, (roomInfo: Room) => {
      setRoomInfo(roomInfo);
    });

    // 房間更新
    socket.on(SocketEvent.PlayCardResponse, (isCorrect: boolean) => {
      setCheckAnswerCorrect(isCorrect);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (checkAnswerCorrect !== null) {
      toast({
        duration: 2000,
        title: checkAnswerCorrect ? '答對了' : '不對唷',
        style: {
          backgroundColor: checkAnswerCorrect
            ? 'rgb(34 197 94)'
            : 'rgb(239 68 68)',
        },
        className: 'text-white',
      });
    }
  }, [checkAnswerCorrect]);

  useEffect(() => {
    if (isLastRound) {
      toast({
        title: '最後一回合囉',
        className: 'bg-amber-300 text-white',
      });
    }
  }, [isLastRound]);

  const onSelectCardOrSymbol = ({
    number,
    symbol,
  }: {
    number?: NumberCard;
    symbol?: Symbol;
  }) => {
    if (isGameOver) return;
    if (
      selectedCards.length === 0 &&
      symbol &&
      [Symbol.Plus, Symbol.Times, Symbol.Divide, Symbol.RightBracket].includes(
        symbol,
      )
    ) {
      toast({
        title: '第一個符號只能用減號或左括號',
        className: 'bg-red-500 text-white',
      });
      return;
    }

    if (number) {
      const currentSelect = selectedCards[selectedCards.length - 1];
      const currentSelectedNumbers = selectedCards.filter(c => c.number);

      // 如果前一個是數字則不能選
      if (currentSelect?.number && currentSelect?.number.id !== number.id) {
        toast({
          title: '數字牌不能連續使用',
          className: 'bg-amber-300 text-white',
        });
        return;
      }

      // 如果前一個是數字則不能選
      if (
        currentSelect?.number &&
        currentSelectedNumbers.length === MAX_FORMULAS_NUMBER_COUNT &&
        currentSelect?.number.id !== number.id
      ) {
        toast({
          title: `數字牌最多 ${MAX_FORMULAS_NUMBER_COUNT} 張`,
          className: 'bg-amber-300',
        });
        return;
      }

      setSelectedCards(state => {
        const isExist = state.find(c => c.number?.id === number.id);
        if (isExist) {
          return state.filter(c => c.number?.id !== number.id);
        }
        return [...state, { number }];
      });
    }
    if (symbol) {
      setSelectedCards(state => [...state, { symbol }]);
    }
  };

  // 重選
  const onReselect = () => {
    if (isGameOver) return;
    setSelectedCards([]);
  };

  const showCurrentSelect = () => {
    return selectedCards.map((card, index) => {
      if (card.symbol) {
        switch (card.symbol) {
          case Symbol.Plus:
            return (
              <motion.span
                key={`${index}-${card}`}
                variants={fadeVariants}
                initial="hidden"
                animate="show"
                className="relative"
              >
                <Image
                  src="/plus.svg"
                  alt="plus"
                  width={52}
                  height={52}
                  priority
                />
                {checkAnswerCorrect && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.1 }}
                    animate={{
                      opacity: 1,
                      y: -25,
                      x: 13,
                      scale: 1.15,
                      transition: { delay: index * 0.3 },
                    }}
                    className="absolute top-0"
                    onAnimationComplete={() =>
                      setFinishedAnimations(state => state + 1)
                    }
                  >
                    <div style={{ color: 'rgb(5 150 105)', fontWeight: '600' }}>
                      +1
                    </div>
                  </motion.div>
                )}
              </motion.span>
            );
          case Symbol.Minus:
            return (
              <motion.span
                key={`${index}-${card}`}
                variants={fadeVariants}
                initial="hidden"
                animate="show"
                className="relative"
              >
                <Image
                  src="/minus.svg"
                  alt="minus"
                  width={52}
                  height={52}
                  priority
                />
                {checkAnswerCorrect && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.1 }}
                    animate={{
                      opacity: 1,
                      y: -25,
                      x: 13,
                      scale: 1.15,
                      transition: { delay: index * 0.3 },
                    }}
                    className="absolute top-0"
                    onAnimationComplete={() =>
                      setFinishedAnimations(state => state + 1)
                    }
                  >
                    <div style={{ color: 'rgb(5 150 105)', fontWeight: '600' }}>
                      +1
                    </div>
                  </motion.div>
                )}
              </motion.span>
            );
          case Symbol.Times:
            return (
              <motion.span
                key={`${index}-${card}`}
                variants={fadeVariants}
                initial="hidden"
                animate="show"
                className="relative"
              >
                <Image
                  src="/times.svg"
                  alt="times"
                  width={52}
                  height={52}
                  priority
                />
                {checkAnswerCorrect && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.1 }}
                    animate={{
                      opacity: 1,
                      y: -25,
                      x: 13,
                      scale: 1.15,
                      transition: { delay: index * 0.3 },
                    }}
                    className="absolute top-0"
                    onAnimationComplete={() =>
                      setFinishedAnimations(state => state + 1)
                    }
                  >
                    <div style={{ color: 'rgb(5 150 105)', fontWeight: '600' }}>
                      +2
                    </div>
                  </motion.div>
                )}
              </motion.span>
            );
          case Symbol.Divide:
            return (
              <motion.span
                key={`${index}-${card}`}
                variants={fadeVariants}
                initial="hidden"
                animate="show"
                className="relative"
              >
                <Image
                  src="/divide.svg"
                  alt="divide"
                  width={52}
                  height={52}
                  priority
                />
                {checkAnswerCorrect && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.1 }}
                    animate={{
                      opacity: 1,
                      y: -25,
                      x: 13,
                      scale: 1.15,
                      transition: { delay: index * 0.3 },
                    }}
                    className="absolute top-0"
                    onAnimationComplete={() =>
                      setFinishedAnimations(state => state + 1)
                    }
                  >
                    <div style={{ color: 'rgb(5 150 105)', fontWeight: '600' }}>
                      +2
                    </div>
                  </motion.div>
                )}
              </motion.span>
            );
          case Symbol.LeftBracket:
          case Symbol.RightBracket:
            return (
              <motion.span
                key={`${index}-${card}`}
                className="text-4xl"
                variants={fadeVariants}
                initial="hidden"
                animate="show"
              >
                {card.symbol}
              </motion.span>
            );
          default:
            return '';
        }
      } else {
        return (
          <motion.span
            key={`${index}-${card}`}
            className="text-4xl"
            style={{ marginTop: '2px' }}
            variants={fadeVariants}
            initial="hidden"
            animate="show"
          >
            {card.number?.value}
          </motion.span>
        );
      }
    });
  };

  // 排序
  const onSort = () => {
    if (isGameOver) return;

    if (socket) {
      socket.emit(SocketEvent.SortCard, { roomId: roomInfo?.roomId });
    }
  };

  // 抽牌
  const drawCard = () => {
    if (isGameOver) return;

    if (socket) {
      // 沒出過牌抽 1 張，反之抽出過牌的數量
      socket.emit(SocketEvent.DrawCard, {
        roomId: roomInfo?.roomId,
        count: playedCard === 0 ? 1 : playedCard,
      });
      setPlayedCard(0);
    }
  };

  // 棄牌
  const discardCard = (cardId: string) => {
    if (isGameOver) return;

    if (socket) {
      socket.emit(SocketEvent.DiscardCard, {
        roomId: roomInfo?.roomId,
        cardId,
      });
    }
  };

  // 出牌
  const playCard = (selectedCards: SelectedCard[]) => {
    if (isGameOver) return;

    if (selectedCards.length === 0) {
      toast({ title: '請組合算式', className: 'bg-amber-300 text-white' });
      return;
    }

    if (socket) {
      const usedCardCount = selectedCards.filter(c => c.number).length;
      setPlayedCard(state => state + usedCardCount);

      socket.emit(SocketEvent.PlayCard, {
        roomId: roomInfo?.roomId,
        selectedCards,
      });
    }
  };

  // 更新分數並抽牌
  const updateScore = () => {
    if (isGameOver) return;

    if (socket) {
      // 重置狀態
      setCheckAnswerCorrect(null);
      setSelectedCards([]);
      setFinishedAnimations(0);

      socket.emit(SocketEvent.UpdateScore, {
        roomId: roomInfo?.roomId,
        selectedCards,
      });
    }
  };

  return {
    roomInfo,
    onSort,
    playCard,
    drawCard,
    discardCard,
    selectedCards,
    onSelectCardOrSymbol,
    onReselect,
    showCurrentSelect,
    checkAnswerCorrect,
    isAnimationFinished:
      checkAnswerCorrect === true &&
      finishedAnimations === selectedCardSymbols.length,
    selectedCardSymbols,
    selectedCardNumbers,
    updateScore,
    isGameOver,
  };
};

export default useSinglePlay;
