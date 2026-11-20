import { io } from 'socket.io-client';
import { describe, expect, it, vi } from 'vitest';
import { createSocketListeners } from '../socket-listeners';

describe('createSocketListeners', () => {
  it('cleanup 只移除自己登記的 handler，其他元件登記的同名事件保留', () => {
    const socket = io('http://localhost:1', { autoConnect: false });
    const providerHandler = vi.fn();
    socket.on('buzzer-game-over', providerHandler);

    const listeners = createSocketListeners(socket);
    const mine = vi.fn();
    listeners.on('buzzer-game-over', mine);
    listeners.on('buzzer-open', mine);
    expect(socket.listeners('buzzer-game-over')).toHaveLength(2);

    listeners.off();
    expect(socket.listeners('buzzer-game-over')).toEqual([providerHandler]);
    expect(socket.listeners('buzzer-open')).toHaveLength(0);
  });

  it('重複掛載再 cleanup 不會累積 handler', () => {
    const socket = io('http://localhost:1', { autoConnect: false });
    for (let i = 0; i < 3; i++) {
      const listeners = createSocketListeners(socket);
      listeners.on('room-update', () => {});
      listeners.off();
    }
    expect(socket.listeners('room-update')).toHaveLength(0);
  });
});
