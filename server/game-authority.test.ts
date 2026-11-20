// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { ErrorCode } from '@/models/ErrorCode';
import { GameMode } from '@/models/GameMode';
import { GameStatus } from '@/models/GameStatus';
import { NumberCard } from '@/models/Player';
import { Symbol } from '@/models/Symbol';
import * as game from './game';

const HOST = 'host';
const GUEST = 'guest';
const OUTSIDER = 'outsider';

function createRoom(maxPlayers = 2, roomId = 'r') {
  const host = game.joinRoom(
    { roomId, maxPlayers, roomName: `room-${roomId}` },
    HOST,
    'Host',
    GameMode.Multiple,
  );
  const guest = game.joinRoom(
    { roomId, maxPlayers },
    GUEST,
    'Guest',
    GameMode.Multiple,
  );
  if (!host.success || !guest.success) throw new Error('setup failed');
  return { hostToken: host.reconnectToken, guestToken: guest.reconnectToken };
}

/** 開局並把目前玩家的手牌換成已知的 6 6 6 6（6+6+6+6=24，得 3 分） */
function startWithKnownHand() {
  createRoom();
  game.readyGame('r', GUEST);
  expect(game.canStartGame('r', HOST).ok).toBe(true);
  game.startGame('r');
  const room = game.getCurrentRoom('r')!;
  const current = room.players.find(p => p.playerOrder === room.currentOrder)!;
  const other = room.players.find(p => p.id !== current.id)!;
  const hand: NumberCard[] = [0, 1, 2, 3].map(i => ({ id: `c${i}`, value: 6 }));
  current.handCard = hand;
  return { room, current, other, hand };
}

function enter(playerId: string, hand: NumberCard[]) {
  hand.forEach((card, i) => {
    if (i > 0) game.selectCard('r', playerId, undefined, Symbol.Plus);
    game.selectCard('r', playerId, { id: card.id }, undefined);
  });
}

const scoreOf = (playerId: string) =>
  game.getCurrentRoom('r')!.players.find(p => p.id === playerId)!.score;

beforeEach(() => {
  game.resetGameStateForTests();
});

describe('房主權限', () => {
  it('非房主、不在房間的人都不能改房名、改設定、踢人、加電腦、開始遊戲', () => {
    createRoom(3);
    for (const actor of [GUEST, OUTSIDER]) {
      const expected =
        actor === GUEST ? ErrorCode.NotRoomMaster : ErrorCode.PlayerNotFound;
      expect(game.editRoom('r', actor, 'hacked', '')).toEqual({
        success: false,
        error: expected,
      });
      expect(
        game.editRoomSettings('r', actor, { maxPlayers: 4 }),
      ).toMatchObject({ success: false, error: expected });
      expect(game.removePlayer('r', actor, HOST)).toMatchObject({
        success: false,
        error: expected,
      });
      expect(game.addBotToRoom('r', actor, 'easy')).toMatchObject({
        success: false,
        error: expected,
      });
      expect(game.canStartGame('r', actor)).toMatchObject({
        ok: false,
        error: expected,
      });
    }
    const room = game.getCurrentRoom('r')!;
    expect(room.roomName).toBe('room-r');
    expect(room.maxPlayers).toBe(3);
    expect(room.players.map(p => p.id)).toEqual([HOST, GUEST]);
  });

  it('房主可以操作，但遊戲進行中不能改設定或踢人', () => {
    createRoom(3);
    expect(game.editRoom('r', HOST, 'new name', 'pw').success).toBe(true);
    expect(game.addBotToRoom('r', HOST, 'easy').success).toBe(true);
    game.readyGame('r', GUEST);
    game.startGame('r');
    expect(game.editRoomSettings('r', HOST, { maxPlayers: 4 })).toMatchObject({
      success: false,
      error: ErrorCode.GameInProgress,
    });
    expect(game.removePlayer('r', HOST, GUEST)).toMatchObject({
      success: false,
      error: ErrorCode.GameInProgress,
    });
  });

  it('removePlayer 找不到目標時不會刪掉任何人（原本會 splice(-1, 1) 刪掉最後一位）', () => {
    createRoom();
    expect(game.removePlayer('r', HOST, 'nobody')).toMatchObject({
      success: false,
      error: ErrorCode.PlayerNotFound,
    });
    expect(game.removePlayer('r', HOST, HOST).success).toBe(false);
    expect(game.getCurrentRoom('r')!.players.map(p => p.id)).toEqual([
      HOST,
      GUEST,
    ]);
  });

  it('被踢的玩家 token 失效，不能用重連回到房間', () => {
    const { guestToken } = createRoom();
    expect(game.removePlayer('r', HOST, GUEST).success).toBe(true);
    expect(game.reconnectPlayer(guestToken)).toMatchObject({ success: false });
    expect(game.getCurrentRoomId(GUEST)).toBeUndefined();
  });

  it('設定值要合法：人數不能少於目前人數或超過 4，秒數要是正整數或不限時', () => {
    createRoom(3);
    for (const bad of [
      { maxPlayers: 1 },
      { maxPlayers: 9 },
      { remainSeconds: -1 },
      { remainSeconds: 1.5 },
    ]) {
      expect(game.editRoomSettings('r', HOST, bad)).toMatchObject({
        success: false,
        error: ErrorCode.InvalidRoomSettings,
      });
    }
    expect(
      game.editRoomSettings('r', HOST, { maxPlayers: 4, remainSeconds: null })
        .success,
    ).toBe(true);
  });
});

