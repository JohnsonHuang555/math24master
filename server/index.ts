import express from 'express';
import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const app = express();
  const server = createServer(app);
  const io = new Server(server);

  app.all('*', (req, res) => {
    return handle(req, res);
  });

  io.on('connection', socket => {
    socket.emit('hello', 'world');
  });

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
