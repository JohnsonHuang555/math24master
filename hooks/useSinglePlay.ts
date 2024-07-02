import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
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

    // 房間更新
    socket.on(
      SocketEvent.RoomUpdate,
      ({
        room,
        extra,
      }: {
        room: Room;
        extra?: { event: SocketEvent; data: any };
      }) => {
        setRoomInfo(room);
        // 重置狀態
        if (extra?.event === SocketEvent.UpdateScore) {
        }
        if (extra?.event === SocketEvent.PlayCardResponse) {
          if (extra.data) {
            toast.success('答案正確');
          } else {
            toast.error('答案不等於 24');
          }
          setCheckAnswerCorrect(extra.data as boolean);
        }
      },
    );

    // socket.on('disconnect', () => {
    //   toast.error('連線已中斷，請重新整理頁面');
    // });

    return () => {
      socket.disconnect();
    };
  }, []);

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
    if (isGameOver || checkAnswerCorrect !== null) return;

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

  // 棄牌
  const onDiscardCard = (cardId: string) => {
    if (isGameOver) return;

    if (socket) {
      socket.emit(SocketEvent.DiscardCard, {
        roomId: roomInfo?.roomId,
        cardId,
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
      setFinishedAnimations(0);

      socket.emit(SocketEvent.UpdateScore, {
        roomId: roomInfo?.roomId,
      });
    }
  };

  const onBack = () => {
    if (isGameOver || checkAnswerCorrect !== null) return;

    if (socket && roomInfo?.selectedCards.length) {
      socket.emit(SocketEvent.BackCard, {
        roomId: roomInfo?.roomId,
      });
    }
  };

  const onFinishedSymbolScoreAnimation = () => {
    setFinishedAnimations(state => state + 1);
  };

  return {
    roomInfo,
    onPlayCard,
    onDrawCard,
    onDiscardCard,
    onSelectCardOrSymbol,
    onReselect,
    checkAnswerCorrect,
    isSymbolScoreAnimationFinished:
      checkAnswerCorrect === true &&
      finishedAnimations === selectedCardSymbols?.length,
    selectedCardSymbols: selectedCardSymbols || [],
    selectedCardNumbers: selectedCardNumbers || [],
    onUpdateScore,
    isGameOver,
    onFinishedSymbolScoreAnimation,
    onBack,
    isLastRound,
  };
};

export default useSinglePlay;
