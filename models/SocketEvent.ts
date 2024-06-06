export enum SocketEvent {
  // f2e emit
  ErrorMessage = 'error-message',
  JoinRoom = 'join-room',
  ReadyGame = 'ready-game',
  StartGame = 'start-game',
  RoomUpdate = 'room-update',

  // event
  SortCard = 'sort-card',
  PlayCard = 'play-card',
  DrawCard = 'draw-card',
  DiscardCard = 'discard-card',
  UpdateAndDraw = 'update-and-draw',

  // b2e emit
  JoinRoomSuccess = 'join-room-success',
  StartGameSuccess = 'start-game-success',
  PlayCardResponse = 'play-card-response',
}
