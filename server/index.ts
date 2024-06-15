import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';
import { Message } from '../models/Message';
import { SocketEvent } from '../models/SocketEvent';
import {
  checkCanJoinRoom,
  discardCard,
  drawCard,
  editMaxPlayers,
  editRoomName,
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

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer);

  io.on('connection', socket => {
    const playerId = socket.id;
    socket.on(
      SocketEvent.JoinRoom,
      ({ roomId, maxPlayers, playerName, roomName, password, mode }) => {
        const canJoin = checkCanJoinRoom(roomId, playerId, mode);
        if (canJoin) {
          socket.join(roomId);
          const { room, msg } = joinRoom(
            { roomId, maxPlayers, roomName, password },
            playerId,
            playerName,
            mode,
          );

          if (room) {
            io.sockets.to(roomId).emit(SocketEvent.JoinRoomSuccess, room);
            socket.emit(SocketEvent.GetPlayerId, playerId);
          } else {
            socket.emit(SocketEvent.ErrorMessage, msg);
          }
        } else {
          socket.emit(SocketEvent.ErrorMessage, '房間不存在');
        }
      },
    );

    socket.on(SocketEvent.StartGame, ({ roomId }) => {
      const { room, msg } = startGame(roomId);
      if (room) {
        io.sockets.to(roomId).emit(SocketEvent.StartGameSuccess, room);
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
      const { room, msg } = drawCard(roomId, playerId, count);
      if (room) {
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, room);
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
      const { room } = playCard(roomId, playerId);
      if (room) {
        // 答對
        socket.emit(SocketEvent.PlayCardResponse, true);
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, room);
      } else {
        // 答錯
        socket.emit(SocketEvent.PlayCardResponse, false);
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

    socket.on(SocketEvent.SearchRooms, (roomName: string) => {
      const allRooms = getCurrentRooms(roomName);
      socket.emit(SocketEvent.GetRoomsResponse, allRooms);
    });

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
    socket.on(SocketEvent.EditRoomName, ({ roomId, roomName }) => {
      const { room, msg } = editRoomName(roomId, roomName);
      if (room) {
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, room);
      } else {
        socket.emit(SocketEvent.ErrorMessage, msg);
      }
    });

    socket.on(SocketEvent.EditMaxPlayers, ({ roomId, maxPlayers }) => {
      const { room, msg } = editMaxPlayers(roomId, maxPlayers);
      if (room) {
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, room);
      } else {
        socket.emit(SocketEvent.ErrorMessage, msg);
      }
    });

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
      console.log('leave');
      const result = leaveRoom(playerId);
      console.log(getCurrentRooms(''));
      if (result?.room) {
        const roomId = result.room?.roomId as string;
        io.sockets.to(roomId).emit(SocketEvent.RoomUpdate, result.room);
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
