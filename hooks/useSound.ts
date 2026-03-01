'use client';

import { useSoundStore } from '@/stores/sound-store';

export function useSound() {
  const soundEnabled = useSoundStore(state => state.soundEnabled);
  const toggleSound = useSoundStore(state => state.toggleSound);
  return { soundEnabled, toggleSound };
}
