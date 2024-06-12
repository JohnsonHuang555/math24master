export enum SocketEvent {
  // f2e emit
  ErrorMessage = 'error-message',
  JoinRoom = 'join-room',
  ReadyGame = 'ready-game',
  StartGame = 'start-game',
  RoomUpdate = 'room-update',
  GetRoomById = 'get-room-by-id',
  SearchRooms = 'search-rooms',

  // game event
  SortCard = 'sort-card',
  PlayCard = 'play-card',
  DrawCard = 'draw-card',
  DiscardCard = 'discard-card',
  UpdateScore = 'update-score',
  SelectCard = 'select-card',
  ReselectCard = 'reselect-card',

  // b2e emit
  JoinRoomSuccess = 'join-room-success',
  StartGameSuccess = 'start-game-success',
  PlayCardResponse = 'play-card-response',
  GetRoomsResponse = 'get-rooms-response',
  GetRoomByIdResponse = 'get-room-by-id-response',
}
