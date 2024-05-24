import { Client, Room } from '@colyseus/core';

export default class MyRoom extends Room {
  // (optional) Validate client auth token before joining/creating the room
  // When room is initialized
  onCreate(options: any) {}

  // When client successfully join the room
  onJoin(client: Client, options: any, auth: any) {}

  // When a client leaves the room
  onLeave(client: Client, consented: boolean) {}
}
