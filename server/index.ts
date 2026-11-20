import { createServer } from 'http';
import { Server } from 'socket.io';
import { attachGameServer } from './socket-server';

// 獨立的 Socket.IO 服務（前端 Next.js 部署於 Vercel，另行連線至此）
const port = parseInt(process.env.PORT || '3001', 10);
// 允許連線的前端來源，逗號分隔，例如 https://math24master.com,https://www.math24master.com
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const startServer = () => {
  // 非 Socket.IO 的請求只回應健康檢查
  const httpServer = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
  });
  const io = new Server(httpServer, {
    pingInterval: 25000,
    pingTimeout: 60000,
    cors: {
      origin: allowedOrigins,
    },
  });

  // 遊戲事件與計時器都在 socket-server.ts（可在測試中以較短的等待時間啟動）
  attachGameServer(io);

  httpServer
    .once('error', err => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Socket server ready on port ${port}`);
      console.log(`> Allowed origins: ${allowedOrigins.join(', ')}`);
    });
};

startServer();
