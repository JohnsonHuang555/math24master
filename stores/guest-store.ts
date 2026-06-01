import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type GuestStore = {
  guestId: string | null;
  guestName: string | null;
  setGuest: (name: string) => void;
  clearGuest: () => void;
};

export const useGuestStore = create<GuestStore>()(
  persist(
    set => ({
      guestId: null,
      guestName: null,
      setGuest: (name: string) =>
        set({ guestId: `guest_${uuidv4()}`, guestName: name.trim() }),
      clearGuest: () => set({ guestId: null, guestName: null }),
    }),
    { name: 'guest-identity' },
  ),
);
