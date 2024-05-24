import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import express from 'express';
import { createServer } from 'http';
import next from 'next';

import Playing from './playing/index';

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const newExpress = express();

  newExpress.all('*', (req: any, res: any) => {
    return handle(req, res);
  });

  const gameServer = new Server({
    transport: new WebSocketTransport({
      server: createServer(newExpress), // provide the custom server for `WebSocketTransport`
    }),
  });
  gameServer.define('playing', Playing);

  newExpress.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
