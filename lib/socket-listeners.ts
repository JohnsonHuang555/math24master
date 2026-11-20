import type { Socket } from 'socket.io-client';

// socket.io-client 的事件 payload 本來就沒有型別（與 socket.on 相同），handler 參數交給呼叫端標註
type Handler = (...args: any[]) => void;

/**
 * 在 useEffect 裡登記 socket 事件用：記下每個 (事件, handler)，cleanup 時只移除自己登記的那些。
 * 不能用 socket.off(event) 不帶 handler：那會連其他元件（例如 MultiplePlayProvider）登記的同名事件一起移除。
 * socket 是模組層級的單例，元件每次掛載都會再登記一次，不清掉就會重複觸發（重複 toast、重複送出重連）
 */
export function createSocketListeners(socket: Socket) {
  const registered: [string, Handler][] = [];
  return {
    on(event: string, handler: Handler) {
      socket.on(event, handler);
      registered.push([event, handler]);
    },
    off() {
      for (const [event, handler] of registered) socket.off(event, handler);
      registered.length = 0;
    },
  };
}
