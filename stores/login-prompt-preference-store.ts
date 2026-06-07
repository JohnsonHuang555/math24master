import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type LoginPromptPreferenceStore = {
  skipLoginPrompt: boolean;
  setSkipLoginPrompt: (v: boolean) => void;
};

export const useLoginPromptPreferenceStore = create<LoginPromptPreferenceStore>()(
  persist(
    set => ({
      skipLoginPrompt: false,
      setSkipLoginPrompt: (v: boolean) => set({ skipLoginPrompt: v }),
    }),
    { name: 'login-prompt-preference' },
  ),
);
