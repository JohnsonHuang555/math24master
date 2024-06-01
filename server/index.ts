import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';
import { SocketEvent } from '../models/SocketEvent';
import {
  checkCanJoinRoom,
  getCurrentRooms,
  joinRoom,
  leaveRoom,
  sortCard,
  startGame,
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
    socket.on(SocketEvent.JoinRoom, ({ roomId, maxPlayers, playerName }) => {
      const canJoin = checkCanJoinRoom(roomId, playerId);
      if (canJoin) {
        socket.join(roomId);
        const result = joinRoom({ roomId, maxPlayers }, playerId, playerName);
        if (result) {
          socket.emit(SocketEvent.JoinRoomSuccess);
        } else {
          socket.emit(SocketEvent.ErrorMessage, '加入失敗');
        }
        // io.sockets
        //   .to(roomId)
        //   .emit(SocketEvent.JoinRoomMessage, `You've join ${roomId} room`);
      } else {
        socket.emit(SocketEvent.ErrorMessage, '房間不存在');
      }
    });

    socket.on(SocketEvent.StartGame, ({ roomId }) => {
      const result = startGame(roomId);
      if (result) {
        socket.emit(SocketEvent.StartGameSuccess, result);
      } else {
        socket.emit(SocketEvent.ErrorMessage, '開始遊戲失敗');
      }

      console.log(JSON.stringify(getCurrentRooms()));
    });

    socket.on(SocketEvent.PlayCard, ({ roomId }) => {});

    socket.on(SocketEvent.SortCard, ({ roomId }) => {
      const updatedRoom = sortCard(roomId, playerId);
      socket.emit(SocketEvent.RoomUpdate, updatedRoom);
    });

    socket.on('disconnect', () => {
      leaveRoom(playerId);
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
