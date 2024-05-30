import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';
import { SocketEvent } from '../models/SocketEvent';
import { checkCanJoinRoom, getCurrentRooms, joinRoom, leaveRoom } from './game';

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
    console.log('user connected', playerId);
    socket.on(SocketEvent.JoinRoom, ({ roomId, maxPlayers }) => {
      const canJoin = checkCanJoinRoom(roomId, playerId);
      if (canJoin) {
        socket.join(roomId);
        joinRoom({ roomId, maxPlayers }, playerId);
        io.sockets
          .to(roomId)
          .emit(SocketEvent.JoinRoomMessage, `You've join ${roomId} room`);

        console.log(JSON.stringify(getCurrentRooms()), 'join');
      } else {
        socket.emit(SocketEvent.ErrorMessage, '房間不存在');
      }
    });

    socket.on(SocketEvent.StartGame, () => {});

    socket.on('disconnect', () => {
      leaveRoom(playerId);
      console.log(JSON.stringify(getCurrentRooms()), 'leave');
      console.log('user disconnected', playerId);
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
