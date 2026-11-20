// @vitest-environment node
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { GameStatus } from '@/models/GameStatus';
import { Player } from '@/models/Player';
import { DeckType, Difficulty, Room } from '@/models/Room';
import {
  LobbyRoomSummary,
  PrivatePlayerState,
  PublicPlayerState,
  PublicRoomState,
  RoomView,
} from '@/models/RoomView';
import { SocketEvent } from '@/models/SocketEvent';
import { emitJoinRoomSuccess, emitRoomUpdate } from './room-emitter';
import {
  serializeLobbyRoom,
  serializePublicRoom,
  serializeRoomForPlayer,
} from './room-view';

/**
 * 防止之後有人又把完整的 Room 送出去：
 * 1. 型別：內部 Room / Player 不能當成送出用的型別，送出用的型別也沒有敏感欄位
 * 2. 原始碼：帶房間資料的事件只能從 server/room-emitter.ts 送出
 * 3. 序列化：用 allowlist 挑欄位，Room 加了新欄位也不會被帶出去
 */

describe('編譯期約束', () => {
  it('內部 Room、Player 不能被當成送出用的資料', () => {
    expectTypeOf<Room>().not.toMatchTypeOf<PublicRoomState>();
    expectTypeOf<Room>().not.toMatchTypeOf<RoomView>();
    expectTypeOf<Room>().not.toMatchTypeOf<LobbyRoomSummary>();
    expectTypeOf<Player>().not.toMatchTypeOf<PublicPlayerState>();
    // 送出房間的函式只收內部 Room（在函式裡序列化），不接受別人先組好的物件
    expectTypeOf(emitRoomUpdate).parameter(1).toEqualTypeOf<Room>();
    expectTypeOf(emitJoinRoomSuccess).parameter(1).toEqualTypeOf<Room>();
  });

  it('送出用的型別沒有手牌、牌庫、密碼、token 等欄位', () => {
    type Forbidden =
      'deck' | 'password' | 'pendingPlay' | 'selectedCards' | 'countdownTime';
    expectTypeOf<Extract<keyof PublicRoomState, Forbidden>>().toBeNever();
    expectTypeOf<
      Extract<
        keyof PublicPlayerState,
        'handCard' | 'reconnectToken' | 'disconnectedAt'
      >
    >().toBeNever();
    expectTypeOf<
      Extract<keyof PrivatePlayerState, 'reconnectToken' | 'deck'>
    >().toBeNever();
    expectTypeOf<Extract<keyof Player, 'reconnectToken'>>().toBeNever();
  });
});

describe('帶房間資料的事件只能由 room-emitter 送出', () => {
  const ROOM_EVENTS = [
    'RoomUpdate',
    'JoinRoomSuccess',
    'PlayerReconnectSuccess',
    'GameOver',
    'BuzzerGameOver',
    'GetRoomsResponse',
  ] satisfies (keyof typeof SocketEvent)[];

  it('server/ 其他檔案沒有直接 emit 這些事件', () => {
    const dir = __dirname;
    const offenders: string[] = [];
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.ts') || file.includes('.test.')) continue;
      if (file === 'room-emitter.ts') continue;
      const source = readFileSync(join(dir, file), 'utf8');
      for (const event of ROOM_EVENTS) {
        const re = new RegExp(`emit\\(\\s*SocketEvent\\.${event}\\b`);
        if (re.test(source)) offenders.push(`${file}: ${event}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('序列化是 allowlist', () => {
  const room = {
    roomId: 'r',
    roomName: 'R',
    password: 'secret',
    maxPlayers: 2,
    currentOrder: 1,
    deck: [{ id: 'deck-1', value: 5 }],
    players: [
      {
        id: 'a',
        name: 'A',
        handCard: [{ id: 'hand-a', value: 1 }],
        score: 0,
        playerOrder: 1,
        isMaster: true,
        isLastRoundPlayer: false,
        isReady: true,
        disconnectedAt: 123,
        // 假設之後 Player 多了不該公開的欄位
        futureSecret: 'x',
      },
      {
        id: 'b',
        name: 'B',
        handCard: [{ id: 'hand-b', value: 2 }],
        score: 0,
        playerOrder: 2,
        isMaster: false,
        isLastRoundPlayer: false,
        isReady: true,
      },
    ],
    isGameOver: false,
    selectedCards: [{ number: { id: 'hand-a', value: 1 } }],
    status: GameStatus.Playing,
    settings: {
      deckType: DeckType.Standard,
      remainSeconds: 60,
      difficulty: Difficulty.Normal,
      gameType: 'classic',
    },
    countdownTime: 30,
    pendingPlay: undefined,
    futureRoomSecret: 'y',
  } as Room;
  const snapshot = JSON.stringify(room);

  it('Room 或 Player 多出來的欄位不會被帶出去，原本的 Room 也不會被改到', () => {
    const json = JSON.stringify([
      serializePublicRoom(room),
      serializeRoomForPlayer(room, 'b'),
      serializeLobbyRoom(room),
    ]);
    for (const secret of [
      'secret',
      'deck-1',
      'hand-a',
      'futureSecret',
      'futureRoomSecret',
      'disconnectedAt',
      'countdownTime',
    ]) {
      expect(json).not.toContain(secret);
    }
    expect(JSON.stringify(room)).toBe(snapshot);
  });

  it('私人資料：只有本人的手牌；輪到自己才有選牌；房主才有密碼；不在房內就沒有', () => {
    const a = serializeRoomForPlayer(room, 'a').self!;
    const b = serializeRoomForPlayer(room, 'b').self!;
    expect(a.handCard.map(c => c.id)).toEqual(['hand-a']);
    expect(a.selectedCards).toHaveLength(1);
    expect(a.roomPassword).toBe('secret');
    expect(b.handCard.map(c => c.id)).toEqual(['hand-b']);
    expect(b.selectedCards).toEqual([]);
    expect(b.roomPassword).toBeUndefined();
    expect(serializeRoomForPlayer(room, 'stranger').self).toBeNull();
    expect(serializeRoomForPlayer(room, undefined).self).toBeNull();
  });

  it('出牌經伺服器判定正確後，這一手才公開', () => {
    expect(serializePublicRoom(room).playedCards).toEqual([]);
    const scoring = {
      ...room,
      pendingPlay: { playerId: 'a', score: 1, drawCount: 1 },
    } as Room;
    expect(serializePublicRoom(scoring).playedCards).toHaveLength(1);
  });
});
