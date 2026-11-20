import { Server, Socket } from 'socket.io';
import { Room } from '../models/Room';
import {
  BuzzerGameOverPayload,
  GameOverPayload,
  LobbyRoomSummary,
  RoomView,
} from '../models/RoomView';
import { SocketEvent } from '../models/SocketEvent';
import {
  serializeLobbyRoom,
  serializeRanking,
  serializeRoomForPlayer,
} from './room-view';

/**
 * 所有帶房間資料的事件都從這裡送出（server/room-isolation.test.ts 會檢查沒有別的地方直接送）。
 *
 * 不用 io.to(roomId).emit 對整間房廣播同一份資料，而是對房間頻道裡的每個連線各送一份
 * 自己的 view：公開部分相同，私人部分（手牌、自己正在組的算式、房主的密碼）只有本人拿得到。
 * 事件數和原本的廣播一樣（廣播本來就是每個連線送一次），只是內容不同。
 *
 * 連線代表哪位玩家記在 socket.data.playerId，由 socket-server 綁定連線時設定、
 * 連線被取代或解除綁定時清掉；前端送來的 playerId 一律不採用。
 */

export type SocketData = { playerId?: string };

export function playerIdOfSocket(socket: Socket): string | undefined {
  return (socket.data as SocketData).playerId;
}

export function setSocketPlayer(socket: Socket, playerId: string | undefined) {
  (socket.data as SocketData).playerId = playerId;
}

function socketsInRoom(io: Server, roomId: string): Socket[] {
  const ids = io.sockets.adapter.rooms.get(roomId);
  if (!ids) return [];
  const sockets: Socket[] = [];
  for (const id of ids) {
    const socket = io.sockets.sockets.get(id);
    if (socket) sockets.push(socket);
  }
  return sockets;
}

/** 這個連線看到的房間：只有它自己代表的玩家的私人資料 */
export function roomViewFor(socket: Socket, room: Room): RoomView {
  const playerId = playerIdOfSocket(socket);
  const isMember = !!playerId && room.players.some(p => p.id === playerId);
  return serializeRoomForPlayer(room, isMember ? playerId : undefined);
}

/** 對房間裡每個連線各送一份自己的 view */
function emitViews<T>(
  io: Server,
  room: Room,
  event: SocketEvent,
  wrap: (view: RoomView) => T,
) {
  for (const socket of socketsInRoom(io, room.roomId)) {
    socket.emit(event, wrap(roomViewFor(socket, room)));
  }
}

export type RoomUpdateExtra = { event: SocketEvent; data: unknown };

export type RoomUpdatePayload = { room: RoomView; extra?: RoomUpdateExtra };

export function emitRoomUpdate(
  io: Server,
  room: Room,
  extra?: RoomUpdateExtra,
) {
  emitViews<RoomUpdatePayload>(io, room, SocketEvent.RoomUpdate, view =>
    extra ? { room: view, extra } : { room: view },
  );
}

/** 有人加入：整間房都收到（各自的 view） */
export function emitJoinRoomSuccess(io: Server, room: Room) {
  emitViews<RoomView>(io, room, SocketEvent.JoinRoomSuccess, view => view);
}

/** 只回給這個連線（例如快速開始連點兩次） */
export function emitJoinRoomSuccessTo(socket: Socket, room: Room) {
  socket.emit(SocketEvent.JoinRoomSuccess, roomViewFor(socket, room));
}

export type PlayerReconnectSuccessPayload = {
  room: RoomView;
  playerId: string;
};

export function emitPlayerReconnectSuccess(socket: Socket, room: Room) {
  const view = roomViewFor(socket, room);
  if (!view.self) return;
  socket.emit(SocketEvent.PlayerReconnectSuccess, {
    room: view,
    playerId: view.self.playerId,
  } satisfies PlayerReconnectSuccessPayload);
}

/** 傳統對戰結束：排名只有公開的玩家資料 */
export function emitGameOver(
  io: Server,
  room: Room,
  winner: { name: string; score: number },
  isPenaltyGameOver?: boolean,
) {
  io.to(room.roomId).emit(SocketEvent.GameOver, {
    name: winner.name,
    score: winner.score,
    players: serializeRanking(room.players),
    ...(isPenaltyGameOver ? { isPenaltyGameOver } : {}),
  } satisfies GameOverPayload);
}

/** 搶答結束：勝利者只送 id、名稱、分數 */
export function emitBuzzerGameOver(
  io: Server,
  room: Room,
  winner: { id: string; name: string; score: number },
) {
  io.to(room.roomId).emit(SocketEvent.BuzzerGameOver, {
    winner: { id: winner.id, name: winner.name, score: winner.score },
    players: serializeRanking(room.players),
  } satisfies BuzzerGameOverPayload);
}

/** 大廳房間列表 */
export function emitRoomList(socket: Socket, rooms: Room[]) {
  socket.emit(
    SocketEvent.GetRoomsResponse,
    rooms.map(serializeLobbyRoom) satisfies LobbyRoomSummary[],
  );
}
