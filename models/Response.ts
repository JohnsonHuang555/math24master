import { Room } from './Room';

export type GameResponse =
  | { success: true; room: Room }
  | { success: false; error: string };
