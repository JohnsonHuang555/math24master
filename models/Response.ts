import { ErrorCode } from './ErrorCode';
import { Room } from './Room';

export type GameResponse =
  { success: true; room: Room } | { success: false; error: ErrorCode };