describe('加入與資訊外洩', () => {
  it('遊戲進行中不能中途加入；送 mode=single 也不能繞過人數上限', () => {
    createRoom();
    expect(game.checkCanJoinRoom('r', OUTSIDER, GameMode.Single)).toBe(false);
    game.readyGame('r', GUEST);
    game.startGame('r');
    expect(game.checkCanJoinRoom('r', OUTSIDER, GameMode.Multiple)).toBe(false);
    expect(
      game.joinRoom({ roomId: 'r', maxPlayers: 4 }, OUTSIDER, 'X', 0 as never),
    ).toMatchObject({ success: false });
  });

  it('reconnectToken 不會出現在廣播的房間資料或大廳列表裡，大廳也看不到密碼與手牌', () => {
    const { hostToken, guestToken } = createRoom();
    game.editRoom('r', HOST, 'secret room', 'pw1234');
    const room = game.getCurrentRoom('r')!;
    const json = JSON.stringify(room);
    expect(json).not.toContain(hostToken);
    expect(json).not.toContain(guestToken);

    const [listed] = game.getCurrentRooms();
    const listedJson = JSON.stringify(listed);
    expect(listedJson).not.toContain('pw1234');
    expect(listed.password).toBeTruthy(); // 大廳仍可顯示「有密碼」
    expect(listedJson).not.toContain(hostToken);
  });
});

