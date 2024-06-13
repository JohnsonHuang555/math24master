import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { fadeVariants } from '@/lib/animation-variants';
import { GameMode } from '@/models/GameMode';
import { NumberCard } from '@/models/Player';
import { Room } from '@/models/Room';
import { SocketEvent } from '@/models/SocketEvent';
import { Symbol } from '@/models/Symbol';

const socket = io();

const useSinglePlay = () => {
  // 答案是否正確
  const [checkAnswerCorrect, setCheckAnswerCorrect] = useState<boolean | null>(
    null,
  );
  // 出過牌的數量
  const [playedCard, setPlayedCard] = useState(0);
  // 動畫完成時
  const [finishedAnimations, setFinishedAnimations] = useState<number>(0);

  const [roomInfo, setRoomInfo] = useState<Room>();

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
    return roomInfo?.selectedCards.filter(
      c =>
        c.symbol &&
        [Symbol.Plus, Symbol.Minus, Symbol.Times, Symbol.Divide].includes(
          c.symbol,
        ),
    );
  }, [roomInfo?.selectedCards]);

  // 已選的數字牌
  const selectedCardNumbers = useMemo(() => {
    return roomInfo?.selectedCards.filter(c => c.number);
  }, [roomInfo?.selectedCards]);

  useEffect(() => {
    const roomId = uuidv4();

    socket.emit(SocketEvent.JoinRoom, {
      roomId,
      maxPlayers: 1,
      playerName: 'single',
      mode: GameMode.Single,
    });

    socket.on(SocketEvent.JoinRoomSuccess, () => {
      // 遊戲開始
      socket.emit(SocketEvent.StartGame, { roomId });
    });

    socket.on(SocketEvent.ErrorMessage, message => {
      toast.error(message);
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
      if (checkAnswerCorrect) {
        toast.success('答對了');
      } else {
        toast.error('不對唷');
      }
    }
  }, [checkAnswerCorrect]);

  useEffect(() => {
    if (isLastRound) {
      toast.warning('最後一回合囉');
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

  const showCurrentSelect = () => {
    return roomInfo?.selectedCards.map((card, index) => {
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
                    initial={{ opacity: 0, top: 1, scale: 0.1 }}
                    animate={{
                      opacity: 1,
                      y: -25,
                      x: 13,
                      scale: 1.15,
                      transition: { delay: index * 0.3 },
                    }}
                    className="absolute"
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
                    initial={{ opacity: 0, top: 0, scale: 0.1 }}
                    animate={{
                      opacity: 1,
                      y: -25,
                      x: 13,
                      scale: 1.15,
                      transition: { delay: index * 0.3 },
                    }}
                    className="absolute"
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
                    initial={{ opacity: 0, top: 0, scale: 0.1 }}
                    animate={{
                      opacity: 1,
                      y: -25,
                      x: 13,
                      scale: 1.15,
                      transition: { delay: index * 0.3 },
                    }}
                    className="absolute"
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
                    initial={{ opacity: 0, top: 0, scale: 0.1 }}
                    animate={{
                      opacity: 1,
                      y: -25,
                      x: 13,
                      scale: 1.15,
                      transition: { delay: index * 0.3 },
                    }}
                    className="absolute"
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
  const playCard = () => {
    if (isGameOver) return;

    if (roomInfo?.selectedCards.length === 0) {
      toast.warning('請組合算式');
      return;
    }

    if (socket) {
      const usedCardCount =
        roomInfo?.selectedCards.filter(c => c.number).length || 0;
      setPlayedCard(state => state + usedCardCount);

      socket.emit(SocketEvent.PlayCard, {
        roomId: roomInfo?.roomId,
      });
    }
  };

  // 更新分數並抽牌
  const updateScore = () => {
    if (isGameOver) return;

    if (socket) {
      // 重置狀態
      setCheckAnswerCorrect(null);
      setFinishedAnimations(0);

      socket.emit(SocketEvent.UpdateScore, {
        roomId: roomInfo?.roomId,
      });
    }
  };

  return {
    roomInfo,
    onSort,
    playCard,
    drawCard,
    discardCard,
    onSelectCardOrSymbol,
    onReselect,
    showCurrentSelect,
    checkAnswerCorrect,
    isAnimationFinished:
      checkAnswerCorrect === true &&
      finishedAnimations === selectedCardSymbols?.length,
    selectedCardSymbols: selectedCardSymbols || [],
    selectedCardNumbers: selectedCardNumbers || [],
    updateScore,
    isGameOver,
  };
};

export default useSinglePlay;
