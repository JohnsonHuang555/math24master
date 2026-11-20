import { useEffect, useRef } from 'react';

/**
 * 真的離開房間頁（元件卸載、或換到另一間房）時呼叫 leave(roomId)。
 *
 * 不在 effect cleanup 裡直接離開：Strict Mode 會「卸載再立刻掛上」，其他依賴變動也會先跑 cleanup，
 * 那些時候玩家還在頁面上，直接離開會把他移出房間、遊戲中還回不來。
 * 這裡 cleanup 只先排一個延後的離開；同一間房馬上又掛上就取消，換到別間房則立即離開前一間。
 *
 * 重新整理、關閉分頁不會跑 React cleanup，交給伺服器的斷線寬限期，token 也保留著可以重連。
 */
export function useLeaveRoomOnUnmount(
  roomId: string | undefined,
  leave: (roomId: string) => void,
) {
  const leaveRef = useRef(leave);
  useEffect(() => {
    leaveRef.current = leave;
  }, [leave]);

  const pendingRef = useRef<{
    roomId: string;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  useEffect(() => {
    if (!roomId) return;
    const pending = pendingRef.current;
    if (pending) {
      clearTimeout(pending.timer);
      pendingRef.current = null;
      if (pending.roomId !== roomId) leaveRef.current(pending.roomId);
    }
    return () => {
      const timer = setTimeout(() => {
        pendingRef.current = null;
        leaveRef.current(roomId);
      }, 0);
      pendingRef.current = { roomId, timer };
    };
  }, [roomId]);
}
