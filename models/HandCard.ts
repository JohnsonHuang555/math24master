import { Schema, type } from "@colyseus/schema";

export class HandCard extends Schema {
  @type("string") value?: number;
}
