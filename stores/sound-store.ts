import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SoundStore = {
  soundEnabled: boolean;
  toggleSound: () => void;
};

export const useSoundStore = create<SoundStore>()(
  persist(
    set => ({
      soundEnabled: true,
      toggleSound: () => set(state => ({ soundEnabled: !state.soundEnabled })),
    }),
    {
      name: 'sound-settings',
    },
  ),
);
