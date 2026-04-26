import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';
import { Room } from '@/models/Room';
import { Message } from '../models/Message';
import { SocketEvent } from '../models/SocketEvent';
import {
  addBotToRoom,
  backCard,
  checkCanJoinRoom,
  discardCard,
  drawCard,
  editRoom,
  editRoomSettings,
  getCurrentBotPlayer,
  getCurrentRooms,
  getPlayerName,
  joinRoom,
  leaveRoom,
  markPlayerDisconnected,
  playCard,
  readyGame,
  reconnectPlayer,
  removePlayer,
  reselectCard,
  rummyBotPlay,
  rummyDeclareJoker,
  rummyDrawCard,
  rummyStartGame,
  rummySubmitTurn,
  rummySwapJoker,
  selectCard,
  skipHand,
  startGame,
  updateScore,
} from './game';

const port = parseInt(process.env.PORT || '3000', 10);
const hostname = process.env.HOSTNAME || 'localhost';
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

const timerMap: {
  [key: string]: { timer: NodeJS.Timeout | null; countdownTime: number };
} = {};

// 斷線寬限期計時器 Map：key = reconnectToken, value = setTimeout handle
const disconnectGraceTimerMap: Map<string, NodeJS.Timeout> = new Map();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer, {
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  /** 若目前輪到的玩家是 Bot，延遲 1.5 秒後自動行動 */
  const _triggerBotIfNeeded = (roomId: string) => {
    const botPlayer = getCurrentBotPlayer(roomId);
    if (!botPlayer) return;

    setTimeout(() => {
      const result = rummyBotPlay(roomId, botPlayer.id);
      if (!result.success) return;

      const { room, winner, penaltyWinner } = result;
      io.to(roomId).emit(SocketEvent.RoomUpdate, { room });
      if (timerMap[roomId] && room.settings.remainSeconds !== null) {
        _clearAndCreateTimer(roomId, room);
      }

      if (winner || penaltyWinner) {
        const w = winner ?? penaltyWinner!;
        const rankedPlayers = [...room.players].sort((a, b) => b.score - a.score);
        io.to(roomId).emit(SocketEvent.GameOver, {
          name: w.name,
          score: w.score,
          players: rankedPlayers,
          isPenaltyGameOver: !!penaltyWinner,
        });
      } else {
        _triggerBotIfNeeded(roomId);
      }
    }, 1500);
  };

  const _resetRoundTimer = (roomId: string, room: Room) => {
    if (timerMap[roomId] && timerMap[roomId].timer !== null) {
      _clearAndCreateTimer(roomId, room);
    }
  };

  const _clearAndCreateTimer = (roomId: string, room: Room) => {
    const needDrawPlayerId = room.players.find(
      p => p.playerOrder === room.currentOrder,
    )?.id;
    // 重置時間
    timerMap[roomId].countdownTime = room.settings.remainSeconds as number;
    // 清除計時器
    clearInterval(timerMap[roomId].timer as NodeJS.Timeout);
    io.sockets.to(roomId).emit(SocketEvent.CountdownTimeResponse, {
      countdown: timerMap[roomId].countdownTime,
      needDrawPlayerId,
    });

    // 寫入新的計時器
    timerMap[roomId].timer = setInterval(() => {
      timerMap[roomId].countdownTime -= 1;
      if (timerMap[roomId].countdownTime >= 0) {
        io.sockets.to(roomId).emit(SocketEvent.CountdownTimeResponse, {
          countdown: timerMap[roomId].countdownTime,
          needDrawPlayerId,
        });
      }
    }, 1000);
  };

  io.on('connection', socket => {
    const playerId = socket.id;

    socket.on(
      SocketEvent.JoinRoom,
      ({ roomId, maxPlayers, playerName, roomName, password, mode, difficulty, gameType, remainSeconds }) => {
        const canJoin = checkCanJoinRoom(roomId, playerId, mode);
        if (canJoin) {
          socket.join(roomId);
          const result = joinRoom(
            { roomId, maxPlayers, roomName, password, difficulty, gameType, remainSeconds },
            playerId,
            playerName,
            mode,
          );

          if (result.success) {
            io.sockets.to(roomId).emit(SocketEvent.JoinRoomSuccess, result.room);
            socket.emit(SocketEvent.GetPlayerId, playerId);
            socket.emit(SocketEvent.GetReconnectToken, result.reconnectToken);
          } else if (result.needPassword) {
            socket.emit(SocketEvent.NeedRoomPassword);
          } else {
            socket.emit(SocketEvent.ErrorMessage, result.error);
          }
        } else {
          socket.emit(SocketEvent.ErrorMessage, '房間人數已滿或不存在');
        }
      },
    );

    socket.on(SocketEvent.StartGame, ({ roomId }) => {
      // 先用 classic startGame 處理共用邏輯（讀取 gameType）
      // 若是拉密模式，改用 rummyStartGame 覆蓋牌庫與手牌
      let result = startGame(roomId);
      if (!result.success) {
        socket.emit(SocketEvent.ErrorMessage, result.error);
        return;
      }

      // 拉密模式：重新初始化
      if (result.room.settings.gameType === 'rummy') {
        const rummyResult = rummyStartGame(roomId);
        if (!rummyResult.success) {
          socket.emit(SocketEvent.ErrorMessage, rummyResult.error);
          return;
        }
        result = rummyResult;
      }

      const { room } = result;
      io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, { room });
      if (room.settings.remainSeconds !== null) {
        timerMap[roomId] = {
          countdownTime: room.settings.remainSeconds,
          timer: null,
        };
        _clearAndCreateTimer(roomId, room);
      } else {
        io.sockets
          .to(roomId)
          .emit(SocketEvent.CountdownTimeResponse, undefined);
      }

      // 遊戲開始後，若第一位玩家是 Bot，觸發其行動
      if (room.settings.gameType === 'rummy') {
        _triggerBotIfNeeded(roomId);
      }
    });

    socket.on(SocketEvent.DrawCard, ({ roomId }) => {
      const result = drawCard(roomId, playerId, 1);
      if (result.success) {
        const { room, winner } = result;
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, { room });
        _resetRoundTimer(roomId, room);
        if (winner) {
          const rankedPlayers = [...room.players].sort(
            (a, b) => b.score - a.score,
          );
          io.sockets.to(roomId).emit(SocketEvent.GameOver, {
            name: winner.name,
            score: winner.score,
            players: rankedPlayers,
          });
        }
      } else if (result.error !== 'NOT_YOUR_TURN') {
        socket.emit(SocketEvent.ErrorMessage, result.error);
      }
    });

    socket.on(SocketEvent.DiscardCard, ({ roomId, cardId }) => {
      const result = discardCard(roomId, playerId, cardId);
      if (result.success) {
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, { room: result.room });
      } else {
        socket.emit(SocketEvent.ErrorMessage, result.error);
      }
    });

    socket.on(SocketEvent.SelectCard, ({ roomId, number, symbol }) => {
      const result = selectCard(roomId, number, symbol);
      if (result.success) {
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, { room: result.room });
      } else {
        socket.emit(SocketEvent.ErrorMessage, result.error);
      }
    });

    socket.on(SocketEvent.ReselectCard, ({ roomId }) => {
      const result = reselectCard(roomId);
      if (result.success) {
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, { room: result.room });
      } else {
        socket.emit(SocketEvent.ErrorMessage, result.error);
      }
    });

    socket.on(SocketEvent.PlayCard, ({ roomId }) => {
      const result = playCard(roomId, playerId);
      if (!result.success) {
        socket.emit(SocketEvent.ErrorMessage, result.error);
        return;
      }
      io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, {
        room: result.room,
        extra: {
          event: SocketEvent.PlayCardResponse,
          data: result.isCorrect,
        },
      });
    });

    socket.on(SocketEvent.SkipHand, ({ roomId }) => {
      const result = skipHand(roomId, playerId);
      if (result.success) {
        const { room, winner } = result;
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, { room });
        _resetRoundTimer(roomId, room);
        if (winner) {
          const rankedPlayers = [...room.players].sort(
            (a, b) => b.score - a.score,
          );
          io.sockets.to(roomId).emit(SocketEvent.GameOver, {
            name: winner.name,
            score: winner.score,
            players: rankedPlayers,
          });
        }
      } else if (result.error !== 'NOT_YOUR_TURN') {
        socket.emit(SocketEvent.ErrorMessage, result.error);
      }
    });

    socket.on(SocketEvent.BackCard, ({ roomId }) => {
      const result = backCard(roomId);
      if (result.success) {
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, { room: result.room });
      } else {
        socket.emit(SocketEvent.ErrorMessage, result.error);
      }
    });

    socket.on(SocketEvent.UpdateScore, ({ roomId }) => {
      const result = updateScore(roomId, playerId);
      if (result.success) {
        const { room, winner } = result;
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, {
          room,
          extra: { event: SocketEvent.UpdateScore },
        });
        _resetRoundTimer(roomId, room);
        if (winner) {
          const rankedPlayers = [...room.players].sort(
            (a, b) => b.score - a.score,
          );
          io.sockets.to(roomId).emit(SocketEvent.GameOver, {
            name: winner.name,
            score: winner.score,
            players: rankedPlayers,
          });
        }
      } else if (result.error !== 'NOT_YOUR_TURN') {
        socket.emit(SocketEvent.ErrorMessage, result.error);
      }
    });

    // 多人模式才有
    socket.on(SocketEvent.ReadyGame, ({ roomId }) => {
      const result = readyGame(roomId, playerId);
      if (result.success) {
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, { room: result.room });
      } else {
        socket.emit(SocketEvent.ErrorMessage, result.error);
      }
    });

    socket.on(
      SocketEvent.SearchRooms,
      (payload?: { roomName: string; showEmpty: boolean }) => {
        const allRooms = getCurrentRooms(payload);
        socket.emit(SocketEvent.GetRoomsResponse, allRooms);
      },
    );

    socket.on(SocketEvent.SendMessage, ({ roomId, message }) => {
      const playerName = getPlayerName(roomId, playerId);
      if (playerName) {
        io.sockets.to(roomId).emit(SocketEvent.GetMessage, {
          name: playerName,
          message,
        } as Message);
      }
    });

    socket.on(SocketEvent.EditRoomName, ({ roomId, roomName, password }) => {
      const result = editRoom(roomId, roomName, password);
      if (result.success) {
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, { room: result.room });
      } else {
        socket.emit(SocketEvent.ErrorMessage, result.error);
      }
    });

    socket.on(
      SocketEvent.EditRoomSettings,
      ({ roomId, maxPlayers, deckType, remainSeconds, difficulty, gameType }) => {
        const result = editRoomSettings(roomId, maxPlayers, deckType, remainSeconds, difficulty, gameType);
        if (result.success) {
          io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, { room: result.room });
        } else {
          socket.emit(SocketEvent.ErrorMessage, result.error);
        }
      },
    );

    socket.on(SocketEvent.RemovePlayer, ({ roomId, playerId }) => {
      const result = removePlayer(roomId, playerId);
      if (result.success) {
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, { room: result.room });
        io.sockets.to(roomId).emit(SocketEvent.RemovePlayerResponse, playerId);
      } else {
        socket.emit(SocketEvent.ErrorMessage, result.error);
      }
    });

    // ============================================================
    // 拉密模式 Socket Events
    // ============================================================

    socket.on(SocketEvent.RummyDrawCard, ({ roomId }) => {
      const result = rummyDrawCard(roomId, playerId);
      if (result.success) {
        const { room } = result;
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, { room });
        _resetRoundTimer(roomId, room);
        if (result.penaltyWinner) {
          const rankedPlayers = [...room.players].sort(
            (a, b) => b.score - a.score,
          );
          io.sockets.to(roomId).emit(SocketEvent.GameOver, {
            name: result.penaltyWinner.name,
            score: result.penaltyWinner.score,
            players: rankedPlayers,
            isPenaltyGameOver: true,
          });
        } else {
          _triggerBotIfNeeded(roomId);
        }
      } else if (result.error !== 'NOT_YOUR_TURN') {
        socket.emit(SocketEvent.ErrorMessage, result.error);
      }
    });

    socket.on(
      SocketEvent.RummySubmitTurn,
      ({ roomId, submittedBoard, playedCardIds }) => {
        const result = rummySubmitTurn(
          roomId,
          playerId,
          submittedBoard,
          playedCardIds,
        );
        if (result.success) {
          const { room, winner, penaltyWinner } = result;
          io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, { room });
          _resetRoundTimer(roomId, room);
          if (winner) {
            const rankedPlayers = [...room.players].sort(
              (a, b) => b.score - a.score,
            );
            io.sockets.to(roomId).emit(SocketEvent.GameOver, {
              name: winner.name,
              score: winner.score,
              players: rankedPlayers,
            });
          } else if (penaltyWinner) {
            const rankedPlayers = [...room.players].sort(
              (a, b) => b.score - a.score,
            );
            io.sockets.to(roomId).emit(SocketEvent.GameOver, {
              name: penaltyWinner.name,
              score: penaltyWinner.score,
              players: rankedPlayers,
              isPenaltyGameOver: true,
            });
          } else {
            _triggerBotIfNeeded(roomId);
          }
        } else if (result.error !== 'NOT_YOUR_TURN') {
          socket.emit(SocketEvent.ErrorMessage, result.error);
        }
      },
    );

    socket.on(
      SocketEvent.RummyDeclareJoker,
      ({ roomId, jokerCardId, declaredValue, declaredColor }) => {
        const result = rummyDeclareJoker(
          roomId,
          jokerCardId,
          declaredValue,
          declaredColor,
        );
        if (result.success) {
          io.sockets
            .to(roomId)
            .emit(SocketEvent.RoomUpdate, { room: result.room });
        } else {
          socket.emit(SocketEvent.ErrorMessage, result.error);
        }
      },
    );

    socket.on(
      SocketEvent.RummySwapJoker,
      ({ roomId, handCardId, jokerCardId }) => {
        const result = rummySwapJoker(roomId, playerId, handCardId, jokerCardId);
        if (result.success) {
          io.sockets
            .to(roomId)
            .emit(SocketEvent.RoomUpdate, { room: result.room });
        } else {
          socket.emit(SocketEvent.ErrorMessage, result.error);
        }
      },
    );

    socket.on(SocketEvent.AddBotToRoom, ({ roomId, difficulty }) => {
      const result = addBotToRoom(roomId, difficulty);
      if (result.success) {
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, { room: result.room });
      } else {
        socket.emit(SocketEvent.ErrorMessage, result.error);
      }
    });

    socket.on('disconnect', (reason) => {
      // 用戶主動斷線（切換頁面、關閉分頁）→ 立即移除
      // 非主動斷線（Mac 待機、網路中斷）→ 30 秒寬限期
      const isIntentional =
        reason === 'client namespace disconnect' || reason === 'server namespace disconnect';

      if (isIntentional) {
        const leaveResult = leaveRoom(playerId);
        if (leaveResult) {
          const roomId = leaveResult.room.roomId;
          const { room, playerName, wasPlaying, remainingCount } = leaveResult;

          io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, { room });

          if (wasPlaying && remainingCount <= 1) {
            io.sockets.to(roomId).emit(SocketEvent.GameAborted, playerName);
            if (timerMap[roomId]?.timer !== null) {
              clearInterval(timerMap[roomId].timer as NodeJS.Timeout);
              delete timerMap[roomId];
            }
          } else {
            io.sockets.to(roomId).emit(SocketEvent.PlayerLeaveRoom, playerName);

            if (wasPlaying && remainingCount >= 2) {
              if (timerMap[roomId] && room.settings.remainSeconds !== null) {
                _clearAndCreateTimer(roomId, room);
              }
            } else {
              if (timerMap[roomId]?.timer !== null) {
                clearInterval(timerMap[roomId].timer as NodeJS.Timeout);
                delete timerMap[roomId];
              }
            }
          }
        }
      } else {
        // 非主動斷線：標記為暫時斷線，給予 30 秒寬限期
        const markResult = markPlayerDisconnected(playerId);
        if (!markResult) return;

        const { roomId, room, reconnectToken } = markResult;
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, { room });

        const graceTimer = setTimeout(() => {
          disconnectGraceTimerMap.delete(reconnectToken);

          const leaveResult = leaveRoom(playerId);
          if (leaveResult) {
            const { room: updatedRoom, playerName, wasPlaying, remainingCount } = leaveResult;

            io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, { room: updatedRoom });

            if (wasPlaying && remainingCount <= 1) {
              io.sockets.to(roomId).emit(SocketEvent.GameAborted, playerName);
              if (timerMap[roomId]?.timer !== null) {
                clearInterval(timerMap[roomId].timer as NodeJS.Timeout);
                delete timerMap[roomId];
              }
            } else {
              io.sockets.to(roomId).emit(SocketEvent.PlayerLeaveRoom, playerName);

              if (wasPlaying && remainingCount >= 2) {
                if (timerMap[roomId] && updatedRoom.settings.remainSeconds !== null) {
                  _clearAndCreateTimer(roomId, updatedRoom);
                }
              } else {
                if (timerMap[roomId]?.timer !== null) {
                  clearInterval(timerMap[roomId].timer as NodeJS.Timeout);
                  delete timerMap[roomId];
                }
              }
            }
          }
        }, 30_000);

        disconnectGraceTimerMap.set(reconnectToken, graceTimer);
      }
    });

    socket.on(SocketEvent.PlayerReconnect, ({ reconnectToken }: { reconnectToken: string }) => {
      // 取消寬限期計時器
      const graceTimer = disconnectGraceTimerMap.get(reconnectToken);
      if (graceTimer) {
        clearTimeout(graceTimer);
        disconnectGraceTimerMap.delete(reconnectToken);
      }

      const result = reconnectPlayer(playerId, reconnectToken);
      if (!result.success) {
        socket.emit(SocketEvent.PlayerReconnectFailed, { error: result.error });
        return;
      }

      socket.join(result.room.roomId);
      socket.emit(SocketEvent.PlayerReconnectSuccess, { room: result.room });
      io.sockets.to(result.room.roomId).emit(SocketEvent.RoomUpdate, { room: result.room });
    });
  });

  httpServer
    .once('error', err => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
