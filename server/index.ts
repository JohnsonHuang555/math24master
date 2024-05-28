import { monitor } from '@colyseus/monitor';
import { WebSocketTransport } from '@colyseus/ws-transport';
import pkg from 'colyseus';
import express from 'express';
import { createServer } from 'http';
import next from 'next';
import Playing from './playing/index';

const { Server } = pkg;

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const app = express();

  app.all('*', (req: any, res: any) => {
    return handle(req, res);
  });
  // newExpress.use('/colyseus', monitor());

  const gameServer = new Server({
    server: createServer(app),
    // transport: new WebSocketTransport({
    //   server: createServer(app), // provide the custom server for `WebSocketTransport`
    //   // pingInterval: 6000,
    //   // pingMaxRetries: 5,
    // }),
  });
  // gameServer.define('playing', Playing).enableRealtimeListing();

  app.listen(port);
  console.log(`Listening on port: ${port}`);
});