describe('牌面操作只有目前玩家可以做', () => {
  it('非當前玩家、不在房間的人送出任何牌面操作都被拒絕，牌面不變', () => {
    const { other, hand } = startWithKnownHand();
    for (const actor of [other.id, OUTSIDER]) {
      const expected =
        actor === OUTSIDER ? ErrorCode.PlayerNotFound : ErrorCode.NotYourTurn;
      expect(
        game.selectCard('r', actor, { id: hand[0].id }, undefined),
      ).toMatchObject({ error: expected });
      expect(game.backCard('r', actor)).toMatchObject({ error: expected });
      expect(game.reselectCard('r', actor)).toMatchObject({ error: expected });
      expect(game.playCard('r', actor)).toMatchObject({ error: expected });
      expect(game.updateScore('r', actor)).toMatchObject({ error: expected });
      expect(game.drawCard('r', actor)).toMatchObject({ error: expected });
      expect(game.skipHand('r', actor)).toMatchObject({ error: expected });
    }
    expect(game.getCurrentRoom('r')!.selectedCards).toEqual([]);
  });

  it('只能選自己手牌裡的牌，數值以伺服器為準（偽造的數字無效）', () => {
    const { current, other, hand } = startWithKnownHand();
    expect(
      game.selectCard('r', current.id, { id: 'fake' }, undefined),
    ).toMatchObject({ error: ErrorCode.CardNotInHand });
    // 拿別人的牌也不行
    expect(
      game.selectCard('r', current.id, { id: other.handCard[0].id }, undefined),
    ).toMatchObject({ error: ErrorCode.CardNotInHand });
    // 前端帶的 value 被忽略
    game.selectCard(
      'r',
      current.id,
      { id: hand[0].id, value: 24 } as NumberCard,
      undefined,
    );
    expect(game.getCurrentRoom('r')!.selectedCards).toEqual([
      { number: hand[0] },
    ]);
    // 不合法的符號
    expect(
      game.selectCard('r', current.id, undefined, '**' as Symbol),
    ).toMatchObject({ error: ErrorCode.InvalidEquation });
  });

  it('棄牌只能在手牌超過上限時丟自己的牌', () => {
    const { current, other, hand } = startWithKnownHand();
    expect(game.discardCard('r', current.id, hand[0].id)).toMatchObject({
      success: false,
    });
    other.handCard.push({ id: 'extra', value: 1 });
    expect(game.discardCard('r', other.id, hand[0].id)).toMatchObject({
      error: ErrorCode.CardNotInHand,
    });
    expect(game.discardCard('r', other.id, 'extra').success).toBe(true);
    expect(other.handCard).toHaveLength(4);
  });
});

describe('計分由伺服器決定', () => {
  it('沒有答對就送 UpdateScore 拿不到分數', () => {
    const { current, hand } = startWithKnownHand();
    game.selectCard('r', current.id, { id: hand[0].id }, undefined);
    game.selectCard('r', current.id, undefined, Symbol.Divide);
    game.selectCard('r', current.id, { id: hand[1].id }, undefined);
    expect(game.updateScore('r', current.id)).toMatchObject({
      success: false,
    });
    expect(scoreOf(current.id)).toBe(0);
  });

  it('算錯（6+6+6-6）判定錯誤、不計分；用不完手牌也是錯', () => {
    const { current, hand } = startWithKnownHand();
    hand.forEach((card, i) => {
      if (i > 0)
        game.selectCard(
          'r',
          current.id,
          undefined,
          i === 3 ? Symbol.Minus : Symbol.Plus,
        );
      game.selectCard('r', current.id, { id: card.id }, undefined);
    });
    expect(game.playCard('r', current.id)).toMatchObject({ isCorrect: false });
    expect(game.updateScore('r', current.id).success).toBe(false);
    expect(scoreOf(current.id)).toBe(0);
  });

  it('答對後入帳一次；重複 UpdateScore、重複 PlayCard 都不會再加分', () => {
    const { current, other, hand } = startWithKnownHand();
    enter(current.id, hand);
    expect(game.playCard('r', current.id)).toMatchObject({ isCorrect: true });
    // 等入帳期間不能再出牌、改算式或抽牌
    expect(game.playCard('r', current.id).success).toBe(false);
    expect(game.drawCard('r', current.id).success).toBe(false);
    expect(game.getCurrentRoom('r')!.pendingPlay).toMatchObject({
      playerId: current.id,
      score: 3,
    });

    const first = game.updateScore('r', current.id);
    expect(first).toMatchObject({ success: true, scored: true });
    expect(scoreOf(current.id)).toBe(3);
    // 已經換人：重複送出被拒絕
    expect(game.updateScore('r', current.id).success).toBe(false);
    expect(scoreOf(current.id)).toBe(3);

    const room = game.getCurrentRoom('r')!;
    expect(room.currentOrder).toBe(other.playerOrder);
    // 用掉 4 張、補回 4 張
    expect(room.players.find(p => p.id === current.id)!.handCard).toHaveLength(
      4,
    );
  });

  it('右括號後接左括號會自動補乘號（隱式乘法不會被驗算接受，也不會漏算分數）', () => {
    const { current, hand } = startWithKnownHand();
    current.handCard = [
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
      { id: 'c', value: 3 },
      { id: 'd', value: 5 },
    ];
    const pick = (id: string) =>
      game.selectCard('r', current.id, { id }, undefined);
    const sym = (s: Symbol) => game.selectCard('r', current.id, undefined, s);
    sym(Symbol.LeftBracket);
    pick('a');
    sym(Symbol.Plus);
    pick('b');
    sym(Symbol.RightBracket);
    sym(Symbol.LeftBracket); // 自動補 ×
    pick('c');
    sym(Symbol.Plus);
    pick('d');
    sym(Symbol.RightBracket);
    expect(game.playCard('r', current.id)).toMatchObject({ isCorrect: true });
    // + + × = 1 + 1 + 2
    expect(game.getCurrentRoom('r')!.pendingPlay?.score).toBe(4);
    void hand;
  });
});

