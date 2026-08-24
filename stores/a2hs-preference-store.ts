import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 「加到主畫面」提示的使用者偏好（是否永久跳過） */
type A2hsPreferenceStore = {
  skipInstallPrompt: boolean;
  setSkipInstallPrompt: (v: boolean) => void;
};

export const useA2hsPreferenceStore = create<A2hsPreferenceStore>()(
  persist(
    set => ({
      skipInstallPrompt: false,
      setSkipInstallPrompt: (v: boolean) => set({ skipInstallPrompt: v }),
    }),
    { name: 'a2hs-preference' },
  ),
);
