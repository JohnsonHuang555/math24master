import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type GuestStore = {
  guestId: string | null;
  guestName: string | null;
  /**
   * 只存在這台裝置的密鑰，上排行榜時連同 guestId 一起送出。
   * guestId 會公開在排行榜上，server 用這把密鑰確認送成績的是本人（見 docs/adr/0012）
   */
  guestKey: string | null;
  /** 密鑰是否已經向 server 登記過；登記後別人就無法用這個 guestId 上榜 */
  guestKeyRegistered: boolean;
  setGuest: (name: string) => void;
  /** 原本的 guestId 已被別人登記走時，保留暱稱、換一組新的 guestId 與密鑰 */
  renewGuestId: () => void;
  markGuestKeyRegistered: () => void;
  clearGuest: () => void;
};

function newIdentity() {
  return {
    guestId: `guest_${uuidv4()}`,
    guestKey: uuidv4(),
    guestKeyRegistered: false,
  };
}

export const useGuestStore = create<GuestStore>()(
  persist(
    set => ({
      guestId: null,
      guestName: null,
      guestKey: null,
      guestKeyRegistered: false,
      setGuest: (name: string) =>
        set({ ...newIdentity(), guestName: name.trim() }),
      renewGuestId: () => set(newIdentity()),
      markGuestKeyRegistered: () => set({ guestKeyRegistered: true }),
      clearGuest: () =>
        set({
          guestId: null,
          guestName: null,
          guestKey: null,
          guestKeyRegistered: false,
        }),
    }),
    {
      name: 'guest-identity',
      version: 1,
      // v0 沒有密鑰：舊訪客補一把新的，再由 GuestKeyRegistrar 向 server 登記
      migrate: persisted => {
        const state = persisted as Partial<GuestStore>;
        return {
          ...state,
          guestKey: state.guestId ? (state.guestKey ?? uuidv4()) : null,
          guestKeyRegistered: false,
        } as GuestStore;
      },
    },
  ),
);
