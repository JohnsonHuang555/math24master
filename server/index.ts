import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';
import { SocketEvent } from '../models/SocketEvent';
import {
  checkCanJoinRoom,
  discardCard,
  drawCard,
  getCurrentRoom,
  getCurrentRooms,
  joinRoom,
  leaveRoom,
  playCard,
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
        const canJoin = checkCanJoinRoom(roomId, playerId, mode, roomName);
        if (canJoin) {
          socket.join(roomId);
          const isSuccess = joinRoom(
            { roomId, maxPlayers, roomName, password },
            playerId,
            playerName,
          );
          if (isSuccess) {
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
      },
    );

    socket.on(SocketEvent.StartGame, ({ roomId }) => {
      const result = startGame(roomId);
      if (result) {
        socket.emit(SocketEvent.StartGameSuccess, result);
      } else {
        socket.emit(SocketEvent.ErrorMessage, '開始遊戲失敗');
      }
    });

    socket.on(SocketEvent.SortCard, ({ roomId }) => {
      const updatedRoom = sortCard(roomId, playerId);
      if (updatedRoom) {
        socket.emit(SocketEvent.RoomUpdate, updatedRoom);
      }
    });

    socket.on(SocketEvent.DrawCard, ({ roomId, count }) => {
      const updatedRoom = drawCard(roomId, playerId, count);
      if (updatedRoom) {
        socket.emit(SocketEvent.RoomUpdate, updatedRoom);
      }
    });

    socket.on(SocketEvent.DiscardCard, ({ roomId, cardId }) => {
      const updatedRoom = discardCard(roomId, playerId, cardId);
      if (updatedRoom) {
        socket.emit(SocketEvent.RoomUpdate, updatedRoom);
      }
    });

    socket.on(SocketEvent.SelectCard, ({ roomId, number, symbol }) => {
      const result = selectCard(roomId, number, symbol);
      if (result?.isError) {
        socket.emit(SocketEvent.ErrorMessage, result.msg);
      } else {
        socket.emit(SocketEvent.RoomUpdate, result?.room);
      }
    });

    socket.on(SocketEvent.ReselectCard, ({ roomId }) => {
      const updatedRoom = reselectCard(roomId);
      if (updatedRoom) {
        socket.emit(SocketEvent.RoomUpdate, updatedRoom);
      }
    });

    socket.on(SocketEvent.PlayCard, ({ roomId }) => {
      const result = playCard(roomId, playerId);
      if (result) {
        socket.emit(SocketEvent.PlayCardResponse, result.isCorrect);
        if (result.room) {
          socket.emit(SocketEvent.RoomUpdate, result.room);
        }
      }
    });

    socket.on(SocketEvent.UpdateScore, ({ roomId }) => {
      const updatedRoom = updateScore(roomId, playerId);
      if (updatedRoom) {
        socket.emit(SocketEvent.RoomUpdate, updatedRoom);
      }
    });

    socket.on(SocketEvent.SearchRooms, (roomName: string) => {
      const allRooms = getCurrentRooms(roomName);
      console.log(allRooms);
      socket.emit(SocketEvent.GetRoomsResponse, allRooms);
    });

    socket.on(SocketEvent.GetRoomById, (roomId: string) => {
      const room = getCurrentRoom(roomId);
      socket.emit(SocketEvent.GetRoomByIdResponse, room);
    });

    socket.on('disconnect', () => {
      console.log('leave');
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