describe('回合時間到由伺服器推進', () => {
  it('沒有出牌：替目前玩家抽一張並換人', () => {
    const { current, other } = startWithKnownHand();
    const result = game.handleTurnTimeout('r');
    expect(result.success).toBe(true);
    const room = game.getCurrentRoom('r')!;
    expect(room.currentOrder).toBe(other.playerOrder);
    expect(room.players.find(p => p.id === current.id)!.handCard).toHaveLength(
      5,
    );
  });

  it('已答對但還沒送 UpdateScore（例如斷線）：時間到直接入帳換人，分數只算一次', () => {
    const { current, other, hand } = startWithKnownHand();
    enter(current.id, hand);
    game.playCard('r', current.id);
    expect(game.handleTurnTimeout('r')).toMatchObject({
      success: true,
      scored: true,
    });
    expect(scoreOf(current.id)).toBe(3);
    expect(game.getCurrentRoom('r')!.currentOrder).toBe(other.playerOrder);
    expect(game.updateScore('r', current.id).success).toBe(false);
    expect(scoreOf(current.id)).toBe(3);
  });

  it('等待中的房間不會被計時推進', () => {
    createRoom();
    expect(game.handleTurnTimeout('r').success).toBe(false);
  });
});

describe('離開與重連', () => {
  it('目前玩家離開：換下一位、沒入帳的得分作廢、token 失效', () => {
    createRoom(3);
    game.joinRoom(
      { roomId: 'r', maxPlayers: 3 },
      'third',
      'T',
      GameMode.Multiple,
    );
    game.readyGame('r', GUEST);
    game.readyGame('r', 'third');
    game.startGame('r');
    const room = game.getCurrentRoom('r')!;
    const current = room.players.find(
      p => p.playerOrder === room.currentOrder,
    )!;
    current.handCard = [0, 1, 2, 3].map(i => ({ id: `k${i}`, value: 6 }));
    enter(current.id, current.handCard);
    game.playCard('r', current.id);

    const result = game.leaveRoom(current.id);
    expect(result && 'room' in result && result.room.status).toBe(
      GameStatus.Playing,
    );
    const after = game.getCurrentRoom('r')!;
    expect(after.players.some(p => p.id === current.id)).toBe(false);
    expect(after.pendingPlay).toBeUndefined();
    expect(after.players.some(p => p.playerOrder === after.currentOrder)).toBe(
      true,
    );
  });

  it('重連後玩家 id 不變（回合順序、計時器、搶答狀態都不用改 id）', () => {
    const { guestToken } = createRoom();
    game.markPlayerDisconnected(GUEST);
    expect(
      game.getCurrentRoom('r')!.players.find(p => p.id === GUEST)!
        .isDisconnected,
    ).toBe(true);
    const result = game.reconnectPlayer(guestToken);
    expect(result).toMatchObject({ success: true, playerId: GUEST });
    expect(
      game.getCurrentRoom('r')!.players.find(p => p.id === GUEST)!
        .isDisconnected,
    ).toBe(false);
  });

  it('真人都離開後房間被刪除，回傳 roomDeleted 讓連線層清掉計時器', () => {
    createRoom();
    game.addBotToRoom('r', HOST, 'easy');
    game.leaveRoom(GUEST);
    expect(game.leaveRoom(HOST)).toEqual({ roomDeleted: true, roomId: 'r' });
    expect(game.getCurrentRoom('r')).toBeUndefined();
  });
});
