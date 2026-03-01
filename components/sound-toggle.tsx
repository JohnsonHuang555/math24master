'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useSound } from '@/hooks/useSound';
import { Button } from './ui/button';

const SoundToggle = () => {
  const { soundEnabled, toggleSound } = useSound();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="fixed bottom-4 right-4 z-50 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/30"
      onClick={toggleSound}
      title={soundEnabled ? '關閉音效' : '開啟音效'}
    >
      {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
    </Button>
  );
};

export default SoundToggle;
