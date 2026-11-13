import { describe, expect, it } from 'vitest';
import { useGuestStore } from './guest-store';

describe('訪客身分', () => {
  const migrate = useGuestStore.persist.getOptions().migrate!;

  it('舊版（沒有密鑰）的訪客升級時補一把密鑰，等待重新登記', () => {
    const state = migrate(
      { guestId: 'guest_abc', guestName: '小明' },
      0,
    ) as ReturnType<typeof useGuestStore.getState>;

    expect(state.guestId).toBe('guest_abc');
    expect(state.guestName).toBe('小明');
    expect(state.guestKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(state.guestKeyRegistered).toBe(false);
  });

  it('沒有訪客身分的話不產生密鑰', () => {
    const state = migrate({ guestId: null, guestName: null }, 0) as ReturnType<
      typeof useGuestStore.getState
    >;
    expect(state.guestKey).toBeNull();
  });

  it('身分被別人登記走時，保留暱稱、換新的 guestId 與密鑰', () => {
    useGuestStore.getState().setGuest('小明');
    const before = useGuestStore.getState();
    useGuestStore.getState().markGuestKeyRegistered();

    useGuestStore.getState().renewGuestId();
    const after = useGuestStore.getState();

    expect(after.guestName).toBe('小明');
    expect(after.guestId).not.toBe(before.guestId);
    expect(after.guestKey).not.toBe(before.guestKey);
    expect(after.guestKeyRegistered).toBe(false);
  });
});
