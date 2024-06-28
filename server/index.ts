import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';
import { Message } from '../models/Message';
import { SocketEvent } from '../models/SocketEvent';
import {
  backCard,
  checkCanJoinRoom,
  discardCard,
  drawCard,
  editRoom,
  editRoomSettings,
  getCurrentRoom,
  getCurrentRooms,
  getPlayerName,
  joinRoom,
  leaveRoom,
  playCard,
  readyGame,
  removePlayer,
  reselectCard,
  selectCard,
  sortCard,
  startGame,
  updateScore,
} from './game';

const port = parseInt(process.env.PORT || '3000', 10);
const hostname = 'localhost';
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

const timerMap: {
  [key: string]: { timer: NodeJS.Timeout | null; countdownTime: number };
} = {};

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer, {
    pingInterval: 24 * 60 * 60 * 1000,
    pingTimeout: 3 * 24 * 60 * 60 * 1000,
  });

  io.on('connection', socket => {
    const playerId = socket.id;
    socket.on(
      SocketEvent.JoinRoom,
      ({ roomId, maxPlayers, playerName, roomName, password, mode }) => {
        const canJoin = checkCanJoinRoom(roomId, playerId, mode);
        if (canJoin) {
          socket.join(roomId);
          const { room, msg, needPassword } = joinRoom(
            { roomId, maxPlayers, roomName, password },
            playerId,
            playerName,
            mode,
          );

          if (room) {
            io.sockets.to(roomId).emit(SocketEvent.JoinRoomSuccess, room);
            socket.emit(SocketEvent.GetPlayerId, playerId);
          } else if (needPassword) {
            socket.emit(SocketEvent.NeedRoomPassword);
          } else {
            socket.emit(SocketEvent.ErrorMessage, msg);
          }
        } else {
          socket.emit(SocketEvent.ErrorMessage, '房間人數已滿或不存在');
        }
      },
    );

    socket.on(SocketEvent.StartGame, ({ roomId }) => {
      const { room, msg } = startGame(roomId);
      if (room) {
        io.sockets.to(roomId).emit(SocketEvent.StartGameSuccess, room);
        if (room.settings.remainSeconds !== null) {
          timerMap[roomId] = {
            countdownTime: room.settings.remainSeconds,
            timer: null,
          };
          const needDrawPlayerId = room.players.find(
            p => p.playerOrder === room.currentOrder,
          )?.id;
          io.sockets.to(roomId).emit(SocketEvent.CountdownTimeResponse, {
            countdown: timerMap[roomId].countdownTime,
            needDrawPlayerId,
          });
          timerMap[roomId].timer = setInterval(() => {
            timerMap[roomId].countdownTime -= 1;
            if (timerMap[roomId].countdownTime >= 0) {
              io.sockets.to(roomId).emit(SocketEvent.CountdownTimeResponse, {
                countdown: timerMap[roomId].countdownTime,
                needDrawPlayerId,
              });
            }
          }, 1000);
        } else {
          // 計時器清空
          io.sockets
            .to(roomId)
            .emit(SocketEvent.CountdownTimeResponse, undefined);
        }
      } else {
        socket.emit(SocketEvent.ErrorMessage, msg);
      }
    });

    socket.on(SocketEvent.ReadyGame, ({ roomId }) => {
      const { room, msg } = readyGame(roomId, playerId);
      if (room) {
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, room);
      } else {
        socket.emit(SocketEvent.ErrorMessage, msg);
      }
    });

    socket.on(SocketEvent.SortCard, ({ roomId }) => {
      const { room, msg } = sortCard(roomId, playerId);
      if (room) {
        socket.emit(SocketEvent.RoomUpdate, room);
      } else {
        socket.emit(SocketEvent.ErrorMessage, msg);
      }
    });

    socket.on(SocketEvent.DrawCard, ({ roomId, count }) => {
      const { room, msg, winner } = drawCard(roomId, playerId, count);
      if (room) {
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, room);
        // 有計時器需要停止並建立新的
        if (timerMap[roomId] && timerMap[roomId].timer !== null) {
          const needDrawPlayerId = room.players.find(
            p => p.playerOrder === room.currentOrder,
          )?.id;
          // 重置時間
          timerMap[roomId].countdownTime = room.settings
            .remainSeconds as number;
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
        }
        if (winner) {
          io.sockets.to(roomId).emit(SocketEvent.GameOver, {
            name: winner.name,
            score: winner.score,
          });
        }
      } else {
        socket.emit(SocketEvent.ErrorMessage, msg);
      }
    });

    socket.on(SocketEvent.DiscardCard, ({ roomId, cardId }) => {
      const { room, msg } = discardCard(roomId, playerId, cardId);
      if (room) {
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, room);
      } else {
        socket.emit(SocketEvent.ErrorMessage, msg);
      }
    });

    socket.on(SocketEvent.SelectCard, ({ roomId, number, symbol }) => {
      const { room, msg } = selectCard(roomId, number, symbol);
      if (room) {
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, room);
      } else {
        socket.emit(SocketEvent.ErrorMessage, msg);
      }
    });

    socket.on(SocketEvent.ReselectCard, ({ roomId }) => {
      const { room, msg } = reselectCard(roomId);
      if (room) {
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, room);
      } else {
        socket.emit(SocketEvent.ErrorMessage, msg);
      }
    });

    socket.on(SocketEvent.PlayCard, ({ roomId }) => {
      const { room, msg } = playCard(roomId, playerId);
      if (msg) {
        socket.emit(SocketEvent.ErrorMessage, msg);
        return;
      }
      if (room) {
        // 答對
        io.sockets.to(roomId).emit(SocketEvent.PlayCardResponse, true);
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, room);
      } else {
        // 答錯
        socket.emit(SocketEvent.PlayCardResponse, false);
      }
    });

    socket.on(SocketEvent.ResetState, ({ roomId }) => {
      io.sockets.to(roomId).emit(SocketEvent.ResetStateResponse);
    });

    socket.on(SocketEvent.BackCard, ({ roomId }) => {
      const { room, msg } = backCard(roomId);
      if (room) {
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, room);
      } else {
        socket.emit(SocketEvent.ErrorMessage, msg);
      }
    });

    socket.on(SocketEvent.UpdateScore, ({ roomId }) => {
      const { room, msg } = updateScore(roomId, playerId);
      if (room) {
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, room);
      } else {
        socket.emit(SocketEvent.ErrorMessage, msg);
      }
    });

    socket.on(
      SocketEvent.SearchRooms,
      (payload?: { roomName: string; showEmpty: boolean }) => {
        const allRooms = getCurrentRooms(payload);
        socket.emit(SocketEvent.GetRoomsResponse, allRooms);
      },
    );

    socket.on(SocketEvent.GetRoomById, (roomId: string) => {
      const room = getCurrentRoom(roomId);
      socket.emit(SocketEvent.GetRoomByIdResponse, room);
    });

    socket.on(SocketEvent.SendMessage, ({ roomId, message }) => {
      const playerName = getPlayerName(roomId, playerId);
      if (playerName) {
        io.sockets.to(roomId).emit(SocketEvent.GetMessage, {
          name: playerName,
          message,
        } as Message);
      }
    });

    // 多人模式才有
    socket.on(SocketEvent.EditRoomName, ({ roomId, roomName, password }) => {
      const { room, msg } = editRoom(roomId, roomName, password);
      if (room) {
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, room);
      } else {
        socket.emit(SocketEvent.ErrorMessage, msg);
      }
    });

    socket.on(
      SocketEvent.EditRoomSettings,
      ({ roomId, maxPlayers, deckType, remainSeconds }) => {
        const { room, msg } = editRoomSettings(
          roomId,
          maxPlayers,
          deckType,
          remainSeconds,
        );
        if (room) {
          io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, room);
        } else {
          socket.emit(SocketEvent.ErrorMessage, msg);
        }
      },
    );

    socket.on(SocketEvent.RemovePlayer, ({ roomId, playerId }) => {
      const { room, msg } = removePlayer(roomId, playerId);
      if (room) {
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, room);
        io.sockets.to(roomId).emit(SocketEvent.RemovePlayerResponse, playerId);
      } else {
        socket.emit(SocketEvent.ErrorMessage, msg);
      }
    });

    socket.on('disconnect', () => {
      const result = leaveRoom(playerId);
      if (result?.room) {
        const roomId = result.room?.roomId as string;
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, result.room);
        io.sockets
          .to(roomId)
          .emit(SocketEvent.PlayerLeaveRoom, result.playerName);

        // 清除計時器
        if (timerMap[roomId] && timerMap[roomId]?.timer !== null) {
          clearInterval(timerMap[roomId].timer as NodeJS.Timeout);
          delete timerMap[roomId];
        }
      }
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
